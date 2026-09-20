import { checklist } from "../generate-sample-job-pack.mjs";

/** Manual verification ground truth (from client verification workbook + seed). */
export const JOB_PACK_GROUND_TRUTH = {
  "RAMS/HIRA Front Page 1 .jpeg": {
    client: "Tarmac",
    site: "Dolyhir",
    rams_reference: "HOTBINSRA01",
    ms_sop_number: "HOTBINSMS01",
    work_description: "Asphalt plant",
  },
  "Permit To Work/Permit to Work Front Page .jpeg": {
    client: "Tarmac",
    task_reference: "098001",
    rams_reference: "HOTBINSRA01",
    work_description: "Repairs",
    site: "Dolyhir",
  },
  "Rescue Plan/Rescue Plan Front Page.jpeg": {
    client: "Tarmac",
    task_reference: "098001",
    space: "HOT AGG BINS",
  },
  "Contractor Approval/Contractor Clearence to work main page.jpeg": {
    work_description: "HOT AGG BINS",
  },
};

export const BENCHMARK_FILES = [
  "RAMS/HIRA Front Page 1 .jpeg",
  "Permit To Work/Permit to Work Front Page .jpeg",
  "Confiend Space Check List/CS Check List Page 1.jpeg",
  "Rescue Plan/Rescue Plan Front Page.jpeg",
];

export const COMPARE_MODELS = [
  { id: "composer-2.5", label: "Composer 2.5" },
  { id: "gpt-5.2", label: "GPT 5.2" },
];

/** Planning rates (USD per 1M tokens) — adjust when Cursor publishes list pricing. */
export const TOKEN_RATES = {
  "composer-2.5": { input: 2.5, output: 10, cacheRead: 0.5 },
  "gpt-5.2": { input: 3.0, output: 12.0, cacheRead: 0.6 },
  "gpt-5-mini": { input: 0.15, output: 0.6, cacheRead: 0.03 },
  default: { input: 2.5, output: 10, cacheRead: 0.5 },
};

export const SEED_CHECKLIST_PROMPTS = checklist.map(([, prompt]) => prompt);

const CHECKLIST_PAGES = [
  "Confiend Space Check List/CS Check List Page 1.jpeg",
  "Confiend Space Check List/CS Check List Page 2 .jpeg",
  "Confiend Space Check List/CS Check List Page 3 .jpeg",
];

/** job_checklist sample files used for model comparison (MVP scope). */
export const CHECKLIST_FILES = [...CHECKLIST_PAGES];

