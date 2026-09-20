/**
 * AI extraction from docs/sample documents/ and Word handoff report.
 *
 *   node scripts/extract-sample-documents-ai.mjs
 *   node scripts/extract-sample-documents-ai.mjs --doc-only   # regenerate Word from cache
 *   node scripts/extract-sample-documents-ai.mjs --file "RAMS/HIRA Front Page 1 .jpeg"
 *
 * Requires CURSOR_API_KEY in .env (optional CURSOR_MODEL).
 */

import "dotenv/config";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

import { parseJsonFromAgentText, runCursorAgent } from "./lib/cursor-agent.mjs";
import { writeClientExtractionDoc } from "./lib/client-extraction-doc.mjs";
import {
  extractDocumentText,
  imageMimeType,
  isImageFile,
} from "./lib/document-text.mjs";

const root = resolve(import.meta.dirname, "..");
const sampleRoot = join(root, "docs", "sample documents");
const indexHtml = join(root, "docs", "index.html");
const resultsPath = join(root, "docs", ".sample-extraction-results.json");
const outputDocx = join(root, "docs", "SafeIn5_Sample_Documents_AI_Extraction.docx");

const PROMPTS = {
  job_checklist: join(root, "docs", "prompts", "generic-job-checklist-extract.md"),
  learn5: join(root, "docs", "prompts", "generic-learn5-extract.md"),
  job_pack: join(root, "docs", "prompts", "ai-extraction-job-pack.md"),
};

const PROMPT_LABELS = {
  job_checklist: "generic-job-checklist-extract",
  learn5: "generic-learn5-extract",
  job_pack: "ai-extraction-job-pack",
};

