import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeXlsx } from "./lib/xlsx.mjs";
import { checklist, documents, people } from "./generate-sample-job-pack.mjs";

/**
 * MVP resource fields the user types or selects on create/edit forms only.
 * Maximum extracted-value coverage from docs/sample documents/ scans.
 * Blanks = not on papers (emails, retention, admin invite).
 *
 * LOCKED: 11 resource sheets only — do not add or remove tabs.
 *   node scripts/generate-mvp-resource-fields-workbook.mjs
 */
const root = resolve(import.meta.dirname, "..");
const output = join(
  root,
  "docs",
  "template",
  process.env.MVP_WORKBOOK_OUTPUT ?? "SafeIn5_MVP_Resource_Fields.xlsx",
);
const sampleDocRoot = "docs/sample documents";

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

/** Maps extraction manifest uiType → MVP upload dropdown label. */
const MVP_DOC_KIND = {
  "RAMS or HIRA": "Risk assessment (HIRA / RAMS)",
  "Permit to work": "Permit to work",
  "Rescue plan": "Rescue plan",
  Checklist: "Checklist",
  "(no matching document kind)": "Other (contractor clearance)",
};

function personDisplayName({ first, last }) {
  return `${first} ${last}`.trim();
}

function documentFilePath(doc) {
  const firstFile = doc.files.split(";")[0].trim();
  return `${sampleDocRoot}/${firstFile}`;
}

function mvpDocumentKind(doc) {
  return MVP_DOC_KIND[doc.uiType] ?? doc.uiType;
}

function placementScopeLabel(scope) {
  if (scope === "work_task") {
    return "Task";
  }
  if (scope === "space") {
    return "Space";
  }
  return scope;
}

function placementTarget(scope) {
  return scope === "work_task" ? TASK_REF : SPACE;
}

/** @param {string} ui @param {{ required?: boolean, choices?: string }} [options] */
function field(ui, options = {}) {
  return {
    ui,
    required: options.required ? "Yes" : "No",
    choices: options.choices ?? "",
  };
}

