/**
 * Populate "Pre Req & Assumption" in docs/SafeIn5 Core (2).xlsx
 *
 *   node scripts/populate-prereq-assumptions.mjs
 */
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { readOpcZip, writeOpcZip } from "./lib/xlsx.mjs";
import { computeBackOfficeBeTotals } from "./estimate-back-office-be.mjs";

const WORKBOOK = join(import.meta.dirname, "..", "docs", "SafeIn5 Core (2).xlsx");
const WORKBOOK_FALLBACK = join(import.meta.dirname, "..", "docs", "SafeIn5 Core (2).new.xlsx");
const SHEET_NAME = "Pre Req & Assumption";

const totals = computeBackOfficeBeTotals();

/** @type {Array<[string, string, string, string, string]>} */
const ROWS = [
  ["Type", "Area", "Item", "Detail / rationale", "Estimation basis"],
  [
    "Summary",
    "Back Office BE",
    `Total estimate: ${totals.totalDays} days (${totals.totalHours} h @ ${totals.hoursPerDay}h/day)`,
    `${totals.rowCount} back-office rows mapped in scripts/estimate-back-office-be.mjs (Back Office App (2) sheet when present). Cursor-assisted net coding time — not calendar duration, QA, FE, or DevOps.`,
    "Col G–J BE APIs / days in estimation workbook",
  ],
  ["", "", "", "", ""],
  [
    "Assumption",
    "Estimation method",
    "Cursor-assisted BE days",
    "Estimates assume one backend engineer using Cursor for implementation speed. Days are productive coding time only.",
    "All BE row estimates",
  ],
  [
    "Assumption",
    "Estimation method",
    "9 hours = 1 day",
    "HOURS_PER_DAY = 9 in estimate-back-office-be.mjs.",
    "Hours column J",
  ],
  [
    "Assumption",
    "Estimation scope",
    "BE + DB only",
    "Figures cover NestJS APIs, Kysely queries, and schema work. Front-end, PWA shell, design, QA, UAT, PM, and infrastructure setup are excluded unless a row explicitly says otherwise.",
    "Back Office BE columns",
  ],
  [
    "Assumption",
    "Estimation scope",
    "MVP = docs/index.html",
    "Screen list and flows match the SIGNAL back-office HTML prototype (SafeIn5 admin, client admin, supervisor paths).",
    "Row-to-screen mapping",
  ],
  [
    "Assumption",
    "Estimation scope",
    "Reuse discount",
    'Rows marked "Reuse … (tenant-scoped)" are 0.25d each — assumes shared handlers plus tenant/site scope middleware already exist.',
    "Rows 74, 80–84, etc.",
  ],
  [
    "Assumption",
    "Estimation scope",
    "Partially built APIs",
    "Auth (OTP), signals (create/feed/ack/close), uploads/playback/thumbnails, audio/STT, and health already exist; estimates are incremental only for those areas.",
    "Lower days on media/auth rows",
  ],
  [
    "Assumption",
    "AI features",
    "External AI available",
    "Document extract, Take5 extract, echo classify/summary assume a callable AI API (Cursor/model TBD). Client verifies accuracy separately — not included in BE days.",
    "Rows with /take5/extract, /classify",
  ],
  [
    "Assumption",
    "Out of scope",
    "Not in BE estimate",
    "Native iOS/Android apps, SSO/LDAP, Postgres RLS, multi-tenant-per-user switching, performance/load testing, and historic job-pack batch extraction at scale.",
    "—",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Infrastructure",
    "Postgres 16 + schema",
    "db/schema/schema.sql applied (drop & re-run for MVP; no migration framework in estimate).",
    "All CRUD rows",
  ],
  [
    "Pre-requisite",
    "Infrastructure",
    "NestJS scaffold",
    "Health, config, logging, Kysely pool, global validation, and JWT guard in place.",
    "All rows",
  ],
  [
    "Pre-requisite",
    "Infrastructure",
    "AWS SES",
    "Outbound email for OTP sign-in codes and invite links.",
    "Auth + invite rows",
  ],
  [
    "Pre-requisite",
    "Infrastructure",
    "S3 + presign",
    "Bucket and presigned upload pattern for documents, content packs, and media attachments.",
    "Document/content/upload rows",
  ],
  [
    "Pre-requisite",
    "Infrastructure",
    "JWT keypair",
    "EdDSA access token + httpOnly refresh cookie configured per environment.",
    "Login/session rows",
  ],
  [
    "Pre-requisite",
    "Infrastructure",
    "ffmpeg (optional)",
    "Required for video playback renditions and thumbnails if those screens are in scope.",
    "Media player rows",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Auth & access",
    "Passwordless flow",
    "Invite sends an email OTP. The first successful OTP sets the account active and signs the person in. Every later sign-in uses email OTP only (no password, no magic link).",
    "Rows 3–4, /users/invite",
  ],
  [
    "Pre-requisite",
    "Auth & access",
    "permission tables seeded",
    "permission + role_permission in schema; login returns permissions.can and permissions.dataScope to the React app.",
    "All gated screens",
  ],
  [
    "Assumption",
    "Auth & access",
    "SafeIn5 admin",
    "is_platform_admin = true → all tenants and all data (dataScope.kind = platform).",
    "Admin-only rows",
  ],
  [
    "Assumption",
    "Auth & access",
    "Client admin",
    "tenant_admin → full tenant data plus shared library rows where tenant_id IS NULL (documents, content packs).",
    "Tenant-scoped rows",
  ],
  [
    "Assumption",
    "Auth & access",
    "Site roles",
    "site_manager and supervisor → only sites in user_site_membership (+ shared library read). Workers are PWA-scoped similarly.",
    "Supervisor/client site rows",
  ],
  [
    "Pre-requisite",
    "Auth & access",
    "Membership before UI",
    "user_tenant_membership required; site screens also need user_site_membership rows for non–tenant-admin users.",
    "Site/people/task rows",
  ],
  ["", "", "", "", ""],
  [
    "Assumption",
    "Bulk import",
    "No setup wizard dependency",
    "Onboarding data enters via independent People, Sites, and Documents bulk imports (see SafeIn5_Bulk_Import_Guide.docx).",
    "Import rows 3–5, 10, 12, 15",
  ],
  [
    "Assumption",
    "Bulk import",
    "Validate then commit",
    "Three-step pattern: upload file → validate (row/cell errors) → commit good rows. Estimates split by validation depth.",
    "Rows 3–5",
  ],
  [
    "Pre-requisite",
    "Bulk import",
    "Import order",
    "Recommended: Sites (and spaces) → People → Documents. Documents may reference sites/spaces that must already exist.",
    "Cross-module rows",
  ],
  [
    "Pre-requisite",
    "Bulk import",
    "Templates published",
    "GET /import/templates/* workbooks match docs/import/ column maps.",
    "Bulk import rows",
  ],
  [
    "Assumption",
    "Bulk import",
    "Manual site approval",
    'Single "Add a site" may create approval_status = pending until tenant_admin approves; bulk-imported sites are live immediately.',
    "Site approve row",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Clients (tenants)",
    "Platform admin only",
    "POST /tenants and client list require SafeIn5 admin unless noted as tenant-scoped reuse.",
    "Client onboarding rows",
  ],
  [
    "Pre-requisite",
    "Clients (tenants)",
    "Community tenant",
    "tenant id = 1 (community) seeded for self-register flow.",
    "Auth register",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Sites & spaces",
    "Tenant exists",
    "site.tenant_id must point at an active client before sites, spaces, or QR labels.",
    "Site/space rows",
  ],
  [
    "Pre-requisite",
    "Sites & spaces",
    "Site detail & approval",
    "Open a site and approve it so it can be used for jobs (pending → approved).",
    "Site approval UI",
  ],
  [
    "Pre-requisite",
    "Sites & spaces",
    "People on site",
    "Site people tab and filters require user_site_membership (role.key = worker | supervisor | site_manager).",
    "Site people / filter rows",
  ],
  [
    "Pre-requisite",
    "Sites & spaces",
    "Add a space",
    "space.site_id must reference an approved site in the same tenant.",
    "Space + QR rows",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Documents",
    "Tenant or library",
    "document.tenant_id NULL = SafeIn5 shared library; non-null = client-owned. Client admin sees both own tenant and shared library.",
    "Document list/upload",
  ],
  [
    "Pre-requisite",
    "Documents",
    "Revision + S3 key",
    "document_revision row and uploaded file required before approve/publish/make-live actions.",
    "Document detail rows",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Content",
    "Pack before attach",
    "content_pack must exist (draft or published) before attaching to a task or space.",
    "Content + task placement rows",
  ],
  [
    "Pre-requisite",
    "Content",
    "Publish before worker use",
    "Workers only see published checklist / Learn 5 revisions on PWA task flow.",
    "PWA + content rows",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Tasks (permits)",
    "Space or site context",
    "work_task links to tenant and usually site/space; crew assignments use user_site_membership.",
    "Task create/crew rows",
  ],
  [
    "Pre-requisite",
    "Tasks (permits)",
    "Templates optional",
    "GET /work-tasks/templates assumes template tasks seeded or created earlier.",
    "Task template rows",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "Echoes (signals)",
    "Site scope for triage",
    "Supervisor echo actions require supervisor or site_manager on the echo's site (tenant_admin bypasses).",
    "Echo queue rows 64–73",
  ],
  [
    "Assumption",
    "Echoes (signals)",
    "Existing signal module",
    "POST/GET signals, acknowledge, and close exist; estimates add filters, assign, classify, history, attachments.",
    "Echo expansion rows",
  ],
  ["", "", "", "", ""],
  [
    "Pre-requisite",
    "People",
    "Invite before login",
    "Invited users have account_status = invited until they use their first OTP; that verify sets active and starts a session.",
    "Invite + people rows",
  ],
  [
    "Pre-requisite",
    "People",
    "Role assignment",
    "tenant_admin is on user_tenant_membership; site jobs (worker/supervisor/site_manager) are on user_site_membership only.",
    "User management rows",
  ],
  ["", "", "", "", ""],
  [
    "Assumption",
    "Client delivery",
    "Environment secrets",
    "Client provides DATABASE_URL, JWT keys, SES identity, S3 bucket, and APP_URL per environment before integration testing.",
    "Deployment",
  ],
  [
    "Assumption",
    "Client delivery",
    "Taxonomy sign-off",
    "Document kind labels, hazard categories, and retention enums are agreed before bulk document import and echo classification go live.",
    "Document + echo rows",
  ],
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
    const inner = match[1];
    if (inner.includes("<r>")) {
      return [...inner.matchAll(/<t[^>]*>([^<]*)<\/t>/g)]
        .map((part) => part[1])
        .join("");
    }
    return inner.match(/<t[^>]*>([^<]*)<\/t>/)?.[1] ?? "";
  });
}

