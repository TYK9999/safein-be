import { join } from 'node:path';
import { readOpcZip, writeOpcZip } from './lib/xlsx.mjs';
import { APP_DETAILS_BY_ROW } from './lib/core3-workflow-app-details.mjs';

const INPUT = join(import.meta.dirname, '..', 'docs', 'SafeIn5 Core (3).xlsx');
const SHEET_PATHS = ['xl/worksheets/sheet8.xml', 'xl\\worksheets\\sheet8.xml'];
const SST_PATHS = ['xl/sharedStrings.xml', 'xl\\sharedStrings.xml'];

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sharedStringXml(text) {
  const escaped = escapeXml(text);
  return `<si><t xml:space="preserve">${escaped}</t></si>`;
}

function lineCount(text) {
  return String(text).split(/\r\n|\n/).length;
}

function rowHeight(app, details) {
  const lines = Math.max(lineCount(app), lineCount(details));
  return Math.min(200, Math.max(56, lines * 18 + 20));
}

function findEntry(entryMap, candidates) {
  for (const name of candidates) {
    if (entryMap.has(name)) return name;
  }
  for (const name of entryMap.keys()) {
    const normalised = name.replaceAll('\\', '/');
    if (candidates.some((c) => c.replaceAll('\\', '/') === normalised)) return name;
  }
  throw new Error(`Missing entry: ${candidates.join(', ')}`);
}

const entries = readOpcZip(INPUT);
const entryMap = new Map(entries.map((e) => [e.name, e]));
const sheetKey = findEntry(entryMap, SHEET_PATHS);
const sstKey = findEntry(entryMap, SST_PATHS);

let sheetXml = entryMap.get(sheetKey).data.toString('utf8');
let sstXml = entryMap.get(sstKey).data.toString('utf8');

const uniqueCount = (sstXml.match(/<si>/g) ?? []).length;
const countMatch = sstXml.match(/count="(\d+)"/);
const uniqueMatch = sstXml.match(/uniqueCount="(\d+)"/);
const previousCount = Number(countMatch?.[1] ?? uniqueCount);
const previousUnique = Number(uniqueMatch?.[1] ?? uniqueCount);

const additions = [];
const rowIndex = {};
let nextIndex = previousUnique;

for (const [row, values] of Object.entries(APP_DETAILS_BY_ROW)) {
  const appIndex = nextIndex++;
  const detailsIndex = nextIndex++;
  additions.push(sharedStringXml(values.app), sharedStringXml(values.details));
  rowIndex[row] = { appIndex, detailsIndex, height: rowHeight(values.app, values.details) };
}

if (!sstXml.includes('</sst>')) {
  throw new Error('sharedStrings.xml has no </sst>');
}

sstXml = sstXml
  .replace(`count="${previousCount}"`, `count="${previousCount + additions.length}"`)
  .replace(`uniqueCount="${previousUnique}"`, `uniqueCount="${previousUnique + additions.length}"`)
  .replace('</sst>', `${additions.join('')}</sst>`);

let filled = 0;
for (const [row, meta] of Object.entries(rowIndex)) {
  const dEmpty = new RegExp(`<c r="D${row}" s="304"/>`);
  const eEmpty = new RegExp(`<c r="E${row}" s="304"/>`);
  if (!dEmpty.test(sheetXml) || !eEmpty.test(sheetXml)) {
    throw new Error(`Row ${row} App/Details cells are not empty placeholders`);
  }
  sheetXml = sheetXml
    .replace(
      dEmpty,
      `<c r="D${row}" s="304" t="s"><v>${meta.appIndex}</v></c>`,
    )
    .replace(
      eEmpty,
      `<c r="E${row}" s="374" t="s"><v>${meta.detailsIndex}</v></c>`,
    );

  const rowOpen = new RegExp(`<row r="${row}"(?=[\\s>])([^>]*)>`);
  const rowMatch = sheetXml.match(rowOpen);
  if (!rowMatch) throw new Error(`Row ${row} not found`);
  const attrs = rowMatch[1]
    .replace(/\sht="[^"]*"/, '')
    .replace(/\scustomHeight="[^"]*"/, '');
  sheetXml = sheetXml.replace(
    rowOpen,
    `<row r="${row}"${attrs} ht="${meta.height}" customHeight="1">`,
  );
  filled += 1;
}

entryMap.set(sheetKey, { name: sheetKey, data: Buffer.from(sheetXml, 'utf8') });
entryMap.set(sstKey, { name: sstKey, data: Buffer.from(sstXml, 'utf8') });

writeOpcZip(
  INPUT,
  [...entryMap.values()].map((e) => ({ name: e.name, data: e.data })),
);

console.log(`Filled App + Details on ${filled} Workflow rows in ${INPUT}`);
console.log(`Shared strings ${previousUnique} → ${previousUnique + additions.length}`);
