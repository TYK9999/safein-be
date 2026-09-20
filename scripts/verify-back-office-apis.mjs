import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const input = join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx");
const entries = readOpcZip(input);
const byName = Object.fromEntries(entries.map((e) => [e.name, e.data.toString("utf8")]));

const shared = [...byName["xl/sharedStrings.xml"].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);

function cv(cell) {
  const t = cell.match(/t="([^"]+)"/)?.[1];
  const v = cell.match(/<v>([^<]*)<\/v>/)?.[1] ?? "";
  if (t === "s") return shared[Number(v)] ?? "";
  return v;
}

const xml = byName["xl/worksheets/sheet6.xml"];
for (const row of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
  const rn = row.match(/r="(\d+)"/)?.[1];
  const cells = {};
  for (const c of row.match(/<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
    const ref = c.match(/r="([^"]+)"/)?.[1];
    if (!ref) continue;
    const col = ref.replace(/\d+/, "");
    cells[col] = cv(c);
  }
  const g = cells.G ?? "";
  const h = cells.H ?? "";
  const d = cells.D ?? "";
  const a = (cells.A ?? "").slice(0, 50);
  if (g || h || d || a) {
    console.log(`R${rn} | D=${d} | H=${h} | A=${a} | G=${g.slice(0, 70)}`);
  }
}
