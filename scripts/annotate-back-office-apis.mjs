import { join } from "node:path";
import { readOpcZip, writeOpcZip } from "./lib/xlsx.mjs";

const HOURS_PER_DAY = 9;
const INPUT = join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx");
const SHEET_NAME = "Back Office App";

/** Match row text (cols A/B/C) to BE APIs + estimate (days @ 9h, Cursor-assisted). */
function mapRowApis(module, feature, story) {
  const text = `${module} ${feature} ${story}`.toLowerCase();

  if (/scafold backend|backend project/.test(text)) {
    return { apis: "NestJS scaffold · health · config · DB pool (exists)", days: 0 };
  }
  if (/scafold pwa|website app flow/.test(text)) {
    return { apis: "— (FE scaffold)", days: 0 };
  }
  if (/ai will be used|ai extraction|classification of echo/.test(text)) {
    return {
      apis: "POST /take5/extract · POST /documents/:id/extract · POST /signals/:id/classify",
      days: 1.5,
    };
  }
  if (/audio\/video player|streamable/.test(text)) {
    return {
      apis: "GET /uploads/:token/playback · GET /uploads/:token/thumbnail · ffmpeg transcode job",
      days: 1,
    };
  }
  if (/authentication|create user|login|magic link|invite/.test(text)) {
    return {
      apis: "POST /auth/otp/request · POST /auth/otp/verify · POST /users/invite · POST /users · GET /me",
      days: 1,
    };
  }
  if (/client onboarding|add a client/.test(text)) {
    return {
      apis: "POST /tenants · GET /tenants · PATCH /tenants/:id",
      days: 0.75,
    };
  }
  if (/client summary|listing live client|echoes of the week|content library/.test(text)) {
    return {
      apis: "GET /dashboard/summary · GET /tenants · GET /tenants/:id/stats",
      days: 0.75,
    };
  }
  if (/client detail|client site listing|list of client admin/.test(text)) {
    return {
      apis: "GET /tenants/:id · GET /tenants/:id/sites · GET /tenants/:id/admins",
      days: 0.75,
    };
  }
  if (/retention|privacy/.test(text)) {
    return {
      apis: "PATCH /tenants/:id/retention · POST /tenants/:id/privacy-requests",
      days: 1,
    };
  }
  if (/upload a document|document - one at a time|bulk import.*document/.test(text)) {
    return {
      apis: "POST /documents/presign · POST /documents · POST /documents/bulk-import",
      days: 1.25,
    };
  }
  if (/listing of all the documents|delete document/.test(text)) {
    return {
      apis: "GET /documents · DELETE /documents/:id · tenant/site scope filter",
      days: 0.75,
    };
  }
  if (/document detail|attached space detail/.test(text)) {
    return {
      apis: "GET /documents/:id · GET /documents/:id/placements · GET /documents/:id/preview",
      days: 0.75,
    };
  }
  if (/document republish|reupload the file/.test(text)) {
    return {
      apis: "POST /documents/:id/revisions · PATCH /documents/:id/publish",
      days: 0.75,
    };
  }
  if (/upload content|job checklist.*learn 5/.test(text) && /upload/.test(text)) {
    return {
      apis: "POST /content-packs/presign · POST /content-packs · POST /content-packs/:id/prompts",
      days: 1.25,
    };
  }
  if (/listing of job checklist|publish option|delete option/.test(text)) {
    return {
      apis: "GET /content-packs · PATCH /content-packs/:id/publish · DELETE /content-packs/:id",
      days: 0.75,
    };
  }
  if (/republish.*checklist|learn 5 details republish/.test(text)) {
    return {
      apis: "POST /content-packs/:id/republish · POST /content-packs/:id/prompts",
      days: 0.75,
    };
  }
  if (/create a new task|task - one at a time|duplicate feature/.test(text)) {
    return {
      apis: "POST /work-tasks · POST /work-tasks/:id/duplicate · GET /work-tasks/templates",
      days: 1.25,
    };
  }
  if (/task list/.test(text)) {
    return { apis: "GET /work-tasks · GET /work-tasks?siteId=&status=", days: 0.5 };
  }
  if (/export the task|pdf\/csv/.test(text)) {
    return { apis: "GET /work-tasks/:id/export?format=pdf|csv", days: 0.75 };
  }
  if (/attachment to the task|attach to the task/.test(text)) {
    return {
      apis: "PATCH /work-tasks/:id/placements · PATCH /work-tasks/:id/content-placements",
      days: 1,
    };
  }
  if (/summary of task|task detail - summary/.test(text)) {
    return { apis: "GET /work-tasks/:id · GET /work-tasks/:id/summary", days: 0.5 };
  }
  if (/everything raised on this task|list of echo/.test(text)) {
    return { apis: "GET /work-tasks/:id/signals", days: 0.5 };
  }
  if (/echoes|echo history|acknowledge|assign to.*supervisor/.test(text)) {
    if (/acknowledge|share echo/.test(text)) {
      return {
        apis: "POST /signals/:id/acknowledge · POST /signals/:id/share · GET /signals/history",
        days: 1,
      };
    }
    if (/assign/.test(text)) {
      return { apis: "POST /signals/:id/assign · PATCH /signals/:id", days: 0.75 };
    }
    return {
      apis: "GET /signals · GET /signals/:id · PATCH /signals/:id · POST /signals/:id/close",
      days: 1.25,
    };
  }
  if (/add a site|site - one at a time|bulk import.*site/.test(text)) {
    return {
      apis: "POST /sites · POST /sites/bulk-import · GET /users?role=site_manager",
      days: 0.75,
    };
  }
  if (/listing of site/.test(text)) {
    return { apis: "GET /sites · GET /sites/:id", days: 0.5 };
  }
  if (/people tab|users listing|user detail|user onboarding/.test(text)) {
    if (/user detail|back office access|role and scope/.test(text)) {
      return {
        apis: "GET /users/:id · PATCH /users/:id · PATCH /users/:id/back-office-access",
        days: 0.75,
      };
    }
    return {
      apis: "GET /users · GET /sites/:id/members · POST /users/invite",
      days: 0.75,
    };
  }
  if (/site details page|active tasks, spaces and people/.test(text)) {
    return {
      apis: "GET /sites/:id/overview · GET /sites/:id/tasks · GET /sites/:id/spaces",
      days: 0.75,
    };
  }
  if (/space and qr|add a space/.test(text)) {
    return {
      apis: "POST /spaces · GET /spaces · GET /spaces/:id/qr · PATCH /spaces/:id",
      days: 1,
    };
  }
  if (/same as admin/.test(text)) {
    return { apis: "Reuse admin endpoints (tenant-scoped)", days: 0.25 };
  }
  if (/close to admin|supervisor flow/.test(text) && !/documents|content|site|task|echoes/.test(text)) {
    return { apis: "— (section header)", days: 0 };
  }
  if (/analytics/.test(text)) {
    return { apis: "GET /analytics/overview · GET /analytics/capture · GET /analytics/signals", days: 1.5 };
  }
  if (/contact safein admin|privacy request/.test(text)) {
    return { apis: "POST /support/change-requests · email via SES", days: 0.5 };
  }
  if (/pre seed|bulk import/.test(text)) {
    return {
      apis: "POST /import/:resource/validate · POST /import/:resource/commit · GET /import/templates/:resource",
      days: 1.5,
    };
  }
  if (/stepper|set up/.test(text) && /admin flow/.test(text)) {
    return { apis: "— (onboarding wizard UI)", days: 0 };
  }

  return { apis: "—", days: 0 };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>[\s\S]*?<\/si>/g)].map((si) =>
    [...si[0].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join(""),
  );
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

function cellXml(ref, value, shared, sharedMap) {
  if (value === "" || value === null || value === undefined) {
    return `<c r="${ref}"/>`;
  }
  if (typeof value === "number") {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  const idx = stringIndex(shared, String(value), sharedMap);
  return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
}

function getCellValue(cellXml, shared) {
  const t = cellXml.match(/t="([^"]+)"/)?.[1];
  const v = cellXml.match(/<v>([^<]*)<\/v>/)?.[1] ?? "";
  if (t === "s") return shared[Number(v)] ?? "";
  return v;
}

function colToIndex(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseCell(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  return { col: colToIndex(m[1]), row: Number(m[2]) };
}

function readRowCells(rowXml, shared) {
  const cells = {};
  for (const cell of rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
    const ref = cell.match(/r="([^"]+)"/)?.[1];
    if (!ref) continue;
    const col = ref.replace(/\d+/, "");
    cells[col] = getCellValue(cell, shared);
  }
  return cells;
}

const entries = readOpcZip(INPUT);
const entryMap = new Map(entries.map((e) => [e.name.replaceAll("\\", "/"), e]));

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

const target = sheetMeta.find((s) => s.name === SHEET_NAME);
if (!target) {
  throw new Error(`Sheet "${SHEET_NAME}" not found. Available: ${sheetMeta.map((s) => s.name).join(", ")}`);
}

let shared = parseSharedStrings(
  entryMap.get("xl/sharedStrings.xml")?.data.toString("utf8") ?? "",
);
const sharedMap = new Map(shared.map((text, index) => [text, index]));

let sheetXml = entryMap.get(target.path).data.toString("utf8");
const rowBlocks = [...sheetXml.matchAll(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g)];
let totalBeDays = 0;
const summary = [];
const rowMappings = new Map();

for (const [, rowNum, rowAttrs, body] of rowBlocks) {
  const row = Number(rowNum);
  const cells = {};
  for (const cell of body.match(/<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
    const ref = cell.match(/r="([^"]+)"/)?.[1];
    if (!ref) continue;
    const col = ref.replace(/\d+/, "");
    cells[col] = getCellValue(cell, shared);
  }

  if (row === 1) {
    rowMappings.set(row, { apis: "BE APIs needed", days: "BE Estimate (days @ 9h, Cursor)" });
    continue;
  }
  if (row === 2) {
    rowMappings.set(row, { apis: "Total BE (days)", days: "" });
    continue;
  }

  const mapped = mapRowApis(cells.A ?? "", cells.B ?? "", cells.C ?? "");
  rowMappings.set(row, mapped);
  if (mapped.days) {
    totalBeDays += mapped.days;
    summary.push({ row, module: cells.A, apis: mapped.apis, days: mapped.days });
  }
}

rowMappings.set(2, { apis: "Total BE (days)", days: Math.round(totalBeDays * 100) / 100 });

for (const [, rowNum, rowAttrs, body] of rowBlocks) {
  const row = Number(rowNum);
  const mapped = rowMappings.get(row) ?? { apis: "—", days: "" };
  const gCell = cellXml(`G${row}`, mapped.apis, shared, sharedMap);
  const hCell = cellXml(`H${row}`, mapped.days, shared, sharedMap);

  const cleaned = body
    .replace(/<c r="G\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "")
    .replace(/<c r="H\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "");

  const newBody = `${cleaned}${gCell}${hCell}`;
  sheetXml = sheetXml.replace(
    new RegExp(`<row r="${row}"${rowAttrs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>[\\s\\S]*?<\\/row>`),
    `<row r="${row}"${rowAttrs}>${newBody}</row>`,
  );
}

if (sheetXml.includes("<dimension")) {
  sheetXml = sheetXml.replace(/<dimension ref="[^"]+"/, `<dimension ref="A1:H${rowBlocks.length}"`);
}

entryMap.set(target.path, { name: target.path.replaceAll("/", "\\"), data: Buffer.from(sheetXml, "utf8") });
entryMap.set("xl/sharedStrings.xml", {
  name: "xl\\sharedStrings.xml",
  data: Buffer.from(buildSharedStringsXml(shared), "utf8"),
});

writeOpcZip(INPUT, [...entryMap.values()].map((e) => ({
  name: e.name.replaceAll("/", "\\"),
  data: e.data,
})));

console.log(`Updated "${SHEET_NAME}" in ${INPUT}`);
console.log(`Columns added: G = BE APIs needed, H = BE Estimate (days @ ${HOURS_PER_DAY}h, Cursor)`);
console.log(`Total BE estimate: ${Math.round(totalBeDays * 100) / 100} days (${Math.round(totalBeDays * HOURS_PER_DAY * 10) / 10} hours)`);
console.log(`\nRows with BE work (${summary.length}):`);
for (const item of summary) {
  console.log(`  R${item.row} (${item.days}d): ${String(item.module).slice(0, 40)} → ${item.apis.slice(0, 70)}`);
}