function loadPromptBody(mdPath) {
  const content = readFileSync(mdPath, "utf8");
  const match = content.match(/```\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`No prompt block in ${mdPath}`);
  return match[1].trim();
}

const ALLOWED_EXT = new Set([
  "jpeg",
  "jpg",
  "png",
  "pdf",
  "docx",
  "xlsx",
]);

function listSampleFiles() {
  const files = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const ext = name.includes(".")
          ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
          : "";
        if (ALLOWED_EXT.has(ext)) files.push(full);
      }
    }
  }
  walk(sampleRoot);
  return files.sort();
}

function classifyFile(relPath) {
  const lower = relPath.toLowerCase().replace(/\\/g, "/");
  if (
    lower.includes("safein5_sample_documents_seed_map") ||
    lower.includes("safein5 core")
  ) {
    return "skip";
  }
  if (
    lower.includes("confiend space check list") ||
    lower.includes("imsf 100")
  ) {
    return "job_checklist";
  }
  if (lower.includes("toolbox talk")) return "learn5";
  return "job_pack";
}

function buildAgentPrompt(kind, promptBody, fileName, textBlock) {
  const suffix = textBlock
    ? `\n\nSource file: ${fileName}\n\nExtracted text (may be incomplete for scans — prefer the attached image if provided):\n${textBlock}`
    : `\n\nSource file: ${fileName}\n\nThe checklist/permit page is attached as an image. Read every visible field.`;
  return `${promptBody}

Do not use tools, do not write files, and do not ask follow-up questions. Reply with the JSON object only.
${suffix}`;
}

function uiRowsForResult(kind, data, relPath) {
  const rows = [];
  const push = (screen, uiField, dbField, value) =>
    rows.push([screen, uiField, dbField, value ?? "—"]);

  if (kind === "job_checklist") {
    push("s-content-new", "Content title", "content_pack.title", data.title);
    push("s-content-new", "Kind", "content_pack.kind", "job_checklist");
    push(
      "10_content (Excel)",
      "Checklist title",
      "content_pack.title",
      data.title,
    );
    const prompts = data.prompts ?? [];
    for (const p of prompts.slice(0, 8)) {
      push(
        "s-content-new → Check text",
        `Prompt ${p.sort_order}`,
        "content_prompt.body_text",
        p.body_text,
      );
    }
    if (prompts.length > 8) {
      push(
        "10_content",
        `… +${prompts.length - 8} more prompts`,
        "content_prompt",
        "",
      );
    }
    push(
      "11_content_attach",
      "Attach pack to task",
      "content_placement",
      "work_task · permit 098001",
    );
    return rows;
  }

  if (kind === "learn5") {
    push("s-content-new", "Learn 5 title", "content_pack.title", data.title);
    push("s-content-new", "Kind", "content_pack.kind", "learn_5");
    push("s-content-new", "Category", "content_pack.category", data.category);
    push(
      "s-content-new",
      "Duration (min)",
      "content_pack.duration_minutes",
      data.duration_minutes,
    );
    for (const item of (data.items ?? []).slice(0, 6)) {
      push(
        "PULSE → Learn 5",
        `Item ${item.sort_order}: ${item.headline}`,
        "content_prompt / learn5 media",
        item.body ?? item.headline,
      );
    }
    return rows;
  }

  // job_pack
  const docKind = data.document_kind ?? "other";
  push("s-doc-new", "Document kind", "document.doc_type", docKind);
  push(
    "s-doc-new",
    "Reference",
    "document_revision.reference",
    data.rams_reference ?? data.task_reference,
  );
  push("s-doc-new", "Title", "document.title", data.work_description ?? relPath);
  push("01_client / s-tenant-new", "Client", "tenant.name", data.client);
  push("03_site / s-site-new", "Site", "site.name", data.site);
  push("04_space / s-space-new", "Space", "space.name", data.space);
  push("06_task / s-job-new", "Task reference", "work_task.reference", data.task_reference);
  push("06_task", "RAMS ref", "work_task.rams_reference", data.rams_reference);
  push("06_task", "MS/SOP", "work_task.ms_sop_number", data.ms_sop_number);
  push("06_task", "Work description", "work_task.work_description", data.work_description);
  push(
    "06_task",
    "Dates",
    "work_task.starts_at / ends_at",
    [data.dates?.starts, data.dates?.ends].filter(Boolean).join(" → ") || null,
  );
  for (const person of (data.people ?? []).slice(0, 5)) {
    push(
      "05_person / s-user-new",
      person.role_hint ?? "Person",
      "app_user + site_role",
      person.name,
    );
  }
  push("09_document_attach", "Attach document", "document_placement", "task or space");
  return rows;
}

async function extractOneFile(apiKey, model, absPath, kind, promptBody) {
  const fileName = relative(sampleRoot, absPath).replace(/\\/g, "/");
  const bytes = readFileSync(absPath);
  let textBlock = "";
  let images;

  if (isImageFile(fileName)) {
    images = [
      {
        data: bytes.toString("base64"),
        mimeType: imageMimeType(fileName),
      },
    ];
  } else {
    try {
      textBlock = extractDocumentText(fileName, bytes);
    } catch {
      textBlock = "(no text layer — treat as unreadable without OCR)";
    }
  }

  const prompt = buildAgentPrompt(kind, promptBody, fileName, textBlock);
  const { text, usage } = await runCursorAgent({
    apiKey,
    model,
    prompt,
    images,
  });

  let parsed;
  try {
    parsed = parseJsonFromAgentText(text);
  } catch {
    parsed = { raw_text: text, parse_error: true };
  }

  return {
    file: fileName,
    kind,
    promptId: PROMPT_LABELS[kind],
    extracted: parsed,
    usage,
    extractedAt: new Date().toISOString(),
  };
}

function loadResults() {
  if (!existsSync(resultsPath)) return { version: 1, files: [] };
  return JSON.parse(readFileSync(resultsPath, "utf8"));
}

function saveResults(payload) {
  writeFileSync(resultsPath, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const docOnly = args.includes("--doc-only");
  const fileFilter = args.includes("--file")
    ? args[args.indexOf("--file") + 1]
    : null;

  const promptBodies = {
    job_checklist: loadPromptBody(PROMPTS.job_checklist),
    learn5: loadPromptBody(PROMPTS.learn5),
    job_pack: loadPromptBody(PROMPTS.job_pack),
  };

  let results = loadResults();

  if (!docOnly) {
    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) {
      console.error("CURSOR_API_KEY is not set in .env — cannot run extraction.");
      if (!results.files.length) process.exit(1);
      console.log("Regenerating Word document from existing cache only.");
    } else {
      const model = process.env.CURSOR_MODEL;
      const allFiles = listSampleFiles();
      const toProcess = allFiles.filter((abs) => {
        const rel = relative(sampleRoot, abs).replace(/\\/g, "/");
        if (classifyFile(rel) === "skip") return false;
        if (fileFilter && !rel.includes(fileFilter)) return false;
        return true;
      });

      console.log(`Extracting ${toProcess.length} file(s)…`);
      const byFile = new Map(results.files.map((r) => [r.file, r]));

      for (const abs of toProcess) {
        const rel = relative(sampleRoot, abs).replace(/\\/g, "/");
        const kind = classifyFile(rel);
        console.log(`→ ${rel} (${kind})`);
        try {
          const row = await extractOneFile(
            apiKey,
            model,
            abs,
            kind,
            promptBodies[kind],
          );
          byFile.set(rel, row);
          saveResults({ version: 1, files: [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file)) });
          console.log(`  done (${row.extracted?.prompts?.length ?? row.extracted?.people?.length ?? "ok"})`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`  failed: ${message}`);
          byFile.set(rel, {
            file: rel,
            kind,
            promptId: PROMPT_LABELS[kind],
            error: message,
            extractedAt: new Date().toISOString(),
          });
          saveResults({ version: 1, files: [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file)) });
        }
      }
      results = loadResults();
    }
  }

  await writeClientExtractionDoc({
    results,
    sampleRoot,
    outputDocx,
    indexHtml,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
