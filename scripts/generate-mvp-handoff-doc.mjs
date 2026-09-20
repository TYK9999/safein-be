import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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

import { checklist, documents, people } from "./generate-sample-job-pack.mjs";

const root = resolve(import.meta.dirname, "..");
const indexHtml = join(root, "docs", "index.html");
const outputDocx = join(
  root,
  "docs",
  "SafeIn5_MVP_Job_Pack_Extraction_Handoff.docx",
);
const screenshotDir = join(root, "docs", ".handoff-screenshots");
const sampleDocRoot = join(root, "docs", "sample documents");

const CLIENT = "Tarmac";
const SITE = "Dolyhir";
const SPACE = "Hot Aggregate Bins";
const TASK_REF = "098001";
const RAMS_REF = "HOTBINSRA01";
const MS_SOP = "HOTBINSMS01";
const TASK_TYPE = "Confined space entry";
const CHECKLIST_TITLE = "IMSF 100 — Confined Spaces Checklist";

const SITE_ROLE_LABEL = {
  site_manager: "Site Manager",
  supervisor: "Supervisor",
  worker: "Worker",
};

const MVP_DOC_KIND = {
  "RAMS or HIRA": "Risk assessment (HIRA / RAMS)",
  "Permit to work": "Permit to work",
  "Rescue plan": "Rescue plan",
  Checklist: "Checklist",
  "(no matching document kind)": "Other (contractor clearance)",
};

const SCREENSHOTS = [
  { id: "tenant-new", label: "Add a client", sheet: "01_client" },
  { id: "tenant-invite", label: "Invite an administrator", sheet: "02_client_admin" },
  { id: "site-new", label: "Add a site", sheet: "03_site" },
  { id: "space-new", label: "Add a space", sheet: "04_space" },
  { id: "user-new", label: "Invite a person", sheet: "05_person" },
  { id: "job-new", label: "Create a task", sheet: "06_task" },
  { id: "doc-new", label: "Upload a document", sheet: "08_document" },
  { id: "doc-attach", label: "Attach a document", sheet: "09_document_attach" },
  { id: "content-new", label: "Upload checklist content", sheet: "10_content" },
  { id: "attached", label: "Task attachments", sheet: "task_content" },
  { id: "content-attach", label: "Attach content", sheet: "11_content_attach" },
];

const SOURCE_FOLDERS = [
  {
    name: "RAMS",
    purpose: "Risk assessment (HIRA)",
    files: "HIRA Front Page 1, pages 2–3",
  },
  {
    name: "Permit To Work",
    purpose: "Work permit",
    files: "Front and back of permit 098001",
  },
  {
    name: "Rescue Plan",
    purpose: "Confined space rescue plan",
    files: "Front page and back page",
  },
  {
    name: "Confined Space Check List",
    purpose: "IMSF job checklist",
    files: "Checklist pages 1–3",
  },
  {
    name: "Contractor Approval",
    purpose: "Clearance to work",
    files: "Authorisation and clearance pages",
  },
];

function personDisplayName({ first, last }) {
  return `${first} ${last}`.trim();
}

function mvpDocumentKind(doc) {
  return MVP_DOC_KIND[doc.uiType] ?? doc.uiType;
}

function placementScopeLabel(scope) {
  if (scope === "work_task") return "Task";
  if (scope === "space") return "Space";
  return scope;
}

function placementTarget(scope) {
  return scope === "work_task" ? TASK_REF : SPACE;
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } });
}

function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}

function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 100 } });
}

function body(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: options.bold, italics: options.italics })],
  });
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

function table(headers, rows, widths) {
  const headerRow = new TableRow({
    children: headers.map(
      (text, index) =>
        new TableCell({
          width: widths?.[index] ? { size: widths[index], type: WidthType.PERCENTAGE } : undefined,
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
              width: widths?.[index] ? { size: widths[index], type: WidthType.PERCENTAGE } : undefined,
              children: [new Paragraph(String(text ?? ""))],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function imageParagraph(filePath, width = 520, height = 340) {
  const data = readFileSync(filePath);
  const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpg";
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        data,
        type: ext,
        transformation: { width, height },
      }),
    ],
  });
}

async function captureScreenshots() {
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });

  /** @type {Record<string, string>} */
  const paths = {};
  for (const shot of SCREENSHOTS) {
    await page.goto(`${pathToFileURL(indexHtml).href}#/${shot.id}`, {
      waitUntil: "networkidle0",
    });
    await page.waitForFunction(
      (id) => {
        const screen = document.getElementById(`s-${id}`);
        return screen && screen.classList.contains("on");
      },
      {},
      shot.id,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    const file = join(screenshotDir, `${shot.id}.png`);
    const app = await page.$("#app");
    if (!app) throw new Error("Could not find #app for screenshot");
    await app.screenshot({ path: file });
    paths[shot.id] = file;
  }
  await browser.close();
  return paths;
}