/** @type {Array<{ sheet: string, title: string, screen: string, actor: string, prerequisites: string, fields: ReturnType<typeof field>[] }>} */
const resources = [
  {
    sheet: "01_client",
    title: "Client (organisation)",
    screen: "s-tenant-new · s-tenant",
    actor: "SafeIn5 admin",
    prerequisites: "None",
    fields: [
      field("Client name *", { required: true }),
      field("Domain or general address"),
      field("Status", { choices: "Active | Inactive" }),
      field("Echo records retention", {
        choices: "7 years | 3 years | 10 years | indefinitely",
      }),
      field("Media retention", {
        choices: "2 years | 1 year | 5 years | Match Echo record",
      }),
    ],
  },
  {
    sheet: "02_client_admin",
    title: "Client administrator (invite)",
    screen: "s-tenant-invite",
    actor: "SafeIn5 admin",
    prerequisites: "01_client",
    fields: [
      field("Client *", { required: true }),
      field("Name *", { required: true }),
      field("Email *", { required: true }),
    ],
  },
  {
    sheet: "03_site",
    title: "Site",
    screen: "s-site-new",
    actor: "Client admin / SafeIn5 admin",
    prerequisites: "01_client · people for managers",
    fields: [
      field("Site name *", { required: true }),
      field("Site location"),
      field("Site Manager *", { required: true }),
      field("Supervisor"),
    ],
  },
  {
    sheet: "04_space",
    title: "Space",
    screen: "s-space-new",
    actor: "Client admin / supervisor",
    prerequisites: "03_site",
    fields: [
      field("Space name *", { required: true }),
      field("Location on site"),
      field("Site *", { required: true }),
      field("Task type"),
      field("Permit required before work can start", {
        choices: "Yes | No",
      }),
      field("This space should carry a rescue plan", {
        choices: "Yes | No",
      }),
    ],
  },
  {
    sheet: "05_person",
    title: "Person (invite)",
    screen: "s-user-new",
    actor: "Client admin",
    prerequisites: "03_site",
    fields: [
      field("Name *", { required: true }),
      field("Email *", { required: true }),
      field("Country code", { choices: "+44 UK | +1 US | +91 IN | +61 AU" }),
      field("Phone number"),
      field("Site"),
      field("Role on site", {
        choices: "Worker | Supervisor | Site Manager",
      }),
    ],
  },
  {
    sheet: "06_task",
    title: "Task (work permit / job)",
    screen: "s-job-new",
    actor: "Client admin / supervisor",
    prerequisites: "04_space · documents · people",
    fields: [
      field("Start from an existing task"),
      field("Task reference *", { required: true }),
      field("RAMS document *", { required: true }),
      field("RAMS reference number *", { required: true }),
      field("Permit reference type *", { required: true }),
      field("Permit reference number *", { required: true }),
      field("MS/SOP number"),
      field("What is the work"),
      field("Space *", { required: true }),
      field("Task Lead *", { required: true }),
      field("Starts"),
      field("Runs for"),
      field("Permit required before work can start", {
        choices: "Yes | No",
      }),
    ],
  },
  {
    sheet: "08_document",
    title: "Document (upload)",
    screen: "s-doc-new",
    actor: "Client admin / supervisor",
    prerequisites: "01_client",
    fields: [
      field("File *", { required: true }),
      field("Client"),
      field("What kind of document is it? *", { required: true }),
      field("Reference"),
    ],
  },
  {
    sheet: "09_document_attach",
    title: "Attach document",
    screen: "s-doc-attach · s-attached (Documents)",
    actor: "Client admin / supervisor",
    prerequisites: "08_document",
    fields: [
      field("Document *", { required: true }),
      field("Applies to *", {
        required: true,
        choices: "Client | Site | Space | Task",
      }),
      field("Target name *", { required: true }),
    ],
  },
  {
    sheet: "10_content",
    title: "Content (upload)",
    screen: "s-content-new",
    actor: "SafeIn5 admin / Client admin",
    prerequisites: "None",
    fields: [
      field("Files *", { required: true }),
      field("Title *", { required: true }),
      field("Which kind of content is this? *", {
        required: true,
        choices: "Job Checklist | Learn 5",
      }),
      field("Check / prompt text *", { required: true }),
    ],
  },
  {
    sheet: "task_content",
    title: "Task content settings",
    screen: "s-attached (Job Checklist · Learn 5)",
    actor: "Client admin / supervisor",
    prerequisites: "06_task · 10_content",
    fields: [
      field("Task *", { required: true }),
      field("Content kind *", {
        required: true,
        choices: "Job Checklist | Learn 5 | Uncover | Shift",
      }),
      field("Prompt text *", { required: true }),
      field("Critical", { choices: "Yes | No" }),
      field("Mandatory", { choices: "Yes | No" }),
      field("If it fails, ask what is missing"),
      field("Shown with which Job Checklist check"),
    ],
  },
  {
    sheet: "11_content_attach",
    title: "Attach content",
    screen: "s-content-attach",
    actor: "Client admin / supervisor",
    prerequisites: "10_content",
    fields: [
      field("Content *", { required: true }),
      field("Attach to *", {
        required: true,
        choices: "Space | Task",
      }),
      field("Target name *", { required: true }),
    ],
  },
];

/** Final workbook tabs — fixed order; never add or remove sheets. */
const SHEET_ORDER = [
  "01_client",
  "02_client_admin",
  "03_site",
  "04_space",
  "05_person",
  "06_task",
  "08_document",
  "09_document_attach",
  "10_content",
  "task_content",
  "11_content_attach",
];

const hiraDoc = documents.find((doc) => doc.docType === "risk_assessment");
const checklistDoc = documents.find((doc) => doc.docType === "checklist");
const taskLead = people.find((person) => person.email.includes("marshall"));

const checklistFiles = checklistDoc
  ? `${documentFilePath(checklistDoc)}; CS Check List Page 2 .jpeg; CS Check List Page 3 .jpeg`
  : "";

