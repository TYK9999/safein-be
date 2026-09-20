import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppLoggerService } from '../../logging/app-logger.service';
import { buildCursorAgentPrompt, parseTake5Response } from './take5.ai';
import { CursorExtractError, runTake5CursorAgent, type CursorTokenUsage } from './take5.cursor';
import { extractDocumentText } from './take5.extract';
import { readTake5Doc } from './take5.files';
import type {
  ExtractDocument,
  ExtractTake5Dto,
  Take5ExtractResult,
} from './take5.schema';

@Injectable()
export class Take5Service {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(Take5Service.name);
  }

  async extract(dto: ExtractTake5Dto): Promise<Take5ExtractResult> {
    this.logger.debug(
      `Take5 extract start documentCount=${dto.documents.length}`,
      `Take5Service.extract`,
    );
    const docs = dto.documents.flatMap((d) => {
      try {
        const loaded = loadDocument(d);
        return loaded ? [loaded] : [];
      } catch (err) {
        if (err instanceof HttpException) throw err;
        const code = err instanceof Error ? err.message : '';
        const label = d.fileName ?? d.filePath ?? 'document';
        if (code === 'INVALID_PATH') {
          fail(
            HttpStatus.BAD_REQUEST,
            'INVALID_PATH',
            'filePath must be a file inside docs/learn-take-rescue.',
          );
        }
        if (code === 'MISSING_DOCUMENT') {
          fail(
            HttpStatus.BAD_REQUEST,
            'MISSING_DOCUMENT',
            `No file at ${label}.`,
          );
        }
        if (code === 'UNSUPPORTED_DOCUMENT') {
          fail(
            HttpStatus.BAD_REQUEST,
            'UNSUPPORTED_DOCUMENT',
            `Cannot read ${label}. Use PDF, Word, Excel, or plain text.`,
          );
        }
        if (code === 'EMPTY_DOCUMENT') {
          fail(
            HttpStatus.BAD_REQUEST,
            'EMPTY_DOCUMENT',
            `No readable text in ${label}.`,
          );
        }
        fail(
          HttpStatus.BAD_REQUEST,
          'INVALID_DOCUMENT',
          `Could not parse ${label}.`,
        );
      }
    });

    if (docs.length === 0) {
      fail(
        HttpStatus.BAD_REQUEST,
        'EMPTY_DOCUMENT',
        'No readable text in the given files.',
      );
    }

    this.logger.debug(
      `Take5 docs loaded documentCount=${docs.length} charCount=${docs.reduce((n, d) => n + d.text.length, 0)}`,
      `Take5Service.extract`,
    );

    const { text: raw, usage } = await this.complete(buildCursorAgentPrompt(docs));
    try {
      const result = parseTake5Response(raw);
      this.logger.info(
        `Take5 extract success documentCount=${docs.length}` +
          (usage
            ? ` cursorTokens=${usage.totalTokens} (in=${usage.inputTokens} out=${usage.outputTokens})`
            : ''),
        `Take5Service.extract`,
      );
      return usage ? { ...result, usage } : result;
    } catch {
      this.logger.error(
        `Take5 extract failure reason=AI_INVALID_RESPONSE`,
        `Take5Service.extract`,
      );
      fail(
        HttpStatus.BAD_GATEWAY,
        'AI_INVALID_RESPONSE',
        'The model did not return a usable Take 5 list.',
      );
    }
  }

  private async complete(
    prompt: string,
  ): Promise<{ text: string; usage: CursorTokenUsage | null }> {
    const apiKey = blankToUndef(this.config.get<string>('cursor.apiKey'));
    const model = blankToUndef(this.config.get<string>('cursor.model'));
    if (!apiKey) {
      fail(
        HttpStatus.SERVICE_UNAVAILABLE,
        'AI_NOT_CONFIGURED',
        'Set CURSOR_API_KEY to extract Take 5 checks.',
      );
    }

    try {
      const agent = await runTake5CursorAgent({ apiKey, prompt, model });
      if (agent.usage) {
        this.logger.debug(
          `Cursor usage agentId=${agent.agentId} runId=${agent.runId} ` +
            `total=${agent.usage.totalTokens} input=${agent.usage.inputTokens} ` +
            `output=${agent.usage.outputTokens} cacheRead=${agent.usage.cacheReadTokens} ` +
            `cacheWrite=${agent.usage.cacheWriteTokens}`,
          `Take5Service.complete`,
        );
      } else {
        this.logger.warn(
          `Cursor usage unavailable agentId=${agent.agentId} runId=${agent.runId}`,
          `Take5Service.complete`,
        );
      }
      return { text: agent.text, usage: agent.usage };
    } catch (err) {
      if (err instanceof CursorExtractError) {
        if (err.code === 'CURSOR_UNAUTHORIZED') {
          fail(HttpStatus.UNAUTHORIZED, err.code, err.message);
        }
        if (err.code === 'AI_INVALID_RESPONSE') {
          fail(HttpStatus.BAD_GATEWAY, err.code, err.message);
        }
        this.logger.error(
          `Take 5 Cursor extract failed (${err.code}): ${err.message}`,
          { err },
          `Take5Service.complete`,
        );
        fail(HttpStatus.BAD_GATEWAY, err.code, err.message);
      }
      const name = err instanceof Error ? err.name : '';
      this.logger.error(
        `Take 5 Cursor extract failed (${name || 'error'})`,
        { err },
        `Take5Service.complete`,
      );
      fail(
        HttpStatus.BAD_GATEWAY,
        'AI_EXTRACT_FAILED',
        'Could not reach Cursor.',
      );
    }
  }
}

function loadDocument(
  d: ExtractDocument,
): { fileName: string; text: string } | null {
  if (d.text) {
    return { fileName: d.fileName!, text: d.text };
  }
  if (d.contentBase64) {
    return {
      fileName: d.fileName!,
      text: extractDocumentText(d.fileName!, decodeBase64(d.contentBase64)),
    };
  }

  const { fileName, bytes } = readTake5Doc(d.filePath!);
  const name = d.fileName ?? fileName;
  try {
    return { fileName: name, text: extractDocumentText(name, bytes) };
  } catch (err) {
    if (err instanceof Error && err.message === 'EMPTY_DOCUMENT') {
      return null;
    }
    throw err;
  }
}

function decodeBase64(value: string): Buffer {
  try {
    const buf = Buffer.from(value, 'base64');
    if (buf.length === 0) {
      fail(
        HttpStatus.BAD_REQUEST,
        'INVALID_DOCUMENT',
        'contentBase64 was empty after decoding.',
      );
    }
    return buf;
  } catch {
    fail(
      HttpStatus.BAD_REQUEST,
      'INVALID_DOCUMENT',
      'contentBase64 is not valid base64.',
    );
  }
}

function blankToUndef(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

function fail(status: HttpStatus, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}
