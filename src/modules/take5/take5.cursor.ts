/** Cursor Cloud Agents v1 — no-repo run used as a one-shot JSON extractor. */

export const CURSOR_API_ORIGIN = 'https://api.cursor.com';

// Create enqueues a cloud VM, so it can sit well past a normal API latency.
const CREATE_TIMEOUT_MS = 90_000;
const POLL_TIMEOUT_MS = 30_000;
const DELETE_TIMEOUT_MS = 15_000;
const USAGE_TIMEOUT_MS = 15_000;
const DEFAULT_POLL_MS = 2_000;
const DEFAULT_WAIT_MS = 180_000;
const USAGE_POLL_MS = 1_000;
const USAGE_POLL_ATTEMPTS = 5;

const TERMINAL_FAIL = new Set(['ERROR', 'CANCELLED', 'EXPIRED']);

/** Token counts from GET /v1/agents/:id/usage (matches Cursor team usage events). */
export interface CursorTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

export interface Take5CursorAgentResult {
  text: string;
  usage: CursorTokenUsage | null;
  agentId: string;
  runId: string;
}

export class CursorExtractError extends Error {
  constructor(
    readonly code:
      'AI_EXTRACT_FAILED' | 'AI_INVALID_RESPONSE' | 'CURSOR_UNAUTHORIZED',
    message: string,
  ) {
    super(message);
    this.name = 'CursorExtractError';
  }
}

export async function runTake5CursorAgent(opts: {
  apiKey: string;
  prompt: string;
  model?: string;
  pollMs?: number;
  waitMs?: number;
}): Promise<Take5CursorAgentResult> {
  const { agentId, runId } = await createAgent(
    opts.apiKey,
    opts.prompt,
    opts.model,
  );
  try {
    const text = await waitForResult(opts.apiKey, agentId, runId, {
      pollMs: opts.pollMs ?? DEFAULT_POLL_MS,
      waitMs: opts.waitMs ?? DEFAULT_WAIT_MS,
    });
    const usage = await getRunUsage(opts.apiKey, agentId, runId);
    return { text, usage, agentId, runId };
  } finally {
    await deleteAgent(opts.apiKey, agentId).catch(() => undefined);
  }
}

async function createAgent(
  apiKey: string,
  prompt: string,
  model?: string,
): Promise<{ agentId: string; runId: string }> {
  const body: Record<string, unknown> = {
    name: 'Take 5 extract',
    prompt: { text: prompt },
  };
  if (model) body.model = { id: model };

  const res = await cursorFetch(apiKey, '/v1/agents', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: CREATE_TIMEOUT_MS,
    phase: 'create',
  });

  let json: {
    agent?: { id?: string };
    run?: { id?: string };
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new CursorExtractError(
      'AI_INVALID_RESPONSE',
      'Cursor returned an empty create response.',
    );
  }
  const agentId = json.agent?.id;
  const runId = json.run?.id;
  if (!agentId || !runId) {
    throw new CursorExtractError(
      'AI_INVALID_RESPONSE',
      'Cursor did not return an agent run.',
    );
  }
  return { agentId, runId };
}

async function waitForResult(
  apiKey: string,
  agentId: string,
  runId: string,
  opts: { pollMs: number; waitMs: number },
): Promise<string> {
  const deadline = Date.now() + opts.waitMs;
  while (Date.now() < deadline) {
    const run = await getRun(apiKey, agentId, runId);
    if (run.status === 'FINISHED') {
      const text = run.result?.trim();
      if (!text) {
        throw new CursorExtractError(
          'AI_INVALID_RESPONSE',
          'Cursor finished without a Take 5 reply.',
        );
      }
      return text;
    }
    if (run.status && TERMINAL_FAIL.has(run.status)) {
      throw new CursorExtractError(
        'AI_EXTRACT_FAILED',
        'The Cursor agent did not complete the extract.',
      );
    }
    await delay(opts.pollMs);
  }
  throw new CursorExtractError(
    'AI_EXTRACT_FAILED',
    'Timed out waiting for the Cursor agent.',
  );
}

