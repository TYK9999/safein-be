import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeXlsx } from "./lib/xlsx.mjs";
import { loadSchemaSql } from "./lib/schema-sql.mjs";
import {
  directMappings,
  parseSchema,
} from "./generate-website-schema-mapping-workbook.mjs";
import { checklist } from "./generate-sample-job-pack.mjs";

/**
 * One sheet per schema table. Row 1 = database fields (foreign keys as
 * tenant_name, site_name, …). Row 2 = website UI label, or blank if none.
 *
 *   node scripts/generate-bulk-data-import.mjs
 */
const root = resolve(import.meta.dirname, "..");
const schemaSql = loadSchemaSql(join(root, "db", "schema", "schema.sql"));
const output = join(root, "docs", "template", "SafeIn5_Bulk_Data_Import.xlsx");

const omittedColumns = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);

const postCreateForeignKeys = {
  "document_placement.work_task_id": "work_task.id",
  "content_placement.work_task_id": "work_task.id",
};

const tables = parseSchema(schemaSql);
if (tables.length === 0) {
  throw new Error("No CREATE TABLE statements found in db/schema/schema.sql.");
}
for (const table of tables) {
  for (const column of table.columns) {
    column.foreignKey =
      postCreateForeignKeys[`${table.name}.${column.column}`] ??
      column.foreignKey;
  }
}

/** tenant_id → tenant_name; created_by → created_by_name */
function importHeader(column) {
  if (!column.foreignKey) return column.column;
  const base = column.column.replace(/_id$/, "");
  return `${base}_name`;
}

function uiLabel(tableName, columnName) {
  const mapping = directMappings[`${tableName}.${columnName}`];
  return mapping?.[0] ?? "";
}

function isRequired(column) {
  return column.requiredForInsert === "Yes";
}

function withStar(text, column) {
  if (!isRequired(column)) return text;
  return text ? `${text} *` : "*";
}

function cellValue(cell) {
  if (cell !== null && typeof cell === "object" && "v" in cell) {
    return cell.v;
  }
  return cell ?? "";
}

function isSourceRow(row) {
  return String(cellValue(row[0])).startsWith("Source");
}

/** Excel column width from the longest visible cell in that column. */
function fitColumnWidths(rows) {
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  const longest = Array.from({ length: columnCount }, () => 0);
  for (const row of rows) {
    if (isSourceRow(row)) continue;
    for (let index = 0; index < row.length; index += 1) {
      longest[index] = Math.max(
        longest[index],
        String(cellValue(row[index])).length,
      );
    }
  }
  return longest.map((length) => Math.min(96, Math.max(18, length + 3)));
}

function isBlank(value) {
  return value === "" || value === null || value === undefined;
}

/**
 * @param {unknown[]} values
 * @param {{ default?: string, synthetic?: number[], required?: boolean[] }} options
 */
function styleDataRow(values, options = {}) {
  const defaultStyle = options.default ?? "extracted";
  const synthetic = new Set(options.synthetic ?? []);
  const required = options.required ?? [];
  return values.map((value, index) => {
    const raw = cellValue(value);
    if (isBlank(raw)) {
      if (required[index]) {
        return { v: "", style: "missing_required" };
      }
      return "";
    }
    const style = synthetic.has(index) ? "synthetic" : defaultStyle;
    return { v: raw, style };
  });
}

function sourceAnnotationRow(length, source) {
  const text = source.startsWith("Source")
    ? source
    : `Source files: ${source}`;
  return [
    { v: text, style: "note" },
    ...Array.from({ length: length - 1 }, () => ""),
  ];
}

/**
 * @param {unknown[]} row
 * @param {string} source
 * @param {{ default?: string, synthetic?: number[], required?: boolean[] }} [options]
 */
function sourced(row, source, options = {}) {
  return [styleDataRow(row, options), sourceAnnotationRow(row.length, source)];
}

function applyRequiredHighlight(rows, requiredMask) {
  return rows.map((row) => {
    if (isSourceRow(row)) return row;
    return row.map((cell, index) => {
      if (!requiredMask[index]) return cell;
      const raw = cellValue(cell);
      if (!isBlank(raw)) return cell;
      return { v: "", style: "missing_required" };
    });
  });
}

const EMAIL_SYNTHETIC = { synthetic: [0, 5, 6] };
const REVISION_FILE_META = { synthetic: [2, 3, 4, 5] };
const ALL_SYNTHETIC = { default: "synthetic" };

