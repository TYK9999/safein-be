/**
 * Job Checklist only — model cost comparison (no seed ground truth).
 * Same prompt + same files per model; report whether outputs match.
 *
 *   node scripts/generate-job-checklist-model-comparison.mjs
 *   node scripts/generate-job-checklist-model-comparison.mjs --run
 *   node scripts/generate-job-checklist-model-comparison.mjs --run --fresh
 *
 * Outputs:
 *   docs/SafeIn5_Job_Checklist_Model_Comparison.docx
 *   docs/.job-checklist-model-comparison.json
 */

import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { parseJsonFromAgentText, runCursorAgent } from "./lib/cursor-agent.mjs";
import {
  aggregateUsage,
  CHECKLIST_FILES,
  COMPARE_MODELS,
  estimateUsageCostUsd,
} from "./lib/extraction-metrics.mjs";
import {
  extractDocumentText,
  imageMimeType,
  isImageFile,
} from "./lib/document-text.mjs";

const root = resolve(import.meta.dirname, "..");
const sampleRoot = join(root, "docs", "sample documents");
const promptPath = join(root, "docs", "prompts", "generic-job-checklist-extract.md");
const cachePath = join(root, "docs", ".job-checklist-model-comparison.json");
const outputDocx = join(root, "docs", "SafeIn5_Job_Checklist_Model_Comparison.docx");

