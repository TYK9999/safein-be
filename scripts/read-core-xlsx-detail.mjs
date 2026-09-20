import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const input = join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx");
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
  return { col: colToIndex(m[1]), row: Number(m[2]) - 1, ref };
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
      rows.get(row)[String.fromCharCode(65 + col)] = getCellValue(cell, shared);
    }
  }
  return rows;
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

for (const sheet of sheets) {
  const rows = readSheet(byName[sheet.path], shared);
  console.log(`\n========== ${sheet.name} ==========`);
  for (const rowNum of [...rows.keys()].sort((a, b) => a - b)) {
    const r = rows.get(rowNum);
    const parts = ["A", "B", "C", "D", "E", "F", "G", "H"]
      .filter((c) => r[c])
      .map((c) => `${c}=${JSON.stringify(String(r[c]).slice(0, 80))}`);
    if (parts.length) console.log(`R${rowNum + 1}: ${parts.join("  ")}`);
  }
}