function buildSheetSections(screenshotPaths) {
  const hiraDoc = documents.find((doc) => doc.docType === "risk_assessment");
  const taskLead = people.find((person) => person.email.includes("marshall"));
  const sections = [];

  const addSheet = (title, sheetName, screenId, intro, tableBlock, extra = []) => {
    sections.push(
      h2(`${sheetName} — ${title}`),
      body(intro),
      h3("SafeIn5 screen"),
      imageParagraph(screenshotPaths[screenId], 520, 300),
      h3("What we read from your job pack"),
      tableBlock,
      ...extra,
      new Paragraph({ children: [new PageBreak()] }),
    );
  };

  addSheet(
    "Client (organisation)",
    "01_client",
    "tenant-new",
    "This is where the client organisation is set up in SafeIn5. We copied the client name from the paperwork headers and logos.",
    table(
      ["Field on screen", "Value in Excel", "Found on papers?"],
      [
        ["Client name", CLIENT, "Yes — Tarmac logo on all scans"],
        ["Domain or general address", "(blank)", "No"],
        ["Status", "(blank)", "No"],
        ["Echo records retention", "(blank)", "No"],
        ["Media retention", "(blank)", "No"],
      ],
      [34, 26, 40],
    ),
  );

  addSheet(
    "Client administrator",
    "02_client_admin",
    "tenant-invite",
    "This step invites someone at the client to manage their own sites and people. No administrator details appeared on the scanned job pack, so this sheet is left empty for you to complete.",
    table(
      ["Field on screen", "Value in Excel", "Found on papers?"],
      [
        ["Client", "(blank)", "No"],
        ["Name", "(blank)", "No"],
        ["Email", "(blank)", "No"],
      ],
      [34, 26, 40],
    ),
  );

  addSheet(
    "Site",
    "03_site",
    "site-new",
    "The site is the physical location where the work takes place. Names were taken from the permit and rescue plan.",
    table(
      ["Field on screen", "Value in Excel", "Found on papers?"],
      [
        ["Site name", SITE, "Yes — HIRA and permit"],
        ["Site location", "(blank)", "No — not clearly on these scans"],
        ["Site Manager", "JA Byrne", "Yes — permit issuer"],
        ["Supervisor", "J Abrahams", "Yes — rescue plan supervisor"],
      ],
      [34, 26, 40],
    ),
  );

  addSheet(
    "Space",
    "04_space",
    "space-new",
    "A space is the specific work area inside the site — here, the hot aggregate bins where confined-space work happens.",
    table(
      ["Field on screen", "Value in Excel", "Found on papers?"],
      [
        ["Space name", SPACE, "Yes — rescue plan title"],
        ["Location on site", "Asphalt Plant, mixer house level 3", "Yes — rescue plan back page"],
        ["Site", SITE, "Yes — links to site above"],
        ["Task type", TASK_TYPE, "Yes — permit type"],
        ["Permit required before work can start", "Yes", "Yes — permit raised"],
        ["This space should carry a rescue plan", "Yes", "Yes — rescue plan supplied"],
      ],
      [34, 26, 40],
    ),
  );

  addSheet(
    "People",
    "05_person",
    "user-new",
    "Everyone named on the permit, rescue plan, and contractor clearance appears here. Email addresses were not on the papers, so those cells are blank for you to add before inviting people into SafeIn5.",
    table(
      ["Name", "Role on site", "Email in Excel", "Where we found the name"],
      people.map((person) => [
        personDisplayName(person),
        SITE_ROLE_LABEL[person.siteRole] ?? "",
        "(blank)",
        person.source,
      ]),
      [22, 18, 16, 44],
    ),
    [
      body(
        "There is no separate crew sheet. Workers on the permit are listed here and linked to the task when the data is loaded into SafeIn5.",
        { italics: true },
      ),
    ],
  );

  addSheet(
    "Task (work permit)",
    "06_task",
    "job-new",
    "This is the digital version of permit 098001 and its supporting references.",
    table(
      ["Field on screen", "Value in Excel", "Found on papers?"],
      [
        ["Task reference", TASK_REF, "Yes — permit number"],
        ["RAMS document", hiraDoc?.title ?? "", "Yes — HIRA title"],
        ["RAMS reference number", RAMS_REF, "Yes — HIRA"],
        ["Permit reference type", "Confined Space; Hot Work", "Yes — permit front"],
        ["Permit reference number", TASK_REF, "Yes — permit"],
        ["MS/SOP number", MS_SOP, "Yes — permit"],
        ["What is the work", "Repairs in Asphalt Plant Hot Agg Bins", "Yes — permit"],
        ["Space", SPACE, "Yes — links to space above"],
        ["Task Lead", taskLead ? personDisplayName(taskLead) : "", "Yes — contractor clearance"],
        ["Starts", "13 Jun 2026 06:00", "Yes — permit"],
        ["Runs for", "2 days", "Yes — permit"],
        ["Permit required before work can start", "Yes", "Yes — permit"],
      ],
      [34, 26, 40],
    ),
  );

  addSheet(
    "Documents",
    "08_document",
    "doc-new",
    "Each scanned document is listed once with its file name, document kind, and paper reference number.",
    table(
      ["File from job pack", "Document kind", "Reference"],
      documents.map((doc) => [
        doc.files.split(";")[0].trim(),
        mvpDocumentKind(doc),
        doc.paperReference,
      ]),
      [40, 30, 30],
    ),
  );

  addSheet(
    "Document attachments",
    "09_document_attach",
    "doc-attach",
    "This shows where each document belongs — on the task, on the space, or elsewhere.",
    table(
      ["Document", "Applies to", "Attached to"],
      documents.map((doc) => [
        doc.title,
        placementScopeLabel(doc.scope),
        placementTarget(doc.scope),
      ]),
      [44, 18, 38],
    ),
  );

  const checklistPreview = checklist.slice(0, 6).map(([, prompt]) => prompt);
  addSheet(
    "Checklist content",
    "10_content",
    "content-new",
    `The confined-space checklist was transcribed line by line. The Excel workbook contains all ${checklist.length} checklist prompts; a sample is shown below.`,
    table(
      ["Checklist title", "Content kind", "Example prompt"],
      [
        [CHECKLIST_TITLE, "Job Checklist", checklistPreview[0]],
        ...checklistPreview.slice(1).map((prompt) => ["", "", prompt]),
        ["", "", `… plus ${checklist.length - checklistPreview.length} more rows in the Excel file`],
      ],
      [28, 18, 54],
    ),
  );

  addSheet(
    "Task checklist settings",
    "task_content",
    "attached",
    "This sheet links checklist prompts to a specific task and sets rules such as mandatory or critical. It is left empty in this first pass and can be completed in a later setup step.",
    table(
      ["Field on screen", "Value in Excel", "Notes"],
      [
        ["Task", "(blank)", "Filled in a later phase"],
        ["Content kind", "(blank)", "Filled in a later phase"],
        ["Prompt text", "(blank)", "Filled in a later phase"],
      ],
      [34, 26, 40],
    ),
  );

  addSheet(
    "Attach content",
    "11_content_attach",
    "content-attach",
    "This step attaches uploaded checklist content to a space or task. It is also left empty for a later phase.",
    table(
      ["Field on screen", "Value in Excel", "Notes"],
      [
        ["Content", "(blank)", "Filled in a later phase"],
        ["Attach to", "(blank)", "Filled in a later phase"],
        ["Target name", "(blank)", "Filled in a later phase"],
      ],
      [34, 26, 40],
    ),
  );

  return sections;
}

