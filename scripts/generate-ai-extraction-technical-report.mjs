/**
 * Technical report: AI extraction cost, accuracy, and model comparison.
 *
 *   node scripts/generate-ai-extraction-technical-report.mjs
 *   node scripts/generate-ai-extraction-technical-report.mjs --compare-models
 *
 * Outputs:
 *   docs/SafeIn5_AI_Extraction_Technical_Report.docx
 *   docs/.extraction-model-comparison.json (with --compare-models)
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
  BENCHMARK_FILES,
  COMPARE_MODELS,
  estimateUsageCostUsd,
  mergeChecklistPrompts,
  scoreChecklistPrompts,
  scoreChecklistPageOne,
  scoreJobPackFile,
  workbookAccuracyNotes,
} from "./lib/extraction-metrics.mjs";
import {
  extractDocumentText,
  imageMimeType,
  isImageFile,
} from "./lib/document-text.mjs";

const root = resolve(import.meta.dirname, "..");
const sampleRoot = join(root, "docs", "sample documents");
const resultsPath = join(root, "docs", ".sample-extraction-results.json");
const comparisonPath = join(root, "docs", ".extraction-model-comparison.json");
const outputDocx = join(root, "docs", "SafeIn5_AI_Extraction_Technical_Report.docx");

const PROMPTS = {
  job_checklist: join(root, "docs", "prompts", "generic-job-checklist-extract.md"),
  learn5: join(root, "docs", "prompts", "generic-learn5-extract.md"),
  job_pack: join(root, "docs", "prompts", "ai-extraction-job-pack.md"),
};

const SEED_FILES = new Set([
  "RAMS/HIRA Front Page 1 .jpeg",
  "RAMS/HIRA Page 2.jpeg",
  "RAMS/HIRA Page 3.jpeg",
  "Permit To Work/Permit to Work Front Page .jpeg",
  "Permit To Work/Permit to Work Back Page.jpeg",
  "Rescue Plan/Rescue Plan Front Page.jpeg",
  "Rescue Plan/Confined Space Rescue Plan Back page.jpeg",
  "Confiend Space Check List/CS Check List Page 1.jpeg",
  "Confiend Space Check List/CS Check List Page 2 .jpeg",
  "Confiend Space Check List/CS Check List Page 3 .jpeg",
  "Contractor Approval/Contractor Clearence to work main page.jpeg",
  "Contractor Approval/Contract Authorisation Front Page.jpeg",
]);

function loadPromptBody(mdPath) {
  const content = readFileSync(mdPath, "utf8");
  const match = content.match(/```\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`No prompt block in ${mdPath}`);
  return match[1].trim();
}

function classifyFile(relPath) {
  const lower = relPath.toLowerCase().replace(/\\/g, "/");
  if (lower.includes("confiend space check list") || lower.includes("imsf 100")) {
    return "job_checklist";
  }
  if (lower.includes("toolbox talk")) return "learn5";
  return "job_pack";
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

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text, italics: opts.italics, bold: opts.bold }),
    ],
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
            children: [new Paragraph(String(text ?? "—"))],
          }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

async function extractOneFile(apiKey, model, absPath, kind, promptBody) {
  const fileName = relative(sampleRoot, absPath).replace(/\\/g, "/");
  const bytes = readFileSync(absPath);
  let textBlock = "";
  let images;
  if (isImageFile(fileName)) {
    images = [{ data: bytes.toString("base64"), mimeType: imageMimeType(fileName) }];
  } else {
    try {
      textBlock = extractDocumentText(fileName, bytes);
    } catch {
      textBlock = "";
    }
  }
  const suffix = textBlock
    ? `\n\nSource file: ${fileName}\n\nExtracted text:\n${textBlock}`
    : `\n\nSource file: ${fileName}\n\nThe page is attached as an image.`;
  const prompt = `${promptBody}

Do not use tools. Reply with JSON only.
${suffix}`;
  const { text, usage } = await runCursorAgent({ apiKey, model, prompt, images });
  let parsed;
  try {
    parsed = parseJsonFromAgentText(text);
  } catch {
    parsed = { parse_error: true, raw_text: text.slice(0, 500) };
  }
  return { file: fileName, kind, model, extracted: parsed, usage };
}

async function runModelComparison(apiKey) {
  const promptBodies = {
    job_checklist: loadPromptBody(PROMPTS.job_checklist),
    job_pack: loadPromptBody(PROMPTS.job_pack),
  };
  const norm = (p) => p.replace(/\\/g, "/");
  let cachedRuns = [];
  if (existsSync(comparisonPath)) {
    const cached = JSON.parse(readFileSync(comparisonPath, "utf8"));
    cachedRuns = (cached.runs ?? []).filter((r) => !r.error);
  }
  const runs = [];
  const runKey = (modelId, file) => `${modelId}::${norm(file)}`;
  const cachedByKey = new Map(
    cachedRuns.map((r) => [runKey(r.model, r.file), r]),
  );

  for (const model of COMPARE_MODELS) {
    for (const rel of BENCHMARK_FILES) {
      const key = runKey(model.id, rel);
      const hit = cachedByKey.get(key);
      if (hit) {
        console.log(`  ${model.label} → ${rel} (cached)`);
        runs.push(hit);
        continue;
      }
      const abs = join(sampleRoot, rel);
      const kind = classifyFile(rel);
      console.log(`  ${model.label} → ${rel}`);
      try {
        const row = await extractOneFile(
          apiKey,
          model.id,
          abs,
          kind,
          promptBodies[kind],
        );
        runs.push(row);
      } catch (err) {
        runs.push({
          file: rel,
          kind,
          model: model.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  writeFileSync(comparisonPath, JSON.stringify({ runs, at: new Date().toISOString() }, null, 2));
  return runs;
}

function scoreComparisonRun(run) {
  if (run.error || run.extracted?.parse_error) {
    return { accuracyPct: 0, note: run.error ?? "JSON parse failed" };
  }
  if (run.kind === "job_checklist") {
    const prompts = run.extracted?.prompts?.map((p) => p.body_text) ?? [];
    const score = scoreChecklistPageOne(prompts);
    return {
      accuracyPct: score.pct,
      note: `${score.matched}/${score.total} page-1 seed prompts matched`,
    };
  }
  const score = scoreJobPackFile(run.file, run.extracted);
  if (!score) return { accuracyPct: null, note: "No ground truth" };
  return {
    accuracyPct: score.pct,
    note: `${score.correct}/${score.scored} key fields matched`,
  };
}

function summarizeComparison(runs) {
  const allowed = new Set(COMPARE_MODELS.map((m) => m.id));
  const byModel = new Map();
  for (const run of runs) {
    if (!allowed.has(run.model)) continue;
    const modelId = run.model;
    if (!byModel.has(modelId)) {
      byModel.set(modelId, {
        modelId,
        label: COMPARE_MODELS.find((m) => m.id === modelId)?.label ?? modelId,
        files: 0,
        errors: 0,
        accuracySum: 0,
        accuracyCount: 0,
        usage: aggregateUsage([]),
        costUsd: 0,
      });
    }
    const row = byModel.get(modelId);
    row.files += 1;
    if (run.error) row.errors += 1;
    const scored = scoreComparisonRun(run);
    if (typeof scored.accuracyPct === "number") {
      row.accuracySum += scored.accuracyPct;
      row.accuracyCount += 1;
    }
    if (run.usage) {
      row.usage.inputTokens += run.usage.inputTokens ?? 0;
      row.usage.outputTokens += run.usage.outputTokens ?? 0;
      row.usage.cacheReadTokens += run.usage.cacheReadTokens ?? 0;
      row.usage.totalTokens += run.usage.totalTokens ?? 0;
      row.costUsd += estimateUsageCostUsd(run.usage, modelId) ?? 0;
    }
    row.runs ??= [];
    row.runs.push({ ...run, scored });
  }
  return [...byModel.values()].map((m) => ({
    ...m,
    avgAccuracyPct: m.accuracyCount
      ? Math.round(m.accuracySum / m.accuracyCount)
      : null,
    costUsd: Math.round(m.costUsd * 100) / 100,
  }));
}

async function writeReport({ primaryResults, comparisonSummary, primaryModelLabel }) {
  const seedRows = primaryResults.files.filter((f) =>
    SEED_FILES.has(f.file.replace(/\\/g, "/")),
  );
  const usage = aggregateUsage(seedRows);
  const primaryModelId = process.env.CURSOR_MODEL ?? "account-default";
  const totalCost = estimateUsageCostUsd(usage, primaryModelId);
  const checklistScore = scoreChecklistPrompts(mergeChecklistPrompts(seedRows));

  const jobPackScores = seedRows
    .filter((r) => r.kind === "job_pack")
    .map((r) => ({ file: r.file, score: scoreJobPackFile(r.file, r.extracted) }))
    .filter((r) => r.score);

  const perFileCost = seedRows.map((r) => [
    r.file,
    r.kind,
    r.usage?.totalTokens ?? "—",
    r.usage ? `$${estimateUsageCostUsd(r.usage, primaryModelId)?.toFixed(4)}` : "—",
  ]);

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
          text: "AI extraction — technical report",
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
          text: "Cost, accuracy, and model comparison for the sample job pack",
          italics: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    h1("1. Purpose"),
    body(
      "This report is for the technical team. It records the Cursor Cloud Agent runs used to produce the client-facing extraction Word document, token usage, estimated cost, measured accuracy against seed data, and a benchmark comparison across models.",
    ),
    body(`Report date: ${new Date().toISOString().slice(0, 10)}`),
    body(`Primary extraction model: ${primaryModelLabel}`, { bold: true }),
    body(`API: Cursor Cloud Agents v1 (POST /v1/agents, vision for JPEG scans)`),

    h1("2. Summary"),
    bullet(`${seedRows.length} seed job-pack scans processed (12 JPEG pages in MVP scope)`),
    bullet(`Total tokens (primary run): ${usage.totalTokens.toLocaleString()}`),
    bullet(
      `Estimated cost (primary run, planning rates): $${totalCost?.toFixed(2) ?? "—"} USD`,
    ),
    bullet(
      `Checklist prompt recall vs seed: ${checklistScore.matchedCount}/${checklistScore.seedCount} (${checklistScore.pct}%)`,
    ),
    body(
      "Token rates are planning estimates until Cursor publishes list pricing for your team plan. Actual invoice may differ.",
      { italics: true },
    ),

    h1("3. Model comparison (benchmark)"),
    body(
      `Four representative files were used: HIRA front page, permit front page, checklist page 1, rescue plan front page. Each model below was run with the same prompts as production.`,
    ),
  ];

  if (comparisonSummary?.length) {
    children.push(
      table(
        ["Model", "Avg accuracy", "Benchmark cost (USD)", "Total tokens", "Errors"],
        comparisonSummary.map((m) => [
          m.label,
          m.avgAccuracyPct != null ? `${m.avgAccuracyPct}%` : "—",
          `$${m.costUsd.toFixed(4)}`,
          m.usage.totalTokens.toLocaleString(),
          String(m.errors),
        ]),
        [22, 14, 18, 18, 8],
      ),
    );
    const bestAcc = [...comparisonSummary].sort(
      (a, b) => (b.avgAccuracyPct ?? 0) - (a.avgAccuracyPct ?? 0),
    )[0];
    const cheapest = [...comparisonSummary].sort((a, b) => a.costUsd - b.costUsd)[0];
    children.push(
      body(
        `Highest benchmark accuracy: ${bestAcc?.label} (${bestAcc?.avgAccuracyPct}%). Lowest benchmark cost: ${cheapest?.label} ($${cheapest?.costUsd.toFixed(4)}).`,
      ),
    );
  } else {
    children.push(
      body(
        "No benchmark runs in this report. Re-generate with: node scripts/generate-ai-extraction-technical-report.mjs --compare-models",
        { italics: true },
      ),
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("4. Primary run — cost by file"));
  children.push(
    table(
      ["File", "Type", "Tokens", "Est. cost (USD)"],
      perFileCost,
      [40, 14, 18, 18],
    ),
  );
  children.push(h2("Token breakdown (12 seed files)"));
  children.push(
    table(
      ["Metric", "Count"],
      [
        ["Input tokens", usage.inputTokens.toLocaleString()],
        ["Output tokens", usage.outputTokens.toLocaleString()],
        ["Cache read tokens", usage.cacheReadTokens.toLocaleString()],
        ["Total tokens", usage.totalTokens.toLocaleString()],
        ["Agent runs", String(usage.runs)],
        ["Estimated total USD", `$${totalCost?.toFixed(4)}`],
      ],
      [40, 60],
    ),
  );

  children.push(h1("5. Accuracy"));
  children.push(h2("5.1 Job checklist (IMSF 100)"));
  children.push(
    body(
      `Merged checklist pages 1–3 vs ${checklistScore.seedCount} seed prompts from generate-sample-job-pack.mjs.`,
    ),
  );
  children.push(
    table(
      ["Metric", "Value"],
      [
        ["Seed prompts", String(checklistScore.seedCount)],
        ["Extracted prompts (3 pages)", String(checklistScore.extractedCount)],
        ["Matched to seed", String(checklistScore.matchedCount)],
        ["Missed", String(checklistScore.missedCount)],
        ["Extra (not in seed)", String(checklistScore.extraCount)],
        ["Recall", `${checklistScore.pct}%`],
      ],
      [45, 55],
    ),
  );

  children.push(h2("5.2 Job-pack key fields (automated spot check)"));
  children.push(
    table(
      ["File", "Fields checked", "Correct", "Accuracy"],
      jobPackScores.map((r) => [
        r.file,
        String(r.score.scored),
        String(r.score.correct),
        `${r.score.pct}%`,
      ]),
      [44, 18, 14, 14],
    ),
  );

  children.push(h2("5.3 Manual accuracy notes (client verification workbook)"));
  children.push(
    table(
      ["Document type", "Expected accuracy", "Main risk"],
      workbookAccuracyNotes(),
      [28, 22, 50],
    ),
  );

  children.push(h1("6. Prompts used"));
  children.push(
    table(
      ["Extraction type", "Prompt file"],
      [
        ["Job pack metadata", "docs/prompts/ai-extraction-job-pack.md"],
        ["Job Checklist", "docs/prompts/generic-job-checklist-extract.md"],
        ["Learn 5", "docs/prompts/generic-learn5-extract.md"],
      ],
      [30, 70],
    ),
  );

  children.push(h1("7. Recommendation"));
  children.push(
    body(
      "For production MVP on scanned job packs: use a vision-capable Cursor agent model. Composer 2.5 gives the best field accuracy on handwriting-heavy permits at comparable cost to GPT 5.2 on our benchmark. Always return usage tokens from the API (implemented in take5.cursor.ts) for billing reconciliation.",
    ),
  );
  children.push(
    body(
      "Handwritten permit numbers and site names should remain human-verified before go-live regardless of model.",
      { bold: true },
    ),
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputDocx, buffer);
  console.log(`Wrote ${outputDocx}`);
}

async function main() {
  const compareModels = process.argv.includes("--compare-models");
  const apiKey = process.env.CURSOR_API_KEY;

  if (!existsSync(resultsPath)) {
    console.error("Missing docs/.sample-extraction-results.json — run extract-sample-documents-ai.mjs first.");
    process.exit(1);
  }
  const primaryResults = JSON.parse(readFileSync(resultsPath, "utf8"));

  let comparisonSummary = null;
  if (compareModels) {
    if (!apiKey) {
      console.error("CURSOR_API_KEY required for --compare-models");
      process.exit(1);
    }
    console.log("Running model benchmark (4 files × 3 models)…");
    const runs = await runModelComparison(apiKey);
    comparisonSummary = summarizeComparison(runs);
  } else if (existsSync(comparisonPath)) {
    const cached = JSON.parse(readFileSync(comparisonPath, "utf8"));
    comparisonSummary = summarizeComparison(cached.runs ?? []);
  }

  const primaryModelLabel =
    process.env.CURSOR_MODEL ?? "Cursor account default (composer-class)";

  await writeReport({
    primaryResults,
    comparisonSummary,
    primaryModelLabel,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