function revisionLabel(version) {
  return `v${version}`;
}

const rescuePlanSources =
  "Rescue Plan/Rescue Plan Front Page.jpeg, Rescue Plan/Confined Space Rescue Plan Back page.jpeg";
const hiraSources =
  "RAMS/HIRA Front Page 1 .jpeg, RAMS/HIRA Page 2.jpeg, RAMS/HIRA Page 3.jpeg";
const permitSources =
  "Permit To Work/Permit to Work Back Page.jpeg, Permit To Work/Permit to Work Front Page .jpeg";
const contractorClearanceSources =
  "Contractor Approval/Contract Authorisation Front Page.jpeg, Contractor Approval/Contractor Clearence to work main page.jpeg";
const confinedSpaceChecklistSources =
  "Confiend Space Check List/CS Check List Page 1.jpeg, Confiend Space Check List/CS Check List Page 2 .jpeg, Confiend Space Check List/CS Check List Page 3 .jpeg";
const confinedSpaceChecklistTitle = "IMSF 100 — Confined Spaces Checklist";

const allJobPackSources = [
  rescuePlanSources,
  hiraSources,
  permitSources,
  contractorClearanceSources,
  confinedSpaceChecklistSources,
].join(", ");

const people = [
  [
    "ja.byrne@seed.safein5.local",
    "JA",
    "Byrne",
    "",
    "",
    "invited",
    "false",
    "",
    "site_manager",
    `${hiraSources}, ${permitSources}`,
  ],
  [
    "jake.marshall@seed.safein5.local",
    "Jake",
    "Marshall",
    "",
    "",
    "invited",
    "false",
    "",
    "supervisor",
    contractorClearanceSources,
  ],
  [
    "j.abrahams@seed.safein5.local",
    "J",
    "Abrahams",
    "",
    "",
    "invited",
    "false",
    "",
    "supervisor",
    rescuePlanSources,
  ],
  [
    "t.hamnett@seed.safein5.local",
    "T",
    "Hamnett",
    "",
    "",
    "invited",
    "false",
    "",
    "worker",
    `${permitSources}, ${contractorClearanceSources}`,
  ],
  [
    "nathan.whittle@seed.safein5.local",
    "Nathan",
    "Whittle",
    "",
    "",
    "invited",
    "false",
    "",
    "worker",
    permitSources,
  ],
  [
    "c.preen@seed.safein5.local",
    "C",
    "Preen",
    "",
    "",
    "invited",
    "false",
    "",
    "",
    hiraSources,
  ],
  [
    "rhoda.jones@seed.safein5.local",
    "Rhoda",
    "Jones",
    "",
    "",
    "invited",
    "false",
    "",
    "worker",
    hiraSources,
  ],
  [
    "chris.muir@seed.safein5.local",
    "Chris",
    "Muir",
    "",
    "",
    "invited",
    "false",
    "",
    "worker",
    hiraSources,
  ],
];

const admin = [
  "tarmac.admin@seed.safein5.local",
  "Tarmac",
  "Admin",
  "",
  "",
  "invited",
  "false",
  "",
];

const uncoverTitle = "Hot Bins 098001 — Uncover checks";
const learn5Title = "Hot Bins — Rescue equipment setup";
const shiftTitle = "Hot Bins 098001 — Shift options";

const derivedPrompts = [
  [uncoverTitle, 1, "Does permit 098001 match HIRA HOTBINSRA01?", "true", "true"],
  [uncoverTitle, 2, "Can entry into the Hot Aggregate Bins be avoided?", "true", "true"],
  [
    uncoverTitle,
    3,
    "Are calibrated personal gas monitors available and checked before entry?",
    "true",
    "true",
  ],
  [
    uncoverTitle,
    4,
    "Are the top person, radio communication and rescue arrangements in place?",
    "true",
    "true",
  ],
  [
    uncoverTitle,
    5,
    "Has the plant cooled for 12 hours and been isolated before entry?",
    "true",
    "true",
  ],
  [
    learn5Title,
    1,
    "Use a lifeline or rope with the pulley rescue system.",
    "true",
    "true",
  ],
  [
    learn5Title,
    2,
    "Use the SKED stretcher and pulley for patient lowering.",
    "true",
    "true",
  ],
  [
    learn5Title,
    3,
    "Keep a trained top person present and maintain radio communication.",
    "true",
    "true",
  ],
  [
    learn5Title,
    4,
    "Confirm harnesses, safety lines, respirators and gas analyser are available.",
    "true",
    "true",
  ],
  [
    learn5Title,
    5,
    "Enter through the mixer-house level 3 side hatch and keep the route clear.",
    "true",
    "true",
  ],
  [
    shiftTitle,
    1,
    "Use portable lighting suitable for the confined-space conditions.",
    "false",
    "false",
  ],
  [
    shiftTitle,
    2,
    "Stage the rescue stretcher, pulley and lifeline before work starts.",
    "true",
    "false",
  ],
  [
    shiftTitle,
    3,
    "Continuously monitor the atmosphere with personal gas monitors.",
    "true",
    "false",
  ],
];