/** @type {Record<string, string[][]>} */
const sampleRows = {
  "01_client": [[CLIENT, "", "", "", ""]],
  "02_client_admin": [],
  "03_site": [[SITE, "", "JA Byrne", "J Abrahams"]],
  "04_space": [
    [SPACE, "Asphalt Plant, mixer house level 3", SITE, TASK_TYPE, "Yes", "Yes"],
  ],
  "05_person": people.map((person) => [
    personDisplayName(person),
    "",
    "",
    "",
    SITE,
    SITE_ROLE_LABEL[person.siteRole] ?? "",
  ]),
  "06_task": [
    [
      "",
      TASK_REF,
      hiraDoc?.title ?? "",
      RAMS_REF,
      "Confined Space; Hot Work",
      TASK_REF,
      MS_SOP,
      "Repairs in Asphalt Plant Hot Agg Bins",
      SPACE,
      taskLead ? personDisplayName(taskLead) : "",
      "13 Jun 2026 06:00",
      "2 days",
      "Yes",
    ],
  ],
  "08_document": documents.map((doc) => [
    documentFilePath(doc),
    CLIENT,
    mvpDocumentKind(doc),
    doc.paperReference,
  ]),
  "09_document_attach": documents.map((doc) => [
    doc.title,
    placementScopeLabel(doc.scope),
    placementTarget(doc.scope),
  ]),
  "10_content": checklist.map(([, bodyText], index) => [
    index === 0 ? checklistFiles : "",
    CHECKLIST_TITLE,
    "Job Checklist",
    bodyText,
  ]),
  task_content: [],
  "11_content_attach": [],
};

/** Core DB seed — teammate adds rows here before import. */
const HANDOFF_CORE_SHEETS = new Set([
  "01_client",
  "02_client_admin",
  "03_site",
  "04_space",
  "05_person",
  "06_task",
  "08_document",
  "09_document_attach",
]);

const CORE_DATA_ROW_PAD = 5;
const LATER_DATA_ROW_PAD = 3;

function cellValue(cell) {
  if (cell !== null && typeof cell === "object" && "v" in cell) {
    return cell.v;
  }
  return cell ?? "";
}

function fitWidths(rows) {
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  const longest = Array.from({ length: columnCount }, () => 0);
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      longest[index] = Math.max(
        longest[index],
        String(cellValue(row[index])).length,
      );
    }
  }
  return longest.map((length) => Math.min(72, Math.max(14, length + 2)));
}

function resourceSheet(resource) {
  const fields = resource.fields;
  const columnCount = fields.length;
  const header = fields.map((entry) => entry.ui);
  const data = (sampleRows[resource.sheet] ?? []).map((row) => {
    if (row.length !== columnCount) {
      throw new Error(
        `Sheet ${resource.sheet}: expected ${columnCount} values, got ${row.length}`,
      );
    }
    return row;
  });
  const blankRow = () => Array.from({ length: columnCount }, () => "");
  const trailing = HANDOFF_CORE_SHEETS.has(resource.sheet)
    ? CORE_DATA_ROW_PAD
    : LATER_DATA_ROW_PAD;
  const rows = [
    header,
    ...data,
    ...Array.from({ length: Math.max(0, trailing) }, blankRow),
  ];
  return {
    name: resource.sheet,
    freezeRows: 1,
    rowStyle: (rowIndex) => (rowIndex === 0 ? "header" : "body"),
    widths: fitWidths(rows),
    rows,
  };
}

function orderedResources() {
  const bySheet = new Map(resources.map((resource) => [resource.sheet, resource]));
  return SHEET_ORDER.map((sheet) => {
    const resource = bySheet.get(sheet);
    if (!resource) {
      throw new Error(`Missing resource definition for locked sheet: ${sheet}`);
    }
    return resource;
  });
}

const sheets = orderedResources().map(resourceSheet);

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const result = writeXlsx(output, sheets);
  const contentRows = sampleRows["10_content"].length;
  console.log(`Generated ${output}`);
  console.log(
    `Sheets: ${SHEET_ORDER.length} (locked); checklist prompts: ${contentRows}; tabs: ${result.sheets}`,
  );
}

export { resources, SHEET_ORDER };
