import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const input = join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx");
const entries = readOpcZip(input);
const byName = Object.fromEntries(entries.map((e) => [e.name, e.data.toString("utf8")]));

const wb = byName["xl/workbook.xml"];
const rels = byName["xl/_rels/workbook.xml.rels"];

const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

const sheets = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(
  (m, i) => ({
    index: i + 1,
    name: m[1],
    path: "xl/" + relMap[m[2]].replace(/^\.\//, ""),
  }),
);

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
    return cellXml.match(/<t[^>]*>([^<]*)<\/t>/)?.[1] ?? "";
  }
  return v;
}

function readSheet(sheetPath) {
  const xml = byName[sheetPath];
  const shared = byName["xl/sharedStrings.xml"]
    ? [...byName["xl/sharedStrings.xml"].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1])
    : [];
  const rows = new Map();
  for (const rowXml of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const rowNum = Number(rowXml.match(/r="(\d+)"/)?.[1] ?? 0) - 1;
    for (const cell of rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
      const ref = cell.match(/r="([^"]+)"/)?.[1];
      if (!ref) continue;
      const { col, row } = parseCell(ref);
      if (!rows.has(row)) rows.set(row, []);
      const arr = rows.get(row);
      arr[col] = getCellValue(cell, shared);
    }
  }
  const maxRow = Math.max(...rows.keys(), 0);
  const maxCol = Math.max(...[...rows.values()].map((r) => r.length), 0);
  const grid = [];
  for (let r = 0; r <= maxRow; r++) {
    const row = rows.get(r) ?? [];
    grid.push(Array.from({ length: maxCol }, (_, c) => row[c] ?? ""));
  }
  return grid;
}

console.log("=== SHEETS ===");
for (const s of sheets) console.log(s.index, s.name);

const target = sheets.find((s) => s.name.includes("Back Office App (2)"));
if (!target) {
  console.error("Sheet not found");
  process.exit(1);
}

const grid = readSheet(target.path);
console.log(`\n=== ${target.name} (${grid.length} rows x ${grid[0]?.length ?? 0} cols) ===`);
for (const [i, row] of grid.entries()) {
  const line = row.map((c) => String(c).replace(/\n/g, " ").slice(0, 60)).join(" | ");
  if (line.trim()) console.log(`${i + 1}: ${line}`);
}