/** Seed prompt index ranges per scanned page (56 prompts across pages 1–3). */
export const CHECKLIST_PAGE_SEED_RANGES = {
  "Confiend Space Check List/CS Check List Page 1.jpeg": [0, 14],
  "Confiend Space Check List/CS Check List Page 2 .jpeg": [14, 32],
  "Confiend Space Check List/CS Check List Page 3 .jpeg": [32, 56],
};

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fieldMatches(extracted, expected) {
  const a = normalizeText(extracted);
  const b = normalizeText(expected);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export function scoreJobPackFile(file, extracted) {
  const truth = JOB_PACK_GROUND_TRUTH[file];
  if (!truth) return null;
  const rows = [];
  for (const [field, expected] of Object.entries(truth)) {
    const actual = extracted?.[field] ?? extracted?.[`${field}`];
    const ok = fieldMatches(actual, expected);
    rows.push({ field, expected, actual: actual ?? "—", correct: ok });
  }
  const correct = rows.filter((r) => r.correct).length;
  return {
    scored: rows.length,
    correct,
    pct: rows.length ? Math.round((correct / rows.length) * 100) : 0,
    rows,
  };
}

export function mergeChecklistPrompts(files) {
  const merged = [];
  for (const row of files) {
    if (!CHECKLIST_PAGES.includes(row.file.replace(/\\/g, "/"))) continue;
    for (const p of row.extracted?.prompts ?? []) {
      merged.push(p.body_text);
    }
  }
  return merged;
}

export function scoreChecklistPrompts(extractedPrompts) {
  const matched = [];
  const missed = [];
  for (const seedPrompt of SEED_CHECKLIST_PROMPTS) {
    const hit = extractedPrompts.find((p) => promptsSimilar(p, seedPrompt));
    if (hit) matched.push({ seed: seedPrompt, extracted: hit });
    else missed.push(seedPrompt);
  }
  const extra = extractedPrompts.filter(
    (p) => !SEED_CHECKLIST_PROMPTS.some((s) => promptsSimilar(p, s)),
  );
  const pct = SEED_CHECKLIST_PROMPTS.length
    ? Math.round((matched.length / SEED_CHECKLIST_PROMPTS.length) * 100)
    : 0;
  return {
    seedCount: SEED_CHECKLIST_PROMPTS.length,
    extractedCount: extractedPrompts.length,
    matchedCount: matched.length,
    missedCount: missed.length,
    extraCount: extra.length,
    pct,
    missed: missed.slice(0, 5),
    extra: extra.slice(0, 5),
  };
}

export function scoreChecklistPageOne(extractedPrompts) {
  const pageOneSeed = SEED_CHECKLIST_PROMPTS.slice(0, 14);
  return scoreChecklistSlice(pageOneSeed, extractedPrompts);
}

export function scoreChecklistFile(file, extractedPrompts) {
  const norm = file.replace(/\\/g, "/");
  const range = CHECKLIST_PAGE_SEED_RANGES[norm];
  if (!range) {
    return scoreChecklistPrompts(extractedPrompts);
  }
  const seedSlice = SEED_CHECKLIST_PROMPTS.slice(range[0], range[1]);
  const scored = scoreChecklistSlice(seedSlice, extractedPrompts);
  return {
    seedCount: seedSlice.length,
    extractedCount: extractedPrompts.length,
    matchedCount: scored.matched,
    missedCount: seedSlice.length - scored.matched,
    extraCount: scored.extraCount,
    pct: scored.pct,
    missed: scored.missed,
    extra: scored.extra,
    matchedRows: scored.matchedRows,
  };
}

export function scoreChecklistSlice(seedSlice, extractedPrompts) {
  const matchedRows = [];
  const missed = [];
  for (const seedPrompt of seedSlice) {
    const hit = extractedPrompts.find((p) => promptsSimilar(p, seedPrompt));
    if (hit) matchedRows.push({ seed: seedPrompt, extracted: hit });
    else missed.push(seedPrompt);
  }
  const extra = extractedPrompts.filter(
    (p) => !seedSlice.some((s) => promptsSimilar(p, s)),
  );
  const pct = seedSlice.length
    ? Math.round((matchedRows.length / seedSlice.length) * 100)
    : 0;
  return {
    matched: matchedRows.length,
    total: seedSlice.length,
    pct,
    missed,
    extra,
    extraCount: extra.length,
    matchedRows,
  };
}

function promptsSimilar(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 20) return na.includes(nb) || nb.includes(na);
  return na.slice(0, 40) === nb.slice(0, 40) || na.includes(nb.slice(0, 30)) || nb.includes(na.slice(0, 30));
}

export function estimateUsageCostUsd(usage, modelId = "default") {
  if (!usage) return null;
  const rates = TOKEN_RATES[modelId] ?? TOKEN_RATES.default;
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const usd =
    (input * rates.input) / 1_000_000 +
    (output * rates.output) / 1_000_000 +
    (cacheRead * rates.cacheRead) / 1_000_000 +
    (cacheWrite * rates.output) / 1_000_000;
  return Math.round(usd * 10000) / 10000;
}

export function aggregateUsage(files) {
  return files.reduce(
    (acc, row) => {
      const u = row.usage;
      if (!u) return acc;
      acc.inputTokens += u.inputTokens ?? 0;
      acc.outputTokens += u.outputTokens ?? 0;
      acc.cacheReadTokens += u.cacheReadTokens ?? 0;
      acc.cacheWriteTokens += u.cacheWriteTokens ?? 0;
      acc.totalTokens += u.totalTokens ?? 0;
      acc.runs += 1;
      return acc;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      runs: 0,
    },
  );
}

export function workbookAccuracyNotes() {
  return [
    ["RAMS / HIRA scans", "~95% on printed headers", "Handwritten isolation owner names"],
    ["Permit to work", "~75–85%", "Handwritten site and RA reference"],
    ["Rescue plan", "~90%", "Printed titles and tick boxes"],
    ["IMSF checklist (printed questions)", "~97%", "Handwritten YES/NO separate"],
    ["Contractor clearance", "~85% names", "Handwritten site low confidence"],
  ];
}