const assets = [
  [
    confinedSpaceChecklistTitle,
    "seed/sample-documents/Confined-Space-Check-List/CS-Check-List-Page-1.jpeg",
    "CS Check List Page 1.jpeg",
    "image/jpeg",
    3586831,
    "",
    "Confiend Space Check List/CS Check List Page 1.jpeg",
  ],
  [
    confinedSpaceChecklistTitle,
    "seed/sample-documents/Confined-Space-Check-List/CS-Check-List-Page-2.jpeg",
    "CS Check List Page 2.jpeg",
    "image/jpeg",
    3446957,
    "",
    "Confiend Space Check List/CS Check List Page 2 .jpeg",
  ],
  [
    confinedSpaceChecklistTitle,
    "seed/sample-documents/Confined-Space-Check-List/CS-Check-List-Page-3.jpeg",
    "CS Check List Page 3.jpeg",
    "image/jpeg",
    3551414,
    "",
    "Confiend Space Check List/CS Check List Page 3 .jpeg",
  ],
  [
    uncoverTitle,
    "seed/sample-documents/RAMS/HIRA-Front-Page-1.jpeg",
    "HIRA Front Page 1.jpeg",
    "image/jpeg",
    3351286,
    "",
    "RAMS/HIRA Front Page 1 .jpeg",
  ],
  [
    uncoverTitle,
    "seed/sample-documents/RAMS/HIRA-Page-2.jpeg",
    "HIRA Page 2.jpeg",
    "image/jpeg",
    3211932,
    "",
    "RAMS/HIRA Page 2.jpeg",
  ],
  [
    uncoverTitle,
    "seed/sample-documents/RAMS/HIRA-Page-3.jpeg",
    "HIRA Page 3.jpeg",
    "image/jpeg",
    2770160,
    "",
    "RAMS/HIRA Page 3.jpeg",
  ],
  [
    learn5Title,
    "seed/sample-documents/Rescue-Plan/Rescue-Plan-Front-Page.jpeg",
    "Rescue Plan Front Page.jpeg",
    "image/jpeg",
    3213060,
    "",
    "Rescue Plan/Rescue Plan Front Page.jpeg",
  ],
  [
    learn5Title,
    "seed/sample-documents/Rescue-Plan/Confined-Space-Rescue-Plan-Back-Page.jpeg",
    "Confined Space Rescue Plan Back page.jpeg",
    "image/jpeg",
    3023752,
    "",
    "Rescue Plan/Confined Space Rescue Plan Back page.jpeg",
  ],
  [
    shiftTitle,
    "seed/sample-documents/Permit-To-Work/Permit-to-Work-Front-Page.jpeg",
    "Permit to Work Front Page.jpeg",
    "image/jpeg",
    4261310,
    "",
    "Permit To Work/Permit to Work Front Page .jpeg",
  ],
  [
    shiftTitle,
    "seed/sample-documents/Permit-To-Work/Permit-to-Work-Back-Page.jpeg",
    "Permit to Work Back Page.jpeg",
    "image/jpeg",
    3532305,
    "",
    "Permit To Work/Permit to Work Back Page.jpeg",
  ],
  [
    shiftTitle,
    "seed/sample-documents/Contractor-Approval/Contract-Authorisation-Front-Page.jpeg",
    "Contract Authorisation Front Page.jpeg",
    "image/jpeg",
    2817208,
    "",
    "Contractor Approval/Contract Authorisation Front Page.jpeg",
  ],
  [
    shiftTitle,
    "seed/sample-documents/Contractor-Approval/Contractor-Clearance-main-page.jpeg",
    "Contractor Clearance to work main page.jpeg",
    "image/jpeg",
    3980196,
    "",
    "Contractor Approval/Contractor Clearence to work main page.jpeg",
  ],
];

