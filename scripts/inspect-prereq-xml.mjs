import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const file = process.argv[2] || join(import.meta.dirname, "..", "docs", "SafeIn5 Core (2).new.xlsx");
const entries = readOpcZip(file);
const byPath = new Map(entries.map((e) => [e.name.replaceAll("\\", "/"), e]));

const wb = byPath.get("xl/workbook.xml").data.toString("utf8");
const rels = byPath.get("xl/_rels/workbook.xml.rels").data.toString("utf8");
const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [m[1], m[2].replaceAll("\\", "/")]),
);

for (const m of wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)) {
  const path = "xl/" + relMap[m[2]].replace(/^\.\//, "");
  if (!/pre req/i.test(m[1])) continue;
  const xml = byPath.get(path).data.toString("utf8");
  console.log("FILE:", file);
  console.log("SHEET:", m[1], path);
  console.log(xml.slice(0, 2000));
  console.log("\n--- cols block ---\n");
  const cols = xml.match(/<cols>[\s\S]*?<\/cols>/)?.[0];
  console.log(cols || "(no cols)");
}
