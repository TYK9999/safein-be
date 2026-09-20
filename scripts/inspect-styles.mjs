import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const file = join(import.meta.dirname, "..", "docs", "SafeIn5 Core (2).new.xlsx");
const entries = readOpcZip(file);
const styles = entries.find((e) => e.name.endsWith("styles.xml")).data.toString("utf8");
const xfs = [...styles.matchAll(/<xf[^>]*\/>/g)].map((m) => m[0]);
for (const i of [0, 1, 3, 9, 301]) {
  console.log(`xf ${i}:`, xfs[i] || "missing");
}
