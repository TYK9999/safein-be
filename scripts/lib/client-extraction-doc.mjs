import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import puppeteer from "puppeteer";
import sharp from "sharp";

const screenshotDir = join(rootFromHere(), "docs", ".handoff-screenshots");
const sourcePreviewDir = join(screenshotDir, "sources");

/** Files from docs/sample documents/ that feed the MVP job-pack seed (JPEG scans only). */
const SEED_SOURCE_FILES = new Set([
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

const UI_SCREENS = {
  "doc-new": "Upload a document",
  "doc-attach": "Attach a document",
  "content-new": "Upload content — Job Checklist",
  "content-attach": "Attach content to a task",
};

const DOC_KIND_LABEL = {
  rams: "Risk assessment (HIRA / RAMS)",
  risk_assessment: "Risk assessment (HIRA / RAMS)",
  permit_to_work: "Permit to work",
  rescue_plan: "Rescue plan",
  checklist: "Checklist",
  contractor_clearance: "Contractor clearance",
  other: "Other document",
};

function rootFromHere() {
  return join(import.meta.dirname, "..", "..");
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

function body(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italics,
        size: options.size,
      }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

function clientTable(headers, rows, widths) {
  const headerRow = new TableRow({
    children: headers.map(
      (text, index) =>
        new TableCell({
          width: widths?.[index]
            ? { size: widths[index], type: WidthType.PERCENTAGE }
            : undefined,
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (text, index) =>
            new TableCell({
              width: widths?.[index]
                ? { size: widths[index], type: WidthType.PERCENTAGE }
                : undefined,
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

async function scaledImageParagraph(absPath, maxW = 300, maxH = 420) {
  const input = readFileSync(absPath);
  const resized = await sharp(input)
    .rotate()
    .resize({
      width: maxW,
      height: maxH,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 72 })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const width = meta.width ?? maxW;
  const height = meta.height ?? maxH;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        data: resized,
        type: "jpg",
        transformation: { width, height },
      }),
    ],
  });
}

function uiImageParagraph(screenId, width = 520, height = 300) {
  const file = join(screenshotDir, `${screenId}.png`);
  if (!existsSync(file)) {
    return body(`(Screen preview: ${UI_SCREENS[screenId] ?? screenId})`, { italics: true });
  }
  const data = readFileSync(file);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        data,
        type: "png",
        transformation: { width: Math.min(width, 480), height: Math.min(height, 280) },
      }),
    ],
  });
}

async function tryLaunchBrowser() {
  try {
    return await puppeteer.launch({ headless: true });
  } catch {
    return null;
  }
}

async function ensureUiScreenshots(indexHtml) {
  mkdirSync(screenshotDir, { recursive: true });
  const needed = Object.keys(UI_SCREENS);
  const missing = needed.filter((id) => !existsSync(join(screenshotDir, `${id}.png`)));
  if (!missing.length) return;

  const browser = await tryLaunchBrowser();
  if (!browser) {
    console.warn("Skipping UI screenshots — Chrome not available for Puppeteer.");
    return;
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });

  for (const id of missing) {
    await page.goto(`${pathToFileURL(indexHtml).href}#/${id}`, {
      waitUntil: "networkidle0",
    });
    await page.waitForFunction(
      (screenId) => {
        const screen = document.getElementById(`s-${screenId}`);
        return screen && screen.classList.contains("on");
      },
      {},
      id,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    const app = await page.$("#app");
    if (!app) throw new Error("Could not find #app for screenshot");
    await app.screenshot({ path: join(screenshotDir, `${id}.png`) });
  }
  await browser.close();
}

async function pdfPreviewPath(absPath) {
  mkdirSync(sourcePreviewDir, { recursive: true });
  const base = absPath.replace(/[^a-zA-Z0-9]+/g, "_").slice(-80);
  const out = join(sourcePreviewDir, `${base}.png`);
  if (existsSync(out)) return out;

  const browser = await tryLaunchBrowser();
  if (!browser) return null;

  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1 });
  try {
    await page.goto(pathToFileURL(absPath).href, { waitUntil: "networkidle0", timeout: 30_000 });
    await new Promise((resolve) => setTimeout(resolve, 800));
    await page.screenshot({ path: out, fullPage: false });
    await browser.close();
    return out;
  } catch {
    await browser.close();
    return null;
  }
}

