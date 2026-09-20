import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeXlsx } from "./lib/xlsx.mjs";
import {
  applyRequiredHighlight,
  fitColumnWidths,
  importHeader,
  isRequired,
  isSourceRow,
  omittedColumns,
  sampleRows,
  sourceAnnotationRow,
  styleDataRow,
  tables,
  uiLabel,
  withStar,
} from "./generate-bulk-data-import.mjs";

/**
 * Handoff workbook for one job pack: core tables only (no pulse/signal).
 * Pre-filled from docs/sample documents/ · team adds rows · then SQL import.
 *
 *   node scripts/generate-job-pack-seed-template.mjs
 */
const root = resolve(import.meta.dirname, "..");
const output = join(
  root,
  "docs",
  "template",
  "SafeIn5_Job_Pack_Seed_Template.xlsx",
);

/** Fill order for your teammate (matches foreign keys). */
const SHEET_ORDER = [
  "tenant",
  "app_user",
  "user_tenant_membership",
  "site",
  "user_site_membership",
  "space",
  "document",
  "document_revision",
  "work_task",
  "document_placement",
  "work_task_crew",
];

const EXTRA_BLANK_PAIRS = 5;

function blankPair(columnCount) {
  return [
    styleDataRow(Array.from({ length: columnCount }, () => "")),
    sourceAnnotationRow(
      columnCount,
      "Source: add your file path or note when you fill this row",
    ),
  ];
}

function buildTableSheet(tableName) {
  const table = tables.find((entry) => entry.name === tableName);
  if (!table) {
    throw new Error(`Unknown table: ${tableName}`);
  }
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
  const existing = sampleRows[tableName] ?? [];
  const blanks = Array.from({ length: EXTRA_BLANK_PAIRS }, () =>
    blankPair(columns.length),
  ).flat();
  const rows = [
    headers,
    labels,
    ...applyRequiredHighlight(
      [...existing, ...blanks],
      columns.map((column) => isRequired(column)),
    ),
  ];
  return {
    name: tableName.slice(0, 31),
    freezeRows: 2,
    headerRow: 0,
    autoFilter: false,
    widths: fitColumnWidths(rows),
    rowStyle: (rowIndex) =>
      rowIndex === 0 ? "header" : rowIndex === 1 ? "subheader" : "body",
    rows,
  };
}

const sheets = [
  {
    name: "README",
    freezeRows: 0,
    autoFilter: false,
    headerRow: -1,
    widths: [30, 105],
    rowStyle: (rowIndex) => (rowIndex === 0 ? "title" : "body"),
    rows: [
      ["SafeIn5 job pack seed — team handoff", ""],
      ["", ""],
      ["Purpose", "One work task per workbook. Sample pack pre-filled from docs/sample documents/. Your teammate adds rows; you import to Postgres."],
      ["Sample pack", "Tarmac · Dolyhir · Hot Aggregate Bins · permit 098001"],
      ["", ""],
      ["What is included", "tenant, people, site, space, documents, work task, crew, document links"],
      ["Not included (add later)", "pulse, signal, content_pack, echo routing — separate import when demo screens are needed"],
      ["", ""],
      ["How to fill", ""],
      ["1", "Do not change row 1 (column names) or row 2 (UI labels)."],
      ["2", "Add or edit data from row 3 onward. One logical record per data row."],
      ["3", "Keep the grey source row directly under each data row you add or change."],
      ["4", "Names must match across sheets: tenant_name, site_name, work_task_name (= work_task.reference), document_name, user email."],
      ["5", "Green = from scans. Amber = invented (email, QR, slug). Red = required but empty."],
      ["", ""],
      ["Fill sheets in this order", SHEET_ORDER.join(" → ")],
      ["", ""],
      ["After handoff", "Return file → generate SQL or bulk import → psql -f db/seed/<pack>.sql"],
      ["Schema reference", "db/schema/schema.sql"],
      ["Full import template", "docs/template/SafeIn5_Bulk_Data_Import.xlsx (all tables)"],
    ],
  },
  {
    name: "FILL_ORDER",
    freezeRows: 1,
    widths: [8, 28, 52],
    rows: [
      ["Step", "Sheet", "What to add"],
      ...SHEET_ORDER.map((name, index) => {
        const hints = {
          tenant: "Client name, slug, kind=corporate",
          app_user: "Everyone on the papers + placeholder emails",
          user_tenant_membership: "Link each person to client; one tenant_admin",
          site: "Site name and site manager",
          user_site_membership: "Each person’s role at the site",
          space: "Asset/location, QR, permit/rescue flags",
          document: "One row per file type (PTW, HIRA, rescue, checklist, …)",
          document_revision: "File path and revision v1 per document",
          work_task: "Task reference, permit, RAMS, dates, lead",
          document_placement: "Link each document to space or task",
          work_task_crew: "Crew from permit (one row per person)",
        };
        return [String(index + 1), name, hints[name] ?? ""];
      }),
    ],
  },
  ...SHEET_ORDER.map((name) => buildTableSheet(name)),
];

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const result = writeXlsx(output, sheets);
  console.log(`Generated ${output}`);
  console.log(
    `Sheets: ${result.sheets} (${SHEET_ORDER.length} tables + README + FILL_ORDER); ${EXTRA_BLANK_PAIRS} blank row pairs per table`,
  );
}
