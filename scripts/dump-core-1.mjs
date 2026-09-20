import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const input = join(
  import.meta.dirname,
  "..",
  "docs",
  process.argv[2] ?? "SafeIn5 Core (1).xlsx",
);
const entries = readOpcZip(input);
const byName = Object.fromEntries(
  entries.map((e) => [e.name.replaceAll("\\", "/"), e.data.toString("utf8")]),
);

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>[\s\S]*?<\/si>/g)].map((si) =>
    [...si[0].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join(""),
  );
}

function colToIndex(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseCell(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  return { col: colToIndex(m[1]), row: Number(m[2]) - 1 };
}

function getCellValue(cellXml, shared) {
  const t = cellXml.match(/t="([^"]+)"/)?.[1];
  const v = cellXml.match(/<v>([^<]*)<\/v>/)?.[1] ?? "";
  if (t === "s") return shared[Number(v)] ?? "";
  if (t === "inlineStr") {
    return [...cellXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join("");
  }
  return v;
}

function readSheet(xml, shared) {
  const rows = new Map();
  for (const rowXml of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    for (const cell of rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
      const ref = cell.match(/r="([^"]+)"/)?.[1];
      if (!ref) continue;
      const { col, row } = parseCell(ref);
      if (!rows.has(row)) rows.set(row, {});
      rows.get(row)[colName(col)] = getCellValue(cell, shared);
    }
  }
  return rows;
}

function colName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    n -= 1;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}

const shared = parseSharedStrings(byName["xl/sharedStrings.xml"]);
const wb = byName["xl/workbook.xml"];
const rels = byName["xl/_rels/workbook.xml.rels"];
const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [
    m[1],
    m[2].replaceAll("\\", "/"),
  ]),
);

const sheets = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(
  (m) => ({
    name: m[1],
    path: "xl/" + relMap[m[2]].replace(/^\.\//, ""),
  }),
);

console.log("SHEETS:", sheets.map((s) => s.name).join(" | "));
const target = sheets.find((s) => s.name === "Back Office App (2)");
if (!target) {
  console.error("Back Office App (2) not found");
  process.exit(1);
}

const rows = readSheet(byName[target.path], shared);
const maxCols = Math.max(
  ...[...rows.values()].map((r) => Math.max(...Object.keys(r).map((k) => k.charCodeAt(0) - 64))),
);
console.log(`Rows: ${rows.size}  Max col index: ${maxCols}`);
console.log(`\n========== ${target.name} ==========`);
for (const rowNum of [...rows.keys()].sort((a, b) => a - b)) {
  const r = rows.get(rowNum);
  const cols = Object.keys(r).sort();
  const parts = cols.map((c) => `${c}=${JSON.stringify(String(r[c]).slice(0, 90))}`);
  console.log(`R${rowNum + 1}: ${parts.join("  ")}`);
}