function friendlyFileTitle(relPath) {
  const name = relPath.split("/").pop() ?? relPath;
  const map = {
    "HIRA Front Page 1 .jpeg": "Risk assessment (HIRA) — cover page",
    "HIRA Page 2.jpeg": "Risk assessment (HIRA) — hazard details",
    "HIRA Page 3.jpeg": "Risk assessment (HIRA) — sign-off page",
    "Permit to Work Front Page .jpeg": "Permit to work — front page",
    "Permit to Work Back Page.jpeg": "Permit to work — back page (gas tests)",
    "Rescue Plan Front Page.jpeg": "Rescue plan — front page",
    "Confined Space Rescue Plan Back page.jpeg": "Rescue plan — location sketch",
    "CS Check List Page 1.jpeg": "Confined space checklist — page 1",
    "CS Check List Page 2 .jpeg": "Confined space checklist — page 2",
    "CS Check List Page 3 .jpeg": "Confined space checklist — page 3",
    "Contractor Clearence to work main page.jpeg": "Contractor clearance — main form",
    "Contract Authorisation Front Page.jpeg": "Contractor clearance — cover page",
    "IMSF 100 - Confined spaces checklist .docx": "IMSF 100 checklist (Word file)",
    "IMSF 061 - Process HIRA Master (1).docx": "HIRA master template (Word file)",
    "Toolbox Talk - Confined Spaces.docx": "Toolbox talk — confined spaces",
    "Confined Space Rescue Plan.pdf": "Rescue plan (PDF)",
    "Tarmac Special Permit Confined Space.pdf": "Confined space permit (PDF)",
    "STAN-17E Hazard Identification Risk Assessment (1).pdf": "Hazard assessment standard (PDF)",
    "Copy of A3 PTW 2020.xlsx": "Permit to work template (Excel)",
  };
  return map[name] ?? name.replace(/\.[^.]+$/, "");
}

function fileBlurb(relPath, kind) {
  if (kind === "job_checklist") {
    return "This checklist page is read by AI. Each yes/no question becomes one line in a Job Checklist content pack in SafeIn5.";
  }
  const lower = relPath.toLowerCase();
  if (lower.includes("rams") || lower.includes("hira")) {
    return "This risk assessment scan is stored in the document library with its kind, title, and reference number pre-filled from the page.";
  }
  if (lower.includes("permit")) {
    return "This permit scan is stored as a permit-to-work document. The permit number and work description are taken from the page.";
  }
  if (lower.includes("rescue")) {
    return "This rescue plan scan is stored as a rescue-plan document and linked to the confined space on the task.";
  }
  if (lower.includes("contractor")) {
    return "This contractor clearance scan is stored as a supporting document in the document library.";
  }
  return "This scan is stored in the SafeIn5 document library with fields pre-filled from the page.";
}

function screensForFile(kind) {
  if (kind === "job_checklist") {
    return [
      {
        id: "content-new",
        caption: "Checklist title and each question appear on the Job Checklist upload screen.",
      },
      {
        id: "content-attach",
        caption: "The completed checklist pack is attached to the task.",
      },
    ];
  }
  return [
    {
      id: "doc-new",
      caption: "Document kind, title, and reference are pre-filled when this scan is uploaded.",
    },
    {
      id: "doc-attach",
      caption: "The document is attached to the task or work area.",
    },
  ];
}

function documentPlainRows(kind, data) {
  const rows = [];
  const add = (label, value) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value) && !value.length) return;
    rows.push([label, String(value)]);
  };

  if (kind === "job_checklist") {
    add("Checklist title", data.title);
    add("Form reference", data.source_reference);
    add("Page", data.page_label);
    add("Number of questions on this page", data.prompts?.length);
    const answers = (data.filled_answers ?? []).filter((a) => a.answer);
    if (answers.length) {
      add(
        "Handwritten answers on this page (for your review)",
        answers
          .slice(0, 5)
          .map((a) => `Q${a.sort_order}: ${a.answer}${a.comment ? ` — ${a.comment}` : ""}`)
          .join("; "),
      );
    }
    return rows;
  }

  add("Document type", DOC_KIND_LABEL[data.document_kind] ?? data.document_kind);
  add("Document reference", data.rams_reference ?? data.task_reference);
  add("Document title / work description", data.work_description);
  if (data.space) add("Work area named on page", data.space);
  if (data.dates?.starts || data.dates?.ends) {
    add("Dates on page", [data.dates.starts, data.dates.ends].filter(Boolean).join(" to "));
  }
  return rows;
}