async function main() {
  console.log("Capturing MVP screen screenshots from docs/index.html …");
  const screenshotPaths = await captureScreenshots();

  const sampleImages = [
    join(sampleDocRoot, "RAMS", "HIRA Front Page 1 .jpeg"),
    join(sampleDocRoot, "Permit To Work", "Permit to Work Front Page .jpeg"),
    join(sampleDocRoot, "Rescue Plan", "Rescue Plan Front Page.jpeg"),
    join(sampleDocRoot, "Confiend Space Check List", "CS Check List Page 1.jpeg"),
    join(
      sampleDocRoot,
      "Contractor Approval",
      "Contractor Clearence to work main page.jpeg",
    ),
  ];

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 400 },
      children: [
        new TextRun({ text: "SafeIn5", bold: true, size: 56 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Job pack data extraction handoff",
          bold: true,
          size: 40,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "How your paper job pack became the MVP Excel workbook",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [
        new TextRun({ text: `Sample pack: ${CLIENT} · ${SITE} · permit ${TASK_REF}`, italics: true }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    h1("1. Purpose of this document"),
    body(
      "This document explains how we turned your scanned job pack into the attached Excel file, SafeIn5_MVP_Resource_Fields.xlsx. It is written for review by your team — no technical background is needed.",
    ),
    body(
      "The Excel file is a structured copy of what someone would type into SafeIn5 when setting up the same job digitally: the client, site, work area, people, permit, documents, and checklist questions.",
    ),

    h1("2. What you received"),
    bullet("SafeIn5_MVP_Resource_Fields.xlsx — eleven worksheets, one row per fact from the job pack"),
    bullet("This Word document — how each worksheet maps to SafeIn5 screens and what came from your papers"),
    body(
      "Values were taken only from the scans. Where the paperwork did not contain a field (for example email addresses), the Excel cell is left blank for you to complete.",
    ),

    h1("3. Source job pack"),
    body(
      `We used the sample job pack in the folder “sample documents”, covering permit ${TASK_REF} at ${SITE} for ${CLIENT}. The pack contains five document types:`,
    ),
    table(
      ["Folder", "What it contains", "Example files"],
      SOURCE_FOLDERS.map((folder) => [folder.name, folder.purpose, folder.files]),
      [24, 32, 44],
    ),
    h3("Pages we read"),
    ...sampleImages.flatMap((imagePath, index) => [
      body(SOURCE_FOLDERS[index].name, { bold: true }),
      imageParagraph(imagePath, 300, 420),
    ]),

    new Paragraph({ children: [new PageBreak()] }),

    h1("4. How we created the Excel file"),
    body("The process is the same for this sample pack and for any future job pack you supply in the same folder layout."),
    bullet("Step 1 — Collect the scanned job pack (RAMS, permit, rescue plan, checklist, contractor clearance)."),
    bullet("Step 2 — Read names, references, dates, locations, and checklist questions directly from each page."),
    bullet("Step 3 — Match each fact to the field a user would fill in on the SafeIn5 back-office screens."),
    bullet("Step 4 — Write those values into the correct worksheet in SafeIn5_MVP_Resource_Fields.xlsx."),
    bullet("Step 5 — Leave blank anything that was not on the papers (emails, retention settings, administrator invite)."),
    bullet("Step 6 — Review the workbook with you before loading the data into SafeIn5."),
    body(
      "For additional job packs, place scans under a task folder (for example documents/task_2/) using the same document types. We can repeat this process and add rows to the workbook without changing its structure.",
    ),

    h1("5. How the Excel worksheets map to SafeIn5"),
    body("Each worksheet corresponds to a screen in the SafeIn5 MVP back office. The next section shows each screen and the values we extracted."),
    table(
      ["Excel worksheet", "SafeIn5 screen", "What it holds"],
      [
        ["01_client", "Add a client", "Organisation name"],
        ["02_client_admin", "Invite an administrator", "Client admin contact"],
        ["03_site", "Add a site", "Site name and managers"],
        ["04_space", "Add a space", "Work area inside the site"],
        ["05_person", "Invite a person", "People named on the pack"],
        ["06_task", "Create a task", "Permit and work details"],
        ["08_document", "Upload a document", "Each scanned file"],
        ["09_document_attach", "Attach a document", "Where each document belongs"],
        ["10_content", "Upload checklist content", "Checklist questions"],
        ["task_content", "Task checklist settings", "Rules per checklist item (later phase)"],
        ["11_content_attach", "Attach content", "Link checklist to task/space (later phase)"],
      ],
      [22, 28, 50],
    ),

    new Paragraph({ children: [new PageBreak()] }),

    h1("6. Worksheet-by-worksheet detail"),
    ...buildSheetSections(screenshotPaths),

    h1("7. What we still need from you"),
    bullet("Email addresses for each person on worksheet 05_person"),
    bullet("Client administrator name and email on worksheet 02_client_admin (if you want someone to sign in)"),
    bullet("Optional site location on worksheet 03_site if you want it shown in SafeIn5"),
    bullet("Any retention or status settings on worksheet 01_client if required for your demo"),
    body(
      "Worksheets task_content and 11_content_attach are intentionally empty in this first delivery and will be completed in a later setup step.",
    ),

    h1("8. Summary"),
    body(
      `We extracted a complete digital picture of permit ${TASK_REF} from your paper job pack: one client, one site, one space, five people, one task, five documents, and ${checklist.length} checklist prompts. The attached Excel file is ready for your review; blank cells mark items only your team can supply.`,
    ),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputDocx, buffer);
  console.log(`Wrote ${outputDocx}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
