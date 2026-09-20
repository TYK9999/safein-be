import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const file = process.argv[2] ?? "SafeIn5_Back_Office_BE_Estimation.xlsx";
const entries = readOpcZip(join(import.meta.dirname, "..", "docs", file));
const byName = Object.fromEntries(
  entries.map((e) => [e.name.replaceAll("\\", "/"), e.data.toString("utf8")]),
);
const rels = byName["xl/_rels/workbook.xml.rels"];
const wb = byName["xl/workbook.xml"];
const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [
    m[1],
    m[2].replaceAll("\\", "/"),
  ]),
);
const sheets = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map((m) => ({
  name: m[1],
  path: "xl/" + relMap[m[2]].replace(/^\.\//, ""),
}));
const target = sheets.find((s) => s.name === "Back Office App (2)");
const xml = byName[target.path];

console.log("=== dimension ===");
console.log(xml.match(/<dimension[^/]*\/>/)?.[0]);

console.log("\n=== sheetView ===");
console.log(xml.match(/<sheetViews>[\s\S]*?<\/sheetViews>/)?.[0]);

console.log("\n=== cols ===");
console.log(xml.match(/<cols>[\s\S]*?<\/cols>/)?.[0]);

console.log("\n=== sheetFormatPr ===");
console.log(xml.match(/<sheetFormatPr[^/]*\/>/)?.[0]);

console.log("\n=== merges (first 400 chars) ===");
console.log(xml.match(/<mergeCells[\s\S]*?<\/mergeCells>/)?.[0]?.slice(0, 400));

console.log("\n=== row 1 ===");
console.log(xml.match(/<row r="1"[^>]*>[\s\S]*?<\/row>/)?.[0]);