function sampleDetailParagraphs(kind, data) {
  const out = [];
  if (kind === "learn5" && data.items?.length) {
    out.push(h3("Sample teaching points"));
    for (const item of data.items.slice(0, 4)) {
      out.push(bullet(`${item.headline}${item.body ? ` — ${item.body}` : ""}`));
    }
    if (data.items.length > 4) {
      out.push(body(`… and ${data.items.length - 4} more items.`, { italics: true }));
    }
  }
  return out;
}

const CHECKLIST_PAGE_ORDER = [
  "Confiend Space Check List/CS Check List Page 1.jpeg",
  "Confiend Space Check List/CS Check List Page 2 .jpeg",
  "Confiend Space Check List/CS Check List Page 3 .jpeg",
];

function collectTopChecklistPrompts(checklistRows, limit = 10) {
  const pageRank = new Map(CHECKLIST_PAGE_ORDER.map((f, i) => [f, i]));
  const merged = [];

  for (const row of checklistRows) {
    const pageIndex = pageRank.get(row.file.replace(/\\/g, "/")) ?? 99;
    for (const prompt of row.extracted?.prompts ?? []) {
      merged.push({
        pageIndex,
        sort_order: prompt.sort_order ?? 999,
        priority: prompt.priority ?? pageIndex * 100 + (prompt.sort_order ?? 999),
        body_text: prompt.body_text,
        mandatory: prompt.mandatory,
      });
    }
  }

  merged.sort((a, b) => a.priority - b.priority || a.pageIndex - b.pageIndex || a.sort_order - b.sort_order);

  const seen = new Set();
  const unique = [];
  for (const item of merged) {
    const key = item.body_text?.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  return unique.map((item, index) => ({
    displayPriority: index + 1,
    ...item,
  }));
}

async function addChecklistPartB(children, checklist, sampleRoot) {
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("Part B — Checklist pages"));
  children.push(
    body(
      "The IMSF 100 confined space checklist was read across three scanned pages. Below are the top 10 highest-priority questions for the Job Checklist in SafeIn5.",
    ),
  );

  const topTen = collectTopChecklistPrompts(checklist, 10);
  if (topTen.length) {
    children.push(h2("Top 10 priority questions"));
    children.push(
      clientTable(
        ["Priority", "Question"],
        topTen.map((p) => [String(p.displayPriority), p.body_text]),
        [12, 88],
      ),
    );
    children.push(
      body(
        `AI ranked ${checklist.reduce((n, r) => n + (r.extracted?.prompts?.length ?? 0), 0)} questions across all checklist pages; only the 10 most safety-critical are shown here.`,
        { italics: true },
      ),
    );
  }

  for (const row of checklist) {
    const absPath = join(sampleRoot, row.file);
    const title = friendlyFileTitle(row.file);
    const data = row.extracted ?? {};

    children.push(h2(title));
    children.push(body(`File: ${row.file}`));
    const sourceBlocks = await sourceImageBlock(absPath, row.file);
    children.push(...sourceBlocks);

    children.push(h3("Summary for this page"));
    const rows = documentPlainRows("job_checklist", data);
    if (rows.length) {
      children.push(clientTable(["On your paper", "What we captured"], rows, [38, 62]));
    }
  }

  children.push(h3("Where this appears in SafeIn5"));
  for (const screen of screensForFile("job_checklist")) {
    children.push(body(UI_SCREENS[screen.id] ?? screen.id, { bold: true }));
    children.push(body(screen.caption));
    children.push(uiImageParagraph(screen.id, 500, 290));
  }
}

const SEED_FILE_ORDER = [
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
];

function filterHandoffFiles(files) {
  const order = new Map(SEED_FILE_ORDER.map((f, i) => [f, i]));
  return files
    .filter(
      (f) =>
        !f.error &&
        !f.file.includes(".DS_Store") &&
        SEED_SOURCE_FILES.has(f.file.replace(/\\/g, "/")),
    )
    .sort(
      (a, b) =>
        (order.get(a.file.replace(/\\/g, "/")) ?? 99) -
        (order.get(b.file.replace(/\\/g, "/")) ?? 99),
    );
}

