import { join } from 'node:path';
import { readOpcZip, writeOpcZip } from './lib/xlsx.mjs';
import { HEADER, ROWS } from './lib/core-workflow-rows.mjs';

const INPUT = join(import.meta.dirname, '..', 'docs', 'SafeIn5 Core (2).xlsx');
const SHEET_NAME = 'workflow';

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function colName(index) {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function inlineCell(ref, value, style) {
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function buildWorksheetXml(rows) {
  const maxCol = HEADER.length;
  const lastCol = colName(maxCol - 1);
  const allRows = [HEADER, ...rows];
  const sheetRows = allRows
    .map((row, rowIndex) => {
      const rowNum = rowIndex + 1;
      const style = rowIndex === 0 ? 1 : 0;
      const height = rowIndex === 0 ? ' ht="30" customHeight="1"' : ' ht="48" customHeight="1"';
      const cells = Array.from({ length: maxCol }, (_, colIndex) =>
        inlineCell(colName(colIndex) + rowNum, row[colIndex] ?? '', style),
      ).join('');
      return `<row r="${rowNum}"${height}>${cells}</row>`;
    })
    .join('');

  const widths = [8, 22, 22, 36, 22, 42, 48, 48, 42, 48, 42]
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac"
  xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">
  <dimension ref="A1:${lastCol}${allRows.length}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${widths}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastCol}${allRows.length}"/>
</worksheet>`;
}

function normalizePath(name) {
  return name.replaceAll('\\', '/');
}

const entries = readOpcZip(INPUT);
const entryMap = new Map(entries.map((e) => [normalizePath(e.name), e]));

const wbPath = 'xl/workbook.xml';
const relsPath = 'xl/_rels/workbook.xml.rels';
const ctPath = '[Content_Types].xml';

let wb = entryMap.get(wbPath).data.toString('utf8');
const rels = entryMap.get(relsPath).data.toString('utf8');
const sheetXml = buildWorksheetXml(ROWS);

if (wb.includes(`name="${SHEET_NAME}"`)) {
  const existing = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)];
  const target = existing.find((m) => m[1] === SHEET_NAME);
  const relMap = Object.fromEntries(
    [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  const sheetPath = normalizePath('xl/' + relMap[target[2]].replace(/^\.\//, ''));
  entryMap.set(sheetPath, {
    name: sheetPath.replaceAll('/', '\\'),
    data: Buffer.from(sheetXml, 'utf8'),
  });
} else {
  const sheetEntries = [...entryMap.keys()].filter((k) =>
    /xl\/worksheets\/sheet\d+\.xml$/.test(k),
  );
  const nextSheetNum =
    Math.max(...sheetEntries.map((k) => Number(k.match(/sheet(\d+)/)[1])), 0) + 1;
  const sheetFile = `xl/worksheets/sheet${nextSheetNum}.xml`;
  const nextRelId = `rId${Math.max(...[...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1])), 0) + 1}`;
  const nextSheetId =
    Math.max(...[...wb.matchAll(/sheetId="(\d+)"/g)].map((m) => Number(m[1])), 0) + 1;

  entryMap.set(sheetFile, {
    name: sheetFile.replaceAll('/', '\\'),
    data: Buffer.from(sheetXml, 'utf8'),
  });

  wb = wb.replace(
    '</sheets>',
    `<sheet name="${SHEET_NAME}" sheetId="${nextSheetId}" r:id="${nextRelId}"/></sheets>`,
  );
  entryMap.set(wbPath, {
    name: wbPath.replaceAll('/', '\\'),
    data: Buffer.from(wb, 'utf8'),
  });

  const newRels = rels.replace(
    '</Relationships>',
    `<Relationship Id="${nextRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${nextSheetNum}.xml"/></Relationships>`,
  );
  entryMap.set(relsPath, {
    name: relsPath.replaceAll('/', '\\'),
    data: Buffer.from(newRels, 'utf8'),
  });

  let ct = entryMap.get(ctPath).data.toString('utf8');
  if (!ct.includes(`/xl/worksheets/sheet${nextSheetNum}.xml`)) {
    ct = ct.replace(
      '</Types>',
      `<Override PartName="/xl/worksheets/sheet${nextSheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    );
    entryMap.set(ctPath, { name: ctPath, data: Buffer.from(ct, 'utf8') });
  }
}

writeOpcZip(
  INPUT,
  [...entryMap.values()].map((e) => ({
    name: e.name.replaceAll('/', '\\'),
    data: e.data,
  })),
);

console.log(`Wrote sheet "${SHEET_NAME}" to ${INPUT}`);
console.log(`Data rows: ${ROWS.length} (plus header). Dev # 27–44 = back office after PULSE.`);
