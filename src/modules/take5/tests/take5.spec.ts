import { ExtractTake5Schema, Take5ExtractResultSchema } from '../take5.schema';
import { extractDocumentText, xmlToText } from '../take5.extract';
import { parseTake5Response } from '../take5.ai';
import { resolveTake5DocPath } from '../take5.files';
import { CURSOR_API_ORIGIN, runTake5CursorAgent } from '../take5.cursor';

describe('ExtractTake5Schema', () => {
  it('accepts filePath documents', () => {
    const parsed = ExtractTake5Schema.parse({
      documents: [{ filePath: 'IMSF 100 - Confined spaces checklist .docx' }],
    });
    expect(parsed.documents[0].filePath).toContain('IMSF 100');
  });

  it('accepts text documents', () => {
    const parsed = ExtractTake5Schema.parse({
      documents: [
        { fileName: 'checklist.txt', text: 'Has a permit been raised?' },
      ],
    });
    expect(parsed.documents).toHaveLength(1);
  });

  it('accepts base64 documents', () => {
    expect(
      ExtractTake5Schema.safeParse({
        documents: [
          {
            fileName: 'a.pdf',
            contentBase64: Buffer.from('x').toString('base64'),
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects a document with both or neither payload', () => {
    expect(
      ExtractTake5Schema.safeParse({
        documents: [{ fileName: 'a.txt' }],
      }).success,
    ).toBe(false);
    expect(
      ExtractTake5Schema.safeParse({
        documents: [
          {
            fileName: 'a.txt',
            text: 'hi',
            contentBase64: Buffer.from('x').toString('base64'),
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      ExtractTake5Schema.safeParse({
        documents: [
          {
            fileName: 'a.txt',
            filePath: 'Take5.md',
            text: 'hi',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects an empty list', () => {
    expect(ExtractTake5Schema.safeParse({ documents: [] }).success).toBe(false);
  });
});

describe('extractDocumentText', () => {
  it('reads a plain-text file', () => {
    const text = extractDocumentText(
      'talk.txt',
      Buffer.from('Has a permit been raised?\nHas the atmosphere been tested?'),
    );
    expect(text).toContain('Has a permit been raised?');
  });

  it('rejects empty text', () => {
    expect(() =>
      extractDocumentText('empty.txt', Buffer.from('   \n')),
    ).toThrow('EMPTY_DOCUMENT');
  });
});

describe('xmlToText', () => {
  it('strips Word markup into readable lines', () => {
    const xml =
      '<w:p>Has a Confined Space Permit been raised?</w:p><w:p>Has the atmosphere been verified?</w:p>';
    expect(xmlToText(xml)).toContain(
      'Has a Confined Space Permit been raised?',
    );
    expect(xmlToText(xml)).toContain('Has the atmosphere been verified?');
  });
});

describe('parseTake5Response', () => {
  it('accepts a JSON object and reindexes priority', () => {
    const result = parseTake5Response(
      JSON.stringify({
        checks: [
          { priority: 9, prompt: ' Is lighting adequate? ' },
          { priority: 1, prompt: 'Has the atmosphere been verified as safe?' },
        ],
      }),
    );
    expect(result.checks).toEqual([
      { priority: 1, prompt: 'Has the atmosphere been verified as safe?' },
      { priority: 2, prompt: 'Is lighting adequate?' },
    ]);
  });

  it('strips a markdown fence', () => {
    const result = parseTake5Response(
      '```json\n{"checks":[{"priority":1,"prompt":"Has a permit been raised?"}]}\n```',
    );
    expect(result.checks[0].prompt).toBe('Has a permit been raised?');
  });

  it('rejects non-JSON', () => {
    expect(() => parseTake5Response('sorry, no')).toThrow(
      'AI_INVALID_RESPONSE',
    );
  });

  it('pulls JSON out of surrounding agent prose', () => {
    const result = parseTake5Response(
      'Here is the list:\n{"checks":[{"priority":1,"prompt":"Has a permit been raised?"}]}\nDone.',
    );
    expect(result.checks[0].prompt).toBe('Has a permit been raised?');
  });
});

describe('Take5ExtractResultSchema', () => {
  it('rejects an empty prompt', () => {
    expect(
      Take5ExtractResultSchema.safeParse({
        checks: [{ priority: 1, prompt: '   ' }],
      }).success,
    ).toBe(false);
  });
});

describe('runTake5CursorAgent', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates a no-repo agent, polls until finished, then deletes', async () => {
    const fetchMock = jest.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : (input as URL).href;
        const method = init?.method ?? 'GET';
        if (url === `${CURSOR_API_ORIGIN}/v1/agents` && method === 'POST') {
          const body = JSON.parse(init?.body as string) as {
            repos?: unknown;
            env?: unknown;
            prompt: { text: string };
          };
          expect(body.repos).toBeUndefined();
          expect(body.env).toBeUndefined();
          expect(body.prompt.text).toContain('permit');
          expect(init?.headers).toEqual(
            expect.objectContaining({ Authorization: 'Bearer test-key' }),
          );
          return jsonRes({ agent: { id: 'bc-1' }, run: { id: 'run-1' } });
        }
        if (
          url === `${CURSOR_API_ORIGIN}/v1/agents/bc-1/runs/run-1` &&
          method === 'GET'
        ) {
          return jsonRes({
            status: 'FINISHED',
            result:
              '{"checks":[{"priority":1,"prompt":"Has a permit been raised?"}]}',
          });
        }
        if (
          url ===
            `${CURSOR_API_ORIGIN}/v1/agents/bc-1/usage?runId=run-1` &&
          method === 'GET'
        ) {
          return jsonRes({
            totalUsage: {
              inputTokens: 1200,
              outputTokens: 340,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              totalTokens: 1540,
            },
            runs: [
              {
                id: 'run-1',
                usage: {
                  inputTokens: 1200,
                  outputTokens: 340,
                  cacheReadTokens: 0,
                  cacheWriteTokens: 0,
                  totalTokens: 1540,
                },
              },
            ],
          });
        }
        if (
          url === `${CURSOR_API_ORIGIN}/v1/agents/bc-1` &&
          method === 'DELETE'
        ) {
          return jsonRes({ id: 'bc-1' });
        }
        throw new Error(`unexpected ${method} ${url}`);
      },
    );
    global.fetch = fetchMock as typeof fetch;

    const result = await runTake5CursorAgent({
      apiKey: 'test-key',
      prompt: 'Has a permit been raised?',
      pollMs: 1,
      waitMs: 5_000,
    });
    expect(result.text).toContain('Has a permit been raised?');
    expect(result.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 340,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 1540,
    });
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('resolveTake5DocPath', () => {
  it('resolves a file under docs/learn-take-rescue', () => {
    const abs = resolveTake5DocPath('Take5.md');
    expect(abs.replace(/\\/g, '/')).toMatch(
      /docs\/learn-take-rescue\/Take5\.md$/,
    );
  });

  it('accepts a path that already includes the folder', () => {
    const abs = resolveTake5DocPath('docs/learn-take-rescue/Take5.md');
    expect(abs.replace(/\\/g, '/')).toMatch(/Take5\.md$/);
  });

  it('rejects path traversal', () => {
    expect(() => resolveTake5DocPath('../.env')).toThrow('INVALID_PATH');
    expect(() => resolveTake5DocPath('docs/learn-take-rescue/../.env')).toThrow(
      'INVALID_PATH',
    );
  });

  it('rejects a missing file', () => {
    expect(() => resolveTake5DocPath('no-such-file.pdf')).toThrow(
      'MISSING_DOCUMENT',
    );
  });
});

function jsonRes(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}