export const sampleRows = {
  app_user: [
    ...people.flatMap((person) =>
      sourced(person.slice(0, 8), person[9], EMAIL_SYNTHETIC),
    ),
    ...sourced(
      admin,
      "Source: synthetic prerequisite; sample files do not identify a tenant administrator",
      ALL_SYNTHETIC,
    ),
  ],
  tenant: [...sourced(["tarmac", "Tarmac", "corporate"], allJobPackSources)],
  user_tenant_membership: [
    ...people.flatMap((person) =>
      sourced(
        [`${person[1]} ${person[2]}`, "Tarmac", "member"],
        person[9],
        { synthetic: [2] },
      ),
    ),
    ...sourced(
      ["Tarmac Admin", "Tarmac", "tenant_admin"],
      "Source: synthetic prerequisite; required to administer the imported tenant",
      ALL_SYNTHETIC,
    ),
  ],
  site: [
    ...sourced(
      ["Tarmac", "Dolyhir", "JA Byrne"],
      `${hiraSources}, ${permitSources}`,
    ),
  ],
  user_site_membership: people
    .filter((person) => person[8])
    .flatMap((person) =>
      sourced(
        [`${person[1]} ${person[2]}`, "Dolyhir", person[8]],
        person[9],
        { synthetic: [2] },
      ),
    ),
  space: [
    ...sourced(
      [
        "Tarmac",
        "Dolyhir",
        "Hot Aggregate Bins",
        "Asphalt Plant, mixer house level 3; entry through 300 mm side hatch",
        "Hot aggregate bins / confined space",
        "Confined space entry",
        "SIS-QR-HOTBINS-001",
        "true",
        "true",
        "J Abrahams",
        "Supervisor, Dolyhir",
      ],
      `${rescuePlanSources}, ${hiraSources}, ${permitSources}`,
      { synthetic: [6, 10] },
    ),
  ],
  site_category_owner: [
    ...sourced(
      ["Dolyhir", "Confined space", "J Abrahams"],
      "Source: derived from Rescue Plan/Confined Space Rescue Plan Back page.jpeg (completed by Engineering Supervisor)",
      ALL_SYNTHETIC,
    ),
  ],
  document: [
    ...sourced(["Tarmac", "Confined Space Rescue Plan", "rescue_plan", "draft"], rescuePlanSources),
    ...sourced(
      [
        "Tarmac",
        "Hazard Identification & Risk Assessment (HIRA) — Asphalt Plant Repairs to Hot Bins / Chutes",
        "risk_assessment",
        "draft",
      ],
      hiraSources,
    ),
    ...sourced(["Tarmac", "Permit to Work — 098001", "permit_to_work", "draft"], permitSources),
    ...sourced(
      ["Tarmac", "IMSF 100 — Confined Spaces Checklist", "checklist", "draft"],
      confinedSpaceChecklistSources,
    ),
    ...sourced(
      ["Tarmac", "Contractors Clearance To Work Authorisation", "other", "draft"],
      contractorClearanceSources,
    ),
    ...sourced(
      ["Tarmac", "Hot Bins Method Statement (cited only)", "other", "draft"],
      "Source: RAMS/HIRA Front Page 1 .jpeg cites HOTBINSMS01; method-statement file is missing",
      ALL_SYNTHETIC,
    ),
  ],
  document_revision: [
    ...sourced(
      ["Confined Space Rescue Plan", revisionLabel(1), "seed/sample-documents/Rescue-Plan/Rescue-Plan-Front-Page.jpeg", "image/jpeg", 3213060, "true"],
      rescuePlanSources,
      REVISION_FILE_META,
    ),
    ...sourced(
      ["Hazard Identification & Risk Assessment (HIRA) — Asphalt Plant Repairs to Hot Bins / Chutes", revisionLabel(1), "seed/sample-documents/RAMS/HIRA-Front-Page-1.jpeg", "image/jpeg", 3351286, "true"],
      hiraSources,
      REVISION_FILE_META,
    ),
    ...sourced(
      ["Permit to Work — 098001", revisionLabel(1), "seed/sample-documents/Permit-To-Work/Permit-to-Work-Front-Page.jpeg", "image/jpeg", 4261310, "true"],
      permitSources,
      REVISION_FILE_META,
    ),
    ...sourced(
      ["IMSF 100 — Confined Spaces Checklist", revisionLabel(1), "seed/sample-documents/Confined-Space-Check-List/CS-Check-List-Page-1.jpeg", "image/jpeg", 3586831, "true"],
      confinedSpaceChecklistSources,
      REVISION_FILE_META,
    ),
    ...sourced(
      ["Contractors Clearance To Work Authorisation", revisionLabel(1), "seed/sample-documents/Contractor-Approval/Contractor-Clearance-main-page.jpeg", "image/jpeg", 3980196, "true"],
      contractorClearanceSources,
      REVISION_FILE_META,
    ),
    ...sourced(
      ["Hot Bins Method Statement (cited only)", revisionLabel(1), "seed/missing/HOTBINSMS01", "", "", "true"],
      "Source: RAMS/HIRA Front Page 1 .jpeg; referenced file is missing",
      ALL_SYNTHETIC,
    ),
  ],
  document_placement: [
    ...sourced(["Confined Space Rescue Plan", "space", "", "", "Hot Aggregate Bins", "", "false"], rescuePlanSources),
    ...sourced(["Hazard Identification & Risk Assessment (HIRA) — Asphalt Plant Repairs to Hot Bins / Chutes", "work_task", "", "", "", "098001", "false"], hiraSources),
    ...sourced(["Permit to Work — 098001", "work_task", "", "", "", "098001", "false"], permitSources),
    ...sourced(["IMSF 100 — Confined Spaces Checklist", "space", "", "", "Hot Aggregate Bins", "", "false"], confinedSpaceChecklistSources),
    ...sourced(["Contractors Clearance To Work Authorisation", "work_task", "", "", "", "098001", "false"], contractorClearanceSources),
    ...sourced(
      ["Hot Bins Method Statement (cited only)", "work_task", "", "", "", "098001", "false"],
      "Source: RAMS/HIRA Front Page 1 .jpeg cites HOTBINSMS01",
      ALL_SYNTHETIC,
    ),
  ],
  work_task: [
    ...sourced(
      ["Tarmac", "Dolyhir", "Hot Aggregate Bins", "098001", "Repairs in Asphalt Plant Hot Aggregate Bins / Chutes", "active", "true", "Confined Space; Hot Work; Working at Height", "098001", "2026-06-14 15:30:00+01", "Hazard Identification & Risk Assessment (HIRA) — Asphalt Plant Repairs to Hot Bins / Chutes", "HOTBINSRA01", "Jake Marshall", "", "2026-06-13 06:00:00+01", "2026-06-14 15:30:00+01", 2],
      `${hiraSources}, ${permitSources}, ${contractorClearanceSources}`,
    ),
  ],
  work_task_crew: [
    ...sourced(["098001", "T Hamnett"], `${permitSources}, ${contractorClearanceSources}`),
    ...sourced(["098001", "Nathan Whittle"], permitSources),
  ],
  content_pack: [
    ...sourced(["Tarmac", "job_checklist", confinedSpaceChecklistTitle, "Confined space", "", "draft", revisionLabel(1), ""], confinedSpaceChecklistSources),
    ...sourced(["Tarmac", "uncover", uncoverTitle, "Confined space", 5, "draft", revisionLabel(1), ""], `${hiraSources}, ${permitSources}`, ALL_SYNTHETIC),
    ...sourced(["Tarmac", "learn_5", learn5Title, "Safety", 5, "draft", revisionLabel(1), ""], rescuePlanSources, ALL_SYNTHETIC),
    ...sourced(["Tarmac", "shift", shiftTitle, "Confined space", 5, "draft", revisionLabel(1), ""], `${rescuePlanSources}, ${hiraSources}, ${permitSources}`, ALL_SYNTHETIC),
  ],
  content_placement: [
    ...sourced([confinedSpaceChecklistTitle, "space", "Hot Aggregate Bins", ""], confinedSpaceChecklistSources),
    ...sourced([uncoverTitle, "work_task", "", "098001"], `${hiraSources}, ${permitSources}`, ALL_SYNTHETIC),
    ...sourced([learn5Title, "space", "Hot Aggregate Bins", ""], rescuePlanSources, ALL_SYNTHETIC),
    ...sourced([shiftTitle, "work_task", "", "098001"], allJobPackSources, ALL_SYNTHETIC),
  ],
  content_prompt: [
    ...checklist.flatMap(([sortOrder, bodyText, isCritical]) =>
      sourced(
        [confinedSpaceChecklistTitle, sortOrder, bodyText, isCritical ? "true" : "false", "true"],
        confinedSpaceChecklistSources,
        { synthetic: [3, 4] },
      ),
    ),
    ...derivedPrompts.flatMap((row) =>
      sourced(
        row,
        row[0] === learn5Title
          ? rescuePlanSources
          : row[0] === uncoverTitle
            ? `${hiraSources}, ${permitSources}`
            : allJobPackSources,
        ALL_SYNTHETIC,
      ),
    ),
  ],
  content_asset: assets.flatMap((asset) =>
    sourced(asset.slice(0, 6), asset[6], { synthetic: [1, 4] }),
  ),
};