function buildSharedStringsXml(items) {
  const sis = items
    .map((text) => `<si><t xml:space="preserve">${escapeXml(text)}</t></si>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${items.length}" uniqueCount="${items.length}">${sis}</sst>`;
}

function stringIndex(shared, value, sharedMap) {
  if (sharedMap.has(value)) return sharedMap.get(value);
  const index = shared.length;
  shared.push(value);
  sharedMap.set(value, index);
  return index;
}

/** Plain cells — no s= style (workbook theme made styled cells invisible). */
function cellXml(ref, value, shared, sharedMap) {
  if (value === "" || value === null || value === undefined) {
    return `<c r="${ref}"/>`;
  }
  const idx = stringIndex(shared, String(value), sharedMap);
  return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
}

function buildSheetXml(originalSheetXml, shared, sharedMap) {
  const pageMargins =
    originalSheetXml.match(/<pageMargins[^/]*\/>/)?.[0] ??
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>';

  const colWidths = [16, 20, 30, 80, 30];
  const cols = colWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");

  const rowXml = ROWS.map((row, rowIndex) => {
    const r = rowIndex + 1;
    const cells = row
      .map((value, colIndex) => cellXml(columnName(colIndex) + r, value, shared, sharedMap))
      .join("");
    const tall = row[3] && row[3].length > 100;
    const ht = rowIndex === 0 ? ' ht="28"' : tall ? ' ht="54"' : "";
    return `<row r="${r}" spans="1:5"${ht}>${cells}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac xr xr2 xr3" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3">
<dimension ref="A1:E${ROWS.length}"/>
<sheetViews>
  <sheetView tabSelected="1" workbookViewId="0">
    <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    <selection activeCell="A2" sqref="A2"/>
  </sheetView>
</sheetViews>
<sheetFormatPr defaultRowHeight="15" customHeight="1"/>
<cols>${cols}</cols>
<sheetData>${rowXml}</sheetData>
${pageMargins}
</worksheet>`;
}

function normalizePath(name) {
  return name.replaceAll("\\", "/");
}

const entries = readOpcZip(WORKBOOK);
const entryMap = new Map(entries.map((e) => [normalizePath(e.name), e]));

let shared = parseSharedStrings(
  entryMap.get("xl/sharedStrings.xml")?.data.toString("utf8") ?? "",
);
const sharedMap = new Map(shared.map((text, index) => [text, index]));

const wb = entryMap.get("xl/workbook.xml").data.toString("utf8");
const rels = entryMap.get("xl/_rels/workbook.xml.rels").data.toString("utf8");
const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [
    m[1],
    m[2].replaceAll("\\", "/"),
  ]),
);
const sheetMeta = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(
  (m) => ({
    name: m[1],
    path: "xl/" + relMap[m[2]].replace(/^\.\//, ""),
  }),
);

const targetName =
  sheetMeta.find((s) => s.name.replaceAll("&amp;", "&") === SHEET_NAME)?.name ??
  sheetMeta.find((s) => /pre req/i.test(s.name))?.name;
const target = sheetMeta.find((s) => s.name === targetName);
if (!target) {
  throw new Error(
    `Sheet "${SHEET_NAME}" not found. Available: ${sheetMeta.map((s) => s.name).join(", ")}`,
  );
}

const originalSheetXml = entryMap.get(target.path).data.toString("utf8");
entryMap.set(target.path, {
  name: target.path.replaceAll("/", "\\"),
  data: Buffer.from(buildSheetXml(originalSheetXml, shared, sharedMap), "utf8"),
});
entryMap.set("xl/sharedStrings.xml", {
  name: "xl\\sharedStrings.xml",
  data: Buffer.from(buildSharedStringsXml(shared), "utf8"),
});

function writeWorkbook(outputPath) {
  writeOpcZip(
    outputPath,
    [...entryMap.values()].map((e) => ({
      name: e.name.replaceAll("/", "\\"),
      data: e.data,
    })),
  );
}

let outputPath = WORKBOOK;
try {
  writeWorkbook(outputPath);
} catch (err) {
  if (err?.code !== "EBUSY") throw err;
  copyFileSync(WORKBOOK, WORKBOOK_FALLBACK);
  outputPath = WORKBOOK_FALLBACK;
  writeWorkbook(outputPath);
  console.warn(`Original locked — wrote ${WORKBOOK_FALLBACK}. Close Excel and replace the original.`);
}

console.log(`Updated ${outputPath}`);
console.log(`Sheet: ${SHEET_NAME} (${ROWS.length} rows, ${shared.length} shared strings)`);
console.log(`BE estimate referenced: ${totals.totalDays} days / ${totals.totalHours} hours`);