function loadPromptBody() {
  const content = readFileSync(promptPath, "utf8");
  const match = content.match(/```\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`No prompt block in ${promptPath}`);
  return match[1].trim();
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 100 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, italics: opts.italics, bold: opts.bold })],
  });
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

function table(headers, rows, widths) {
  const headerRow = new TableRow({
    children: headers.map((text, i) =>
      new TableCell({
        width: widths?.[i] ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
      }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((text, i) =>
          new TableCell({
            width: widths?.[i] ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(text ?? "—"), size: i > 0 ? 18 : 20 })],
              }),
            ],
          }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function promptsSimilar(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 20) return na.includes(nb) || nb.includes(na);
  return (
    na.slice(0, 40) === nb.slice(0, 40) ||
    na.includes(nb.slice(0, 30)) ||
    nb.includes(na.slice(0, 30))
  );
}

function sortedPrompts(extracted) {
  return [...(extracted?.prompts ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
}

function runForModel(runs, modelId, file) {
  const norm = file.replace(/\\/g, "/");
  return runs.find((r) => r.model === modelId && r.file.replace(/\\/g, "/") === norm);
}

/** Prompt + file only — no source path or ground-truth hints. */
async function extractChecklistStrict(apiKey, model, absPath, promptBody) {
  const fileName = relative(sampleRoot, absPath).replace(/\\/g, "/");
  const bytes = readFileSync(absPath);
  let prompt = `${promptBody}\n\nReply with JSON only.`;
  let images;
  if (isImageFile(fileName)) {
    images = [{ data: bytes.toString("base64"), mimeType: imageMimeType(fileName) }];
  } else {
    prompt = `${promptBody}\n\nReply with JSON only.\n\n${extractDocumentText(fileName, bytes)}`;
  }
  const { text, usage } = await runCursorAgent({
    apiKey,
    model,
    prompt,
    images,
    waitMs: 360_000,
  });
  let extracted;
  try {
    extracted = parseJsonFromAgentText(text);
  } catch {
    extracted = { parse_error: true, raw_text: text.slice(0, 800) };
  }
  return {
    file: fileName,
    kind: "job_checklist",
    model,
    inputMode: "prompt_and_file_only",
    extracted,
    usage,
    extractedAt: new Date().toISOString(),
  };
}

async function runExtractions(apiKey, promptBody, fresh) {
  const norm = (p) => p.replace(/\\/g, "/");
  let cachedRuns = [];
  if (!fresh && existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf8"));
    cachedRuns = (cached.runs ?? []).filter((r) => !r.error && r.inputMode === "prompt_and_file_only");
  }
  const runs = [];
  const key = (modelId, file) => `${modelId}::${norm(file)}`;
  const cachedByKey = new Map(cachedRuns.map((r) => [key(r.model, r.file), r]));

  for (const model of COMPARE_MODELS) {
    for (const rel of CHECKLIST_FILES) {
      const cacheHit = cachedByKey.get(key(model.id, rel));
      if (cacheHit) {
        console.log(`  ${model.label} → ${rel} (cached)`);
        runs.push(cacheHit);
        continue;
      }
      const abs = join(sampleRoot, rel);
      console.log(`  ${model.label} → ${rel}`);
      try {
        const row = await extractChecklistStrict(apiKey, model.id, abs, promptBody);
        runs.push(row);
      } catch (err) {
        runs.push({
          file: rel,
          kind: "job_checklist",
          model: model.id,
          inputMode: "prompt_and_file_only",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  writeFileSync(
    cachePath,
    JSON.stringify(
      {
        version: 2,
        inputMode: "prompt_and_file_only",
        comparisonMode: "model_vs_model",
        promptFile: "docs/prompts/generic-job-checklist-extract.md",
        runs,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  return runs;
}

function compareTwoModels(runA, runB) {
  const labelA = COMPARE_MODELS.find((m) => m.id === runA?.model)?.label ?? runA?.model ?? "A";
  const labelB = COMPARE_MODELS.find((m) => m.id === runB?.model)?.label ?? runB?.model ?? "B";

  if (runA?.error || runB?.error) {
    return {
      labelA,
      labelB,
      comparable: false,
      error: runA?.error ?? runB?.error ?? "One or both runs failed",
      rows: [],
      matchedCount: 0,
      comparedCount: 0,
      matchPct: 0,
      countA: 0,
      countB: 0,
    };
  }
  if (runA?.extracted?.parse_error || runB?.extracted?.parse_error) {
    return {
      labelA,
      labelB,
      comparable: false,
      error: "JSON parse failed for one or both models",
      rows: [],
      matchedCount: 0,
      comparedCount: 0,
      matchPct: 0,
      countA: 0,
      countB: 0,
    };
  }

  const promptsA = sortedPrompts(runA.extracted);
  const promptsB = sortedPrompts(runB.extracted);
  const maxLen = Math.max(promptsA.length, promptsB.length);
  const rows = [];
  let matchedCount = 0;

  for (let i = 0; i < maxLen; i += 1) {
    const a = promptsA[i];
    const b = promptsB[i];
    const textA = a?.body_text ?? null;
    const textB = b?.body_text ?? null;
    let match = "No";
    if (textA && textB) {
      if (normalizeText(textA) === normalizeText(textB)) match = "Exact";
      else if (promptsSimilar(textA, textB)) match = "Similar";
    } else if (!textA && !textB) {
      match = "—";
    }
    if (match === "Exact" || match === "Similar") matchedCount += 1;
    rows.push({
      index: i + 1,
      sortA: a?.sort_order ?? "—",
      sortB: b?.sort_order ?? "—",
      textA: textA ?? "—",
      textB: textB ?? "—",
      priorityA: a?.priority ?? "—",
      priorityB: b?.priority ?? "—",
      match,
    });
  }

  const comparedCount = rows.filter((r) => r.textA !== "—" || r.textB !== "—").length;
  return {
    labelA,
    labelB,
    comparable: true,
    rows,
    matchedCount,
    comparedCount,
    matchPct: comparedCount ? Math.round((matchedCount / comparedCount) * 100) : 0,
    countA: promptsA.length,
    countB: promptsB.length,
    titleA: runA.extracted?.title ?? "—",
    titleB: runB.extracted?.title ?? "—",
    pageA: runA.extracted?.page_label ?? "—",
    pageB: runB.extracted?.page_label ?? "—",
  };
}

function summarizeByModel(runs) {
  const allowed = new Set(COMPARE_MODELS.map((m) => m.id));
  const byModel = new Map();
  for (const run of runs) {
    if (!allowed.has(run.model)) continue;
    if (!byModel.has(run.model)) {
      byModel.set(run.model, {
        modelId: run.model,
        label: COMPARE_MODELS.find((m) => m.id === run.model)?.label ?? run.model,
        runs: [],
        usage: aggregateUsage([]),
        costUsd: 0,
        errors: 0,
      });
    }
    const row = byModel.get(run.model);
    row.runs.push(run);
    if (run.error || run.extracted?.parse_error) row.errors += 1;
    if (run.usage) {
      row.usage.inputTokens += run.usage.inputTokens ?? 0;
      row.usage.outputTokens += run.usage.outputTokens ?? 0;
      row.usage.cacheReadTokens += run.usage.cacheReadTokens ?? 0;
      row.usage.totalTokens += run.usage.totalTokens ?? 0;
      row.costUsd += estimateUsageCostUsd(run.usage, run.model) ?? 0;
    }
  }
  return [...byModel.values()].map((m) => ({
    ...m,
    costUsd: Math.round(m.costUsd * 10000) / 10000,
  }));
}

function pairModelComparison(runs) {
  if (COMPARE_MODELS.length < 2) return null;
  const [modelA, modelB] = COMPARE_MODELS;
  const perFile = [];
  const allRows = [];
  let totalMatched = 0;
  let totalCompared = 0;

  for (const rel of CHECKLIST_FILES) {
    const runA = runForModel(runs, modelA.id, rel);
    const runB = runForModel(runs, modelB.id, rel);
    const cmp = compareTwoModels(runA, runB);
    perFile.push({ file: rel, ...cmp });
    if (cmp.comparable) {
      totalMatched += cmp.matchedCount;
      totalCompared += cmp.comparedCount;
      allRows.push(...cmp.rows.map((r) => ({ ...r, file: rel.split("/").pop() })));
    }
  }

  return {
    modelA: modelA.label,
    modelB: modelB.label,
    perFile,
    overallMatchPct: totalCompared ? Math.round((totalMatched / totalCompared) * 100) : 0,
    totalMatched,
    totalCompared,
    modelsAgree: totalCompared > 0 && totalMatched === totalCompared,
  };
}

async function writeReport(runs, modelSummary, pairComparison) {
  const [modelA, modelB] = COMPARE_MODELS;
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 300 },
      children: [new TextRun({ text: "SafeIn5", bold: true, size: 52 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Job Checklist extraction — model comparison",
          bold: true,
          size: 34,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 500 },
      children: [
        new TextRun({
          text: "Same prompt and files per model — cost, tokens, and output agreement",
          italics: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    h1("1. Method"),
    body(
      "Each model received the same job_checklist extraction prompt and the same source JPEG. No seed file or ground-truth checklist is used — agreement is measured only between model outputs.",
    ),
    bullet("Prompt: docs/prompts/generic-job-checklist-extract.md"),
    bullet("Input: prompt text + attached scan image only"),
    bullet(`Files: ${CHECKLIST_FILES.map((f) => f.split("/").pop()).join(", ")}`),
    bullet(`Models: ${COMPARE_MODELS.map((m) => m.label).join(" vs ")}`),
    body(`Report date: ${new Date().toISOString().slice(0, 10)}`),

    h1("2. Cost and tokens"),
    table(
      ["Model", "Input tokens", "Output tokens", "Cache read", "Total tokens", "Est. cost (USD)"],
      modelSummary.map((m) => [
        m.label,
        m.usage.inputTokens.toLocaleString(),
        m.usage.outputTokens.toLocaleString(),
        m.usage.cacheReadTokens.toLocaleString(),
        m.usage.totalTokens.toLocaleString(),
        `$${m.costUsd.toFixed(4)}`,
      ]),
      [16, 14, 14, 14, 14, 14],
    ),
    body("Per file:", { bold: true }),
    table(
      ["Model", "File", "Input", "Output", "Total", "Cost (USD)"],
      modelSummary.flatMap((m) =>
        m.runs.map((r) => [
          m.label,
          r.file.split("/").pop(),
          r.usage?.inputTokens?.toLocaleString() ?? "—",
          r.usage?.outputTokens?.toLocaleString() ?? "—",
          r.usage?.totalTokens?.toLocaleString() ?? "—",
          r.usage ? `$${estimateUsageCostUsd(r.usage, m.modelId)?.toFixed(4)}` : "—",
        ]),
      ),
      [14, 22, 12, 12, 12, 12],
    ),
    body(
      "Costs use planning rates in scripts/lib/extraction-metrics.mjs. Actual invoice may differ.",
      { italics: true },
    ),

    h1("3. Do the models match?"),
  ];

  if (pairComparison) {
    children.push(
      body(
        `Overall: ${pairComparison.totalMatched} of ${pairComparison.totalCompared} prompt rows agree (${pairComparison.overallMatchPct}%).`,
        { bold: true },
      ),
      body(
        pairComparison.modelsAgree
          ? "All compared prompts are Exact or Similar between the two models."
          : "Models do not fully agree — review section 4 for differences.",
        { bold: true },
      ),
      table(
        ["File", `${modelA.label} prompts`, `${modelB.label} prompts`, "Matched rows", "Match %", "Agree?"],
        pairComparison.perFile.map((f) => [
          f.file.split("/").pop(),
          f.comparable ? String(f.countA) : "—",
          f.comparable ? String(f.countB) : "—",
          f.comparable ? `${f.matchedCount}/${f.comparedCount}` : "—",
          f.comparable ? `${f.matchPct}%` : "—",
          f.comparable ? (f.matchedCount === f.comparedCount ? "Yes" : "No") : f.error ?? "Error",
        ]),
        [22, 12, 12, 14, 10, 10],
      ),
      body(
        "Match rules: Exact = same normalized text; Similar = same meaning by fuzzy prefix match; No = different or missing on one side.",
        { italics: true },
      ),
    );
  }

  children.push(h1("4. Side-by-side extraction (manual verification)"));

  for (const rel of CHECKLIST_FILES) {
    const runA = runForModel(runs, modelA.id, rel);
    const runB = runForModel(runs, modelB.id, rel);
    const cmp = compareTwoModels(runA, runB);

    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(h2(rel.split("/").pop()));

    children.push(
      table(
        ["", modelA.label, modelB.label],
        [
          ["Prompt count", cmp.countA ?? "—", cmp.countB ?? "—"],
          ["Title", cmp.titleA ?? "—", cmp.titleB ?? "—"],
          ["Page label", cmp.pageA ?? "—", cmp.pageB ?? "—"],
          [
            "Tokens",
            runA?.usage?.totalTokens?.toLocaleString() ?? "—",
            runB?.usage?.totalTokens?.toLocaleString() ?? "—",
          ],
          [
            "Cost (USD)",
            runA?.usage ? `$${estimateUsageCostUsd(runA.usage, modelA.id)?.toFixed(4)}` : "—",
            runB?.usage ? `$${estimateUsageCostUsd(runB.usage, modelB.id)?.toFixed(4)}` : "—",
          ],
          [
            "Page agrees?",
            cmp.comparable ? (cmp.matchedCount === cmp.comparedCount ? "Yes" : "No") : "—",
            cmp.comparable ? `${cmp.matchPct}% match` : cmp.error ?? "—",
          ],
        ],
        [18, 41, 41],
      ),
    );

    if (!cmp.comparable) {
      children.push(body(cmp.error ?? "Could not compare — extraction failed.", { italics: true }));
      continue;
    }

    children.push(
      table(
        ["#", "Match", modelA.label, modelB.label],
        cmp.rows.map((r) => [String(r.index), r.match, r.textA, r.textB]),
        [5, 8, 43, 44],
      ),
    );

    for (const model of COMPARE_MODELS) {
      const run = runForModel(runs, model.id, rel);
      const prompts = sortedPrompts(run?.extracted);
      if (!prompts.length) continue;
      children.push(h3(`${model.label} — full JSON prompts (${prompts.length})`));
      children.push(
        table(
          ["sort_order", "priority", "mandatory", "body_text"],
          prompts.map((p) => [
            String(p.sort_order ?? "—"),
            String(p.priority ?? "—"),
            p.mandatory == null ? "—" : String(p.mandatory),
            p.body_text ?? "—",
          ]),
          [8, 8, 10, 74],
        ),
      );
      const answers = run?.extracted?.filled_answers ?? [];
      if (answers.length) {
        children.push(h3(`${model.label} — filled_answers from scan`));
        children.push(
          table(
            ["sort_order", "answer", "comment"],
            answers.map((a) => [
              String(a.sort_order ?? "—"),
              a.answer ?? "—",
              a.comment ?? "—",
            ]),
            [12, 12, 76],
          ),
        );
      }
    }
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("5. Re-run"));
  children.push(body("node scripts/generate-job-checklist-model-comparison.mjs --run"));
  children.push(body("node scripts/generate-job-checklist-model-comparison.mjs --run --fresh  (ignore cache)"));

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputDocx, buffer);
  console.log(`Wrote ${outputDocx}`);
}

async function main() {
  const shouldRun = process.argv.includes("--run");
  const fresh = process.argv.includes("--fresh");
  const apiKey = process.env.CURSOR_API_KEY;
  const promptBody = loadPromptBody();

  let runs = [];
  if (shouldRun) {
    if (!apiKey) {
      console.error("CURSOR_API_KEY required for --run");
      process.exit(1);
    }
    console.log(
      `Running checklist extraction (${CHECKLIST_FILES.length} files × ${COMPARE_MODELS.length} models)…`,
    );
    runs = await runExtractions(apiKey, promptBody, fresh);
  } else if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf8"));
    runs = cached.runs ?? [];
    console.log(`Using cached runs from ${cachePath}`);
  } else {
    console.error("No cache. Run: node scripts/generate-job-checklist-model-comparison.mjs --run");
    process.exit(1);
  }

  const modelSummary = summarizeByModel(runs);
  const pairComparison = pairModelComparison(runs);
  await writeReport(runs, modelSummary, pairComparison);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
