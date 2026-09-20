/** Cursor Cloud Agents v1 — one-shot extract with optional vision images. */

const CURSOR_API_ORIGIN = "https://api.cursor.com";
const CREATE_TIMEOUT_MS = 180_000;
const POLL_TIMEOUT_MS = 30_000;
const DELETE_TIMEOUT_MS = 15_000;
const DEFAULT_POLL_MS = 2_000;
const DEFAULT_WAIT_MS = 240_000;

const TERMINAL_FAIL = new Set(["ERROR", "CANCELLED", "EXPIRED"]);

export async function runCursorAgent(opts) {
  const { agentId, runId } = await createAgent(opts);
  try {
    const text = await waitForResult(opts.apiKey, agentId, runId, {
      pollMs: opts.pollMs ?? DEFAULT_POLL_MS,
      waitMs: opts.waitMs ?? DEFAULT_WAIT_MS,
    });
    const usage = await getRunUsage(opts.apiKey, agentId, runId).catch(() => null);
    return { text, usage, agentId, runId };
  } finally {
    await deleteAgent(opts.apiKey, agentId).catch(() => undefined);
  }
}

async function createAgent(opts) {
  const prompt = { text: opts.prompt };
  if (opts.images?.length) prompt.images = opts.images;

  const body = { name: "SafeIn5 extract", prompt };
  if (opts.model) body.model = { id: opts.model };

  const res = await cursorFetch(opts.apiKey, "/v1/agents", {
    method: "POST",
    body: JSON.stringify(body),
    timeoutMs: CREATE_TIMEOUT_MS,
    phase: "create",
  });

  const json = await res.json();
  const agentId = json.agent?.id;
  const runId = json.run?.id;
  if (!agentId || !runId) {
    throw new Error("Cursor did not return an agent run.");
  }
  return { agentId, runId };
}

async function waitForResult(apiKey, agentId, runId, opts) {
  const deadline = Date.now() + opts.waitMs;
  while (Date.now() < deadline) {
    const run = await getRun(apiKey, agentId, runId);
    if (run.status === "FINISHED") {
      const text = run.result?.trim();
      if (!text) throw new Error("Cursor finished without a reply.");
      return text;
    }
    if (run.status && TERMINAL_FAIL.has(run.status)) {
      throw new Error(`Cursor agent ended with status ${run.status}.`);
    }
    await delay(opts.pollMs);
  }
  throw new Error("Timed out waiting for the Cursor agent.");
}

async function getRun(apiKey, agentId, runId) {
  const res = await cursorFetch(
    apiKey,
    `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
    { method: "GET", timeoutMs: POLL_TIMEOUT_MS, phase: "poll" },
  );
  return res.json();
}

async function getRunUsage(apiKey, agentId, runId) {
  const path =
    `/v1/agents/${encodeURIComponent(agentId)}/usage` +
    `?runId=${encodeURIComponent(runId)}`;
  const res = await cursorFetch(apiKey, path, {
    method: "GET",
    timeoutMs: 15_000,
    allowStatuses: [404],
    phase: "poll",
  });
  if (res.status === 404) return null;
  const json = await res.json();
  const fromRun = json.runs?.find((row) => row.id === runId)?.usage;
  return fromRun ?? json.runs?.[0]?.usage ?? json.totalUsage ?? null;
}

async function deleteAgent(apiKey, agentId) {
  await cursorFetch(apiKey, `/v1/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
    timeoutMs: DELETE_TIMEOUT_MS,
    allowStatuses: [404],
    phase: "delete",
  });
}

async function cursorFetch(apiKey, path, opts) {
  let res;
  try {
    res = await fetch(`${CURSOR_API_ORIGIN}${path}`, {
      method: opts.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    throw new Error(
      name === "TimeoutError" || name === "AbortError"
        ? `Timed out calling Cursor (${opts.phase}).`
        : `Could not reach Cursor (${opts.phase}).`,
    );
  }

  if (res.ok || opts.allowStatuses?.includes(res.status)) return res;
  if (res.status === 401 || res.status === 403) {
    throw new Error("CURSOR_API_KEY was rejected.");
  }
  const detail = await res.text().catch(() => "");
  throw new Error(`Cursor ${opts.phase} failed (${res.status}): ${detail.slice(0, 300)}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJsonFromAgentText(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? body.slice(start, end + 1) : body;
  return JSON.parse(jsonText);
}