async function getRun(
  apiKey: string,
  agentId: string,
  runId: string,
): Promise<{ status?: string; result?: string }> {
  const res = await cursorFetch(
    apiKey,
    `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
    { method: 'GET', timeoutMs: POLL_TIMEOUT_MS, phase: 'poll' },
  );
  try {
    return (await res.json()) as { status?: string; result?: string };
  } catch {
    throw new CursorExtractError(
      'AI_INVALID_RESPONSE',
      'Cursor returned an empty run status.',
    );
  }
}

async function getRunUsage(
  apiKey: string,
  agentId: string,
  runId: string,
): Promise<CursorTokenUsage | null> {
  const path =
    `/v1/agents/${encodeURIComponent(agentId)}/usage` +
    `?runId=${encodeURIComponent(runId)}`;

  for (let attempt = 0; attempt < USAGE_POLL_ATTEMPTS; attempt += 1) {
    try {
      const res = await cursorFetch(apiKey, path, {
        method: 'GET',
        timeoutMs: USAGE_TIMEOUT_MS,
        allowStatuses: [404],
        phase: 'poll',
      });
      if (res.status === 404) return null;

      const json = (await res.json()) as {
        totalUsage?: Partial<CursorTokenUsage>;
        runs?: Array<{ id?: string; usage?: Partial<CursorTokenUsage> }>;
      };
      const fromRun = json.runs?.find((row) => row.id === runId)?.usage;
      const usage = normalizeUsage(fromRun ?? json.runs?.[0]?.usage ?? json.totalUsage);
      if (!usage) return null;
      if (usage.totalTokens > 0 || attempt === USAGE_POLL_ATTEMPTS - 1) {
        return usage;
      }
    } catch {
      if (attempt === USAGE_POLL_ATTEMPTS - 1) return null;
    }
    await delay(USAGE_POLL_MS);
  }
  return null;
}

function normalizeUsage(
  raw?: Partial<CursorTokenUsage> | null,
): CursorTokenUsage | null {
  if (!raw) return null;
  const inputTokens = toCount(raw.inputTokens);
  const outputTokens = toCount(raw.outputTokens);
  const cacheReadTokens = toCount(raw.cacheReadTokens);
  const cacheWriteTokens = toCount(raw.cacheWriteTokens);
  const totalTokens =
    toCount(raw.totalTokens) ||
    inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
  };
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0;
}

async function deleteAgent(apiKey: string, agentId: string): Promise<void> {
  await cursorFetch(apiKey, `/v1/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
    timeoutMs: DELETE_TIMEOUT_MS,
    allowStatuses: [404],
    phase: 'delete',
  });
}

async function cursorFetch(
  apiKey: string,
  path: string,
  opts: {
    method: string;
    body?: string;
    timeoutMs: number;
    allowStatuses?: number[];
    phase: 'create' | 'poll' | 'delete';
  },
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${CURSOR_API_ORIGIN}${path}`, {
      method: opts.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    throw new CursorExtractError(
      'AI_EXTRACT_FAILED',
      name === 'TimeoutError' || name === 'AbortError'
        ? `Timed out calling Cursor (${opts.phase}, ${opts.timeoutMs} ms).`
        : `Could not reach Cursor (${opts.phase}).`,
    );
  }

  if (res.ok || opts.allowStatuses?.includes(res.status)) return res;
  if (res.status === 401 || res.status === 403) {
    throw new CursorExtractError(
      'CURSOR_UNAUTHORIZED',
      'CURSOR_API_KEY was rejected by Cursor.',
    );
  }
  throw new CursorExtractError(
    'AI_EXTRACT_FAILED',
    `Cursor rejected the extract request (${opts.phase} ${res.status}): ${await errorBody(res)}`,
  );
}

/** Cursor error payloads carry the real reason (e.g. no-repo agents disabled). */
async function errorBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return 'no body';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
