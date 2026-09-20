import { readOpcZip } from "./lib/xlsx.mjs";
import { join } from "node:path";

const input = join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx");
const entries = readOpcZip(input);
console.log("Files in zip:", entries.map((e) => e.name).join(", "));