async function sourceImageBlock(absPath, relPath) {
  const lower = absPath.toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(lower)) {
    return [h3("Your document"), await scaledImageParagraph(absPath)];
  }
  if (lower.endsWith(".pdf")) {
    const preview = await pdfPreviewPath(absPath);
    if (preview) {
      return [h3("Your document (first page)"), await scaledImageParagraph(preview)];
    }
  }
  const ext = relPath.split(".").pop()?.toUpperCase() ?? "FILE";
  return [
    h3("Your document"),
    body(`Source file: ${relPath}`, { bold: true }),
    body(
      `This is a ${ext} file rather than a photo scan. AI read the text inside the file. If you have a scanned image of the same page, that can be uploaded to SafeIn5 as the document attachment.`,
      { italics: true },
    ),
  ];
}

function groupFiles(files) {
  const jobPack = [];
  const checklist = [];
  for (const row of files) {
    if (row.kind === "job_checklist") checklist.push(row);
    else jobPack.push(row);
  }
  return { jobPack, checklist };
}

export async function writeClientExtractionDoc({ results, sampleRoot, outputDocx, indexHtml }) {
  await ensureUiScreenshots(indexHtml);

  const included = filterHandoffFiles(results.files);
  const { jobPack, checklist } = groupFiles(included);

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2200, after: 300 },
      children: [new TextRun({ text: "SafeIn5", bold: true, size: 56 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "AI extraction from your job pack scans",
          bold: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: "What we read from each page and where it appears in SafeIn5",
          italics: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    h1("1. What this document is for"),
    body(
      "We used AI to read the scanned pages from your sample job pack. This report covers only those scans — the same pages used to pre-fill documents and checklist content in SafeIn5.",
    ),
    body(
      "For each page you will see: the original scan, what we read from it, and the SafeIn5 upload screen where that information appears.",
    ),
    bullet(`${jobPack.length} document scans (RAMS, permit, rescue plan, contractor clearance)`),
    bullet(`${checklist.length} checklist pages (IMSF 100 confined space checklist)`),

    h1("2. Where extracted data goes in SafeIn5"),
    h2("A. Document scans → Upload a document"),
    body(
      "Permits, risk assessments, rescue plans, and clearance forms are uploaded to the document library. AI pre-fills the document kind, title, and reference.",
    ),
    uiImageParagraph("doc-new", 480, 280),
    h2("B. Checklist pages → Upload content (Job Checklist)"),
    body(
      "Each yes/no question on the IMSF checklist becomes one prompt in a Job Checklist content pack.",
    ),
    uiImageParagraph("content-new", 480, 280),
  ];

  async function addFileSection(row) {
    const absPath = join(sampleRoot, row.file);
    const title = friendlyFileTitle(row.file);
    const data = row.extracted ?? {};

    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(h1(title));
    children.push(body(`File: ${row.file}`));
    children.push(body(fileBlurb(row.file, row.kind)));

    const sourceBlocks = await sourceImageBlock(absPath, row.file);
    children.push(...sourceBlocks);

    children.push(h3("What we read from this page"));
    const rows = documentPlainRows(row.kind, data);
    if (rows.length) {
      children.push(clientTable(["On your paper", "What we captured"], rows, [38, 62]));
    } else {
      children.push(body("No document fields were found on this page.", { italics: true }));
    }

    children.push(h3("Where this appears in SafeIn5"));
    for (const screen of screensForFile(row.kind)) {
      children.push(body(UI_SCREENS[screen.id] ?? screen.id, { bold: true }));
      children.push(body(screen.caption));
      children.push(uiImageParagraph(screen.id, 500, 290));
    }
  }

  if (jobPack.length) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(h1("Part A — Document scans"));
    children.push(
      body("Each scan below is uploaded as a document with kind, title, and reference pre-filled."),
    );
    for (const row of jobPack) await addFileSection(row);
  }

  if (checklist.length) {
    await addChecklistPartB(children, checklist, sampleRoot);
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("Summary"));
  children.push(
    body(
      `We processed ${included.length} scanned pages from your job pack. Please check the values in the tables — especially handwritten permit numbers, dates, and reference numbers — and tell us if anything needs correcting.`,
    ),
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputDocx, buffer);
  console.log(`Wrote ${outputDocx}`);
}
