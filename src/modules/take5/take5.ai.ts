import {
  Take5ExtractResultSchema,
  type Take5ExtractResult,
} from './take5.schema';

export const TAKE5_SYSTEM_PROMPT = `You extract Take 5 checks from workplace safety documents.

Take 5 checks are yes/no questions a worker ticks before starting a task. They are not lessons and not an emergency procedure.

Rules:
- Independent of any named site, plant, tank, road, or client. Do not invent radio channels, phone numbers, hatch names, or muster points.
- Prefer the document's own wording, shortened for a phone.
- Highest priority first: do not enter if avoidable; atmosphere; isolations; permit; rescue arrangements in place; specified risks; competence; remaining controls.
- Skip legislation lists, how-to-write-a-HIRA guidance, attendance registers, signatures, dates, and blank form chrome.
- Skip checks that only describe fixed plant of one asset (installed cameras, fixed detectors, measured hatch size as a named vessel).
- Return JSON only: {"checks":[{"priority":1,"prompt":"..."}]}
- priority is a dense 1-based order. prompt is one yes/no question.
- If there are no worker checks, return {"checks":[]}.`;

export function buildUserPrompt(
  docs: Array<{ fileName: string; text: string }>,
): string {
  return docs.map((d) => `### ${d.fileName}\n${d.text}`).join('\n\n');
}

/** Cloud Agents have no system role — fold instructions into one prompt. */
export function buildCursorAgentPrompt(
  docs: Array<{ fileName: string; text: string }>,
): string {
  return `${TAKE5_SYSTEM_PROMPT}

Do not use tools, do not write or edit files, and do not ask follow-up questions. Reply with the JSON object only.

Documents:
${buildUserPrompt(docs)}`;
}

export function parseTake5Response(raw: string): Take5ExtractResult {
  const json = extractJsonObject(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error('AI_INVALID_RESPONSE');
  }
  const result = Take5ExtractResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('AI_INVALID_RESPONSE');
  }
  const checks = [...result.data.checks].sort(
    (a, b) => a.priority - b.priority,
  );
  return {
    checks: checks.map((c, i) => ({
      priority: i + 1,
      prompt: c.prompt,
    })),
  };
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body;
}
