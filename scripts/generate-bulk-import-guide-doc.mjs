import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const root = resolve(import.meta.dirname, "..");
const outputDocx = join(root, "docs", "SafeIn5_Bulk_Import_Guide.docx");

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

function numbered(text) {
  return new Paragraph({ text, numbering: { reference: "steps", level: 0 }, spacing: { after: 80 } });
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

const children = [
  h1("SafeIn5 bulk import guide"),
  body(
    "This guide explains how to load data using the three bulk import templates in docs/import/, after the database schema and back-office application are already in place. The Set up wizard is not used — data is brought in through Sites, People, and Documents bulk import only.",
  ),
  body("Templates covered:", { bold: true }),
  bullet("SafeIn5_Bulk_Site_Import_Template.xlsx — sites, spaces, space documents, people, task templates, active tasks"),
  bullet("SafeIn5_Bulk_People_Import_Template.xlsx — people and site roles only"),
  bullet("SafeIn5_Bulk_Document_Import_Template.xlsx — document library and optional placement"),

  h2("Before you start — prerequisites"),
  body("These must already exist in SafeIn5 before any bulk import runs successfully:"),
  table(
    ["Prerequisite", "Why it is needed"],
    [
      ["A client (tenant) record", "Every import runs in a client context. Sites, people, and tenant-owned documents are stored against that tenant."],
      ["At least one client administrator", "Someone must be signed in with permission to run bulk import. Platform admins can import for any client."],
      ["The bulk import Excel templates", "Download from Sites → Bulk import, Users → Bulk import, or Documents → Bulk import in the back office."],
      ["Document files ready to upload (where applicable)", "Site and Document imports match rows to files by exact file name. Missing files block those rows."],
    ],
    [32, 68],
  ),

  h2("Recommended import order"),
  body(
    "The three imports can be run independently, but they reference each other by name. Use the order below to avoid lookup failures.",
  ),
  table(
    ["Step", "Import", "What it creates", "Depends on"],
    [
      ["1 (recommended first)", "Sites bulk import", "Sites, spaces, space documents, people, task templates, active tasks — in one pass", "Tenant only. This is the only import that can seed the full structure."],
      ["2 (optional)", "People bulk import", "Additional people and site memberships", "Site names must already exist (from step 1 or manual Add a site)."],
      ["3 (optional)", "Documents bulk import", "Library documents and placements to a space or task", "Spaces and/or active tasks if Belongs to is filled. Files must be uploaded with the import."],
    ],
    [14, 18, 38, 30],
  ),

  h3("If you import independently (not using the full site workbook)"),
  numbered("Sites tab only — import sites first so site names exist."),
  numbered("Spaces tab — only after every Site name in the Spaces tab matches a row on the Sites tab."),
  numbered("People — only after sites exist. Site name in the People template must match site.name exactly."),
  numbered("Space documents — only after sites and spaces exist, and after the document files are uploaded."),
  numbered("Task templates — before active tasks if you use SI5 Task ID to copy from a template."),
  numbered("Active tasks — after spaces exist; task lead people should exist; RAMS documents should exist if referenced."),
  numbered("Standalone document import — after any spaces or tasks you reference in Belongs to."),

  body(
    "Important: Bulk imported sites are approved automatically and go live immediately. Sites added manually through Add a site stay pending until a client admin approves them. People and document imports against a pending site may still fail or behave inconsistently until the site is approved.",
    { italics: true },
  ),

  h2("Sites bulk import"),
  body("Screen: Sites → Bulk import. Template sheets: Sites, Spaces, Space Documents, People, Task Templates, Active Tasks."),
  body("Upload two things: (1) the completed Excel file, and (2) the document files listed on the Space Documents tab, matched by file name."),

  h3("Internal processing order (within one site import)"),
  table(
    ["Order", "Sheet", "Creates in database"],
    [
      ["1", "Sites", "site rows; may create site manager / supervisor as app_user + user_site_membership"],
      ["2", "Spaces", "space rows linked to site"],
      ["3", "People", "app_user + user_site_membership (one row = one person on one site)"],
      ["4", "Space Documents", "document + document_revision + document_placement on space (archived until reviewed)"],
      ["5", "Task Templates", "archived work_task rows used as reusable templates"],
      ["6", "Active Tasks", "active work_task rows; may link RAMS document and task lead"],
    ],
    [10, 22, 68],
  ),

  h3("Common failure scenarios — Sites import"),
  table(
    ["Error / symptom", "Typical cause", "How to fix"],
    [
      ["Check site name (Spaces or Active Tasks)", "Site name on child tab does not exactly match Sites tab (typo, extra space, different capitalisation)", "Use identical spelling everywhere. Example from prototype: Dogill vs Doghil."],
      ["Site name already exists", "Re-importing the same site name in the same tenant", "Remove duplicate rows or use a different name."],
      ["Missing site manager email or name", "Required Sites columns left blank", "Fill Site Manager name and email on every Sites row."],
      ["No file / file not matched (Space Documents)", "File name in Excel does not match an uploaded file", "Upload the PDF/Word/image with the exact name in the File name column."],
      ["Unknown task lead", "Active Tasks references a person not on People tab or Sites manager fields", "Add the person on the People tab first, or fix Task Lead name/email."],
      ["RAMS document not found", "RAMS document title on Active Tasks does not match a Space Documents row", "Import the RAMS on Space Documents first, or fix the title spelling."],
      ["Invalid Yes/No", "Permit required or similar column is not Yes or No", "Use only Yes or No (case may be normalised by the importer)."],
      ["Invalid document type", "Type label not in allowed set", "Map to permit_to_work, risk_assessment, rescue_plan, checklist, standard, toolbox_talk, or other."],
      ["Invalid date on Starts", "Active Tasks date not parseable", "Use a consistent format (template example: 13/06/2026 06:00)."],
      ["Duplicate person on same site", "Two People rows with same email/mobile on the same site", "Merge into one row; only one site role per person per site is allowed."],
      ["SI5 template not found", "Active Tasks SI5 Task ID does not match a Task Templates row", "Fill Task Templates first or leave SI5 Task ID blank."],
      ["Row skipped — review", "Row failed validation; rest of file may still import", "Download error rows, fix, and re-upload only those rows."],
    ],
    [28, 36, 36],
  ),

  h2("People bulk import"),
  body("Screen: Users → Bulk import. Template sheet: People."),
  body("Each row invites one person to one site with one role. The same person on two sites needs two rows."),

  h3("Common failure scenarios — People import"),
  table(
    ["Error / symptom", "Typical cause", "How to fix"],
    [
      ["Unknown site", "Site column does not match an existing site.name in this tenant", "Import sites first, or fix spelling (e.g. Dolyhir vs Dolyhir Quarry)."],
      ["Missing email and mobile", "Both contact fields empty", "Provide at least one — email is required for invitation if mobile is blank."],
      ["Duplicate email (already in SafeIn5)", "app_user.email is unique across the whole system", "Use the existing person; add a new row only for another site or role if needed."],
      ["Invalid role", "Role not Worker, Supervisor, or Site Manager", "Use exact template labels. Client admin is not set through this import."],
      ["Second role on same site", "Same person imported twice on one site with different roles", "Only one user_site_membership per person per site. Pick one role or split across sites."],
      ["Name cannot be split", "Single-word name where first/last name are derived", "Use at least two words, or accept both names stored in first_name."],
      ["Site pending approval", "Site was added manually and not yet approved", "Approve the site first, or use Sites bulk import (auto-approved)."],
      ["Wrong tenant context", "Import run while signed into a different client", "Switch to the correct client before importing."],
    ],
    [28, 36, 36],
  ),

  h2("Documents bulk import"),
  body("Screen: Documents → Bulk import. Template sheet: Documents."),
  body("Upload two things: (1) the completed Excel file, and (2) the document files, matched by file name."),

  h3("Common failure scenarios — Documents import"),
  table(
    ["Error / symptom", "Typical cause", "How to fix"],
    [
      ["No file / file not matched", "File name column does not match an uploaded file", "Upload every file listed; names must match exactly including extension."],
      ["Missing document title or type", "Required columns blank", "Fill Document title and Document type on every row."],
      ["Invalid document type", "Type not mapped to schema enum", "Use an allowed type or map to other and keep detail in kind label where supported."],
      ["Client not found", "Client column filled but name does not match tenant.name", "Leave Client blank for tenant library, or fix client name spelling."],
      ["Belongs to not found", "Space name or task reference does not exist yet", "Import sites/spaces/tasks first, or leave Belongs to blank for library-only."],
      ["Ambiguous Belongs to", "Same text matches both a space name and a task reference", "Rename space or task reference so only one matches."],
      ["Duplicate document + placement", "Re-importing the same title and placement", "Skip duplicates or use a new revision row instead."],
      ["Unsupported file type", "File is not PDF, Word, or image as allowed by the UI", "Convert or use a supported format."],
      ["Upload / storage failure", "S3 or presigned upload error", "Retry import; check file size and network."],
    ],
    [28, 36, 36],
  ),

  h2("Cross-import dependency matrix"),
  body("Use this when deciding whether a standalone import can run without another import first."),
  table(
    ["You want to import…", "You need first…", "Notes"],
    [
      ["People (standalone)", "Sites exist", "Site name lookup only — spaces not required."],
      ["Documents → space placement", "Sites + spaces", "Belongs to must match space.name within the tenant."],
      ["Documents → task placement", "Active tasks exist", "Belongs to matches work_task.reference."],
      ["Sites → Spaces tab", "Sites tab in same file", "Site name is the join key across all site workbook tabs."],
      ["Sites → Active Tasks", "Spaces + People (+ documents for RAMS)", "Task lead and RAMS are lookups by name/email/title."],
      ["People after Sites import", "Nothing extra", "Safe if you only need more people; do not re-import existing emails unless intentional."],
      ["Second Sites import", "Care with duplicates", "Duplicate site names fail; use error export and partial re-upload."],
    ],
    [28, 28, 44],
  ),

  h2("Data matching rules (all imports)"),
  bullet("Site names are matched exactly — typos and capitalisation matter unless the importer normalises them."),
  bullet("People are matched by email first; mobile helps when email is absent."),
  bullet("Document files are matched by file name, not document title."),
  bullet("Roles are per site (worker, supervisor, site_manager), not per tenant."),
  bullet("One row on the People template = one site membership. Repeat the person for another site or role."),
  bullet("Rows 2–3 on template data tabs are guides — do not delete them; enter data below the example rows."),
  bullet("Re-upload only failed rows using the Download error rows file after a preview import."),

  h2("Quick reference — minimum viable paths"),
  h3("Path A — Full client seed (recommended)"),
  numbered("Run Sites bulk import with all tabs populated and document files uploaded."),
  numbered("Review archived space documents and make live when ready."),
  numbered("Optionally run People or Documents import only for late additions."),

  h3("Path B — Sites and people only"),
  numbered("Sites bulk import with Sites, Spaces, and People tabs only."),
  numbered("Add documents later via Documents bulk import or the UI."),

  h3("Path C — Add people to existing sites"),
  numbered("Confirm sites already exist and are approved."),
  numbered("Run People bulk import only."),

  h3("Path D — Add documents to existing spaces/tasks"),
  numbered("Confirm spaces and/or tasks exist."),
  numbered("Run Documents bulk import with files and Belongs to filled."),

  body(
    "Related reference files: docs/import/ (templates), docs/template/SafeIn5_Bulk_Import_Column_Map.xlsx (column-to-database map), db/schema/schema.sql (database constraints).",
    { italics: true },
  ),
];

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "steps",
        levels: [
          {
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: "start",
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [{ properties: {}, children }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(outputDocx, buffer);
console.log(`Wrote ${outputDocx}`);
