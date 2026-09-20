import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const input = join(import.meta.dirname, "..", "docs", "SafeIn5 Core (2) BE Estimation.xlsx");
const entries = readOpcZip(input);
const byName = Object.fromEntries(
  entries.map((e) => [e.name.replaceAll("\\", "/"), e.data.toString("utf8")]),
);

const wb = byName["xl/workbook.xml"];
const rels = byName["xl/_rels/workbook.xml.rels"];
const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

const sheets = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(
  (m) => ({
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
      rows.get(row)[col] = getCellValue(cell, shared);
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

const bo = sheets.find((s) => s.name === "Back Office App (2)");
const grid = readSheet(bo.path);
console.log("Headers:", grid[0].slice(0, 10).join(" | "));
console.log("Row 2 totals:", {
  F: grid[1][5],
  G: grid[1][6],
  H: grid[1][7],
  I: grid[1][8],
  J: grid[1][9],
});
let sumI = 0;
for (let r = 2; r < grid.length; r++) {
  const d = Number(grid[r][8]);
  if (!Number.isNaN(d)) sumI += d;
}
console.log("Sum col I:", sumI);