export {
  tables,
  omittedColumns,
  importHeader,
  uiLabel,
  isRequired,
  withStar,
  fitColumnWidths,
  applyRequiredHighlight,
  isSourceRow,
  sourced,
  styleDataRow,
  sourceAnnotationRow,
};

const sheets = [
  {
    name: "README",
    freezeRows: 0,
    autoFilter: false,
    headerRow: -1,
    widths: [28, 110],
    rowStyle: (rowIndex) => (rowIndex === 0 ? "title" : "body"),
    rows: [
      ["SafeIn5 bulk data import — one sheet per database table", ""],
      ["", ""],
      ["Schema", "db/schema/*.sql (entry: schema.sql)"],
      [
        "Website labels",
        "docs/index.html (via SafeIn5_Website_to_Schema_Field_Mapping.xlsx)",
      ],
      ["", ""],
      [
        "Row 1",
        "Importable columns on that table. Foreign keys are written as names, not ids: tenant_id → tenant_name, site_id → site_name, user_id → user_name. A trailing * means the column must be filled.",
      ],
      [
        "Row 2",
        "The label shown on the website for that column. Left blank when the website has no field for it. * is repeated on required columns.",
      ],
      [
        "Row 3 onward",
        "Your data. Match names exactly to rows on the related sheet (for example tenant_name must match tenant.name).",
      ],
      [
        "Omitted",
        "id, created_at, updated_at, created_by and updated_by — the database sets these.",
      ],
      ["", ""],
      ["Colour key", ""],
      [
        { v: "Extracted from source files", style: "extracted" },
        "Read from the scanned job-pack files",
      ],
      [
        { v: "Generated / not on paper", style: "synthetic" },
        "Invented email, QR code, derived pack, seed path, tenant admin, etc.",
      ],
      [
        { v: "Required but empty", style: "missing_required" },
        "Column is mandatory (*) but no value was filled in that row",
      ],
      [
        { v: "Source annotation", style: "note" },
        "Grey italic row under each data row listing source file(s)",
      ],
    ],
  },
  ...tables.map((table) => {
    const columns = table.columns.filter(
      (column) => !omittedColumns.has(column.column),
    );
    const headers = columns.map((column) =>
      withStar(importHeader(column), column),
    );
    const labels = columns.map((column) => {
      const label = uiLabel(table.name, column.column);
      return isRequired(column) && label ? `${label} *` : label;
    });
    const rows = [
      headers,
      labels,
      ...applyRequiredHighlight(
        sampleRows[table.name] ?? [],
        columns.map((column) => isRequired(column)),
      ),
    ];
    return {
      name: table.name.slice(0, 31),
      freezeRows: 2,
      headerRow: 0,
      autoFilter: false,
      widths: fitColumnWidths(rows),
      rowStyle: (rowIndex) =>
        rowIndex === 0 ? "header" : rowIndex === 1 ? "subheader" : "body",
      rows,
    };
  }),
];

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const duplicate = sheets
    .map((sheet) => sheet.name)
    .find((name, index, all) => all.indexOf(name) !== index);
  if (duplicate) {
    throw new Error(`Sheet name truncated to a duplicate: ${duplicate}`);
  }
  let written = output;
  let result;
  try {
    result = writeXlsx(output, sheets);
  } catch (error) {
    if (error.code !== "EBUSY") throw error;
    written = output.replace(/\.xlsx$/i, ".new.xlsx");
    result = writeXlsx(written, sheets);
    console.warn(
      `Could not overwrite ${output} (file is open). Wrote ${written} instead.`,
    );
  }
  const importColumns = tables.flatMap((table) =>
    table.columns.filter((column) => !omittedColumns.has(column.column)),
  );
  const mapped = importColumns.filter((column) =>
    uiLabel(column.table, column.column),
  ).length;
  const total = importColumns.length;
  const required = importColumns.filter(isRequired).length;
  console.log(`Generated ${written}`);
  console.log(
    `Sheets: ${result.sheets} (README + ${tables.length} tables); columns with a UI label: ${mapped} of ${total}; required (*): ${required}`,
  );
}
