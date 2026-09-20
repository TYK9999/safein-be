import { join } from "node:path";
import { readOpcZip } from "./lib/xlsx.mjs";

const entries = readOpcZip(join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx"));
const wb = entries.find((e) => e.name.replaceAll("\\", "/").endsWith("workbook.xml"));
const names = [...wb.data.toString().matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
console.log(names.join("\n"));
