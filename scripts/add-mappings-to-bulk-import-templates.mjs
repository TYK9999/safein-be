import { join, resolve } from "node:path";

import { readOpcZip, writeOpcZip } from "./lib/xlsx.mjs";
import { columnMappings } from "./generate-bulk-import-column-map.mjs";

/**
 * Writes the field mapping into the data tabs of the bulk-import templates.
 *
 * Every data tab keeps its own header on row 1 and gains two guide rows:
 *   row 2  UI: <name shown on the website>
 *   row 3  DB: <table> - <field>
 * Data then starts on row 4. No extra tab is added; any "Field Mapping" tab
 * left by an earlier run is removed.
 */
const root = resolve(import.meta.dirname, "..");

const templates = [
  {
    key: "People",
    path: join(
      root,
      "docs",
      "template",
      "SafeIn5_Bulk_People_Import_Template.xlsx",
    ),
  },
  {
    key: "Site",
    path: join(
      root,
      "docs",
      "template",
      "SafeIn5_Bulk_Site_Import_Template.xlsx",
    ),
  },
  {
    key: "Document",
    path: join(
      root,
      "docs",
      "template",
      "SafeIn5_Bulk_Document_Import_Template.xlsx",
    ),
  },
];

const UI_PREFIX = "UI: ";
const DB_PREFIX = "DB: ";
const GUIDE_ROWS = 2;
const INSTRUCTION_NOTE =
  "Rows 2 and 3 of every data tab are guides, not data: row 2 is the name you see on the website and row 3 is where SafeIn5 stores it. Leave them in place and type your rows under the shaded examples. Full notes are in SafeIn5_Bulk_Import_Column_Map.xlsx.";

const MAPPING_FONTS = {
  ui: '<font><b val="1"/><color rgb="0017225B"/><sz val="9"/><name val="Calibri"/></font>',
  db: '<font><i val="1"/><color rgb="00475569"/><sz val="9"/><name val="Calibri"/></font>',
};
const MAPPING_FILLS = {
  ui: '<fill><patternFill patternType="solid"><fgColor rgb="00F2F6FF"/><bgColor rgb="00F2F6FF"/></patternFill></fill>',
  db: '<fill><patternFill patternType="solid"><fgColor rgb="00F6F7F9"/><bgColor rgb="00F6F7F9"/></patternFill></fill>',
};

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function textEntry(entries, name) {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`Missing ${name}`);
  return entry.data.toString("utf8");
}

function replaceTextEntry(entries, name, text) {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`Missing ${name}`);
  entry.data = Buffer.from(text, "utf8");
}

function normalizePart(target) {
  const normalized = target.replaceAll("\\", "/").replace(/^\/+/, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

/** Inner text of every `<t>` in a row block, in document order. */
function rowTexts(rowXml) {
  return [...rowXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
      .replaceAll(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))),
  );
}

function splitRows(sheetXml) {
  const data = sheetXml.match(
    /<sheetData\b[^>]*\/>|<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/,
  );
  if (!data) throw new Error("Worksheet has no sheetData.");
  const blocks =
    data[0].match(/<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g) ?? [];
  return {
    original: data[0],
    rows: blocks.map((xml) => ({
      xml,
      number: Number(xml.match(/\br="(\d+)"/)?.[1] ?? 0),
    })),
  };
}

function shiftRow(rowXml, delta) {
  if (delta === 0) return rowXml;
  return rowXml
    .replace(/(<row\b[^>]*?\br=")(\d+)(")/, (_, head, number, tail) => {
      return `${head}${Number(number) + delta}${tail}`;
    })
    .replace(
      /(<c\b[^>]*?\br=")([A-Z]+)(\d+)(")/g,
      (_, head, column, number, tail) =>
        `${head}${column}${Number(number) + delta}${tail}`,
    );
}

/**
 * Adds a `<font>` / `<fill>` / `<xf>` to styles.xml unless an identical one is
 * already there, and returns its index. Reusing an identical entry keeps the
 * script safe to run twice.
 */
function ensureStyleChild(styles, listTag, childTag, childXml) {
  const list = styles.match(
    new RegExp(`<${listTag}\\b[^>]*>[\\s\\S]*?</${listTag}>`),
  );
  if (!list) throw new Error(`styles.xml has no <${listTag}>`);
  const children =
    list[0].match(
      new RegExp(
        `<${childTag}\\b[^>]*/>|<${childTag}\\b[^>]*>[\\s\\S]*?</${childTag}>`,
        "g",
      ),
    ) ?? [];

  const existing = children.indexOf(childXml);
  if (existing !== -1) return { styles, index: existing };

  children.push(childXml);
  const rebuilt = `<${listTag} count="${children.length}">${children.join("")}</${listTag}>`;
  return {
    styles: styles.replace(list[0], rebuilt),
    index: children.length - 1,
  };
}

function ensureMappingStyles(entries) {
  let styles = textEntry(entries, "xl/styles.xml");
  const indices = {};

  for (const kind of ["ui", "db"]) {
    const font = ensureStyleChild(styles, "fonts", "font", MAPPING_FONTS[kind]);
    styles = font.styles;
    const fill = ensureStyleChild(styles, "fills", "fill", MAPPING_FILLS[kind]);
    styles = fill.styles;
    const xf = ensureStyleChild(
      styles,
      "cellXfs",
      "xf",
      `<xf numFmtId="0" fontId="${font.index}" fillId="${fill.index}" borderId="0" applyFont="1" applyFill="1" applyAlignment="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf>`,
    );
    styles = xf.styles;
    indices[kind] = xf.index;
  }

  replaceTextEntry(entries, "xl/styles.xml", styles);
  return indices;
}

function removeSheet(entries, sheetName) {
  let workbook = textEntry(entries, "xl/workbook.xml");
  const sheet = workbook.match(
    new RegExp(`<sheet\\b[^>]*name="${sheetName}"[^>]*/>`),
  )?.[0];
  if (!sheet) return false;

  let relationships = textEntry(entries, "xl/_rels/workbook.xml.rels");
  let contentTypes = textEntry(entries, "[Content_Types].xml");
  const relationshipId = sheet.match(/\br:id="([^"]+)"/)?.[1];
  const relationship = [...relationships.matchAll(/<Relationship\b[^>]*\/>/g)]
    .map((match) => match[0])
    .find((tag) => tag.includes(`Id="${relationshipId}"`));
  const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1];

  replaceTextEntry(entries, "xl/workbook.xml", workbook.replace(sheet, ""));
  if (relationship) {
    replaceTextEntry(
      entries,
      "xl/_rels/workbook.xml.rels",
      relationships.replace(relationship, ""),
    );
  }
  if (target) {
    const part = normalizePart(target);
    const override = contentTypes.match(
      new RegExp(`<Override\\b[^>]*PartName="/${part}"[^>]*/>`),
    )?.[0];
    if (override) {
      replaceTextEntry(
        entries,
        "[Content_Types].xml",
        contentTypes.replace(override, ""),
      );
    }
    const index = entries.findIndex((entry) => entry.name === part);
    if (index !== -1) entries.splice(index, 1);
  }
  return true;
}

function sheetPath(entries, sheetName) {
  const workbook = textEntry(entries, "xl/workbook.xml");
  const sheet = workbook.match(
    new RegExp(`<sheet\\b[^>]*name="${sheetName}"[^>]*/>`),
  )?.[0];
  if (!sheet) throw new Error(`Workbook has no sheet named ${sheetName}`);
  const relationshipId = sheet.match(/\br:id="([^"]+)"/)?.[1];
  const relationships = textEntry(entries, "xl/_rels/workbook.xml.rels");
  const relationship = [...relationships.matchAll(/<Relationship\b[^>]*\/>/g)]
    .map((match) => match[0])
    .find((tag) => tag.includes(`Id="${relationshipId}"`));
  const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1];
  if (!target) throw new Error(`No worksheet part for ${sheetName}`);
  return normalizePart(target);
}

function sheetNames(entries) {
  const workbook = textEntry(entries, "xl/workbook.xml");
  return [...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\/>/g)].map(
    (match) => match[1],
  );
}

/** 'Role (Worker / Supervisor / Site Manager) *' -> 'role' */
function normalizeHeader(text) {
  return text
    .replaceAll(/\([^)]*\)/g, " ")
    .replaceAll("*", " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function databaseText(mapping) {
  const [, , , , , , table, field, match] = mapping;
  const missing = (value) => !value || value === "—" || value === "(none)";
  if (match === "Gap" || (missing(table) && missing(field))) {
    return `${DB_PREFIX}not stored yet`;
  }
  if (missing(field)) return `${DB_PREFIX}${table}`;
  if (missing(table)) return `${DB_PREFIX}${field}`;
  return `${DB_PREFIX}${table} - ${field}`;
}

function guideRowXml(rowNumber, values, style) {
  const cells = values
    .map(
      (value, index) =>
        `<c r="${columnName(index)}${rowNumber}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`,
    )
    .join("");
  return `<row r="${rowNumber}">${cells}</row>`;
}

/** Puts the UI/DB guide rows directly under the header of one data tab. */
function annotateDataSheet(sheetXml, mappings, label, styles) {
  const { original, rows } = splitRows(sheetXml);
  const header = rows.find((row) => row.number === 1);
  if (!header) throw new Error(`${label}: no header row`);

  const headers = rowTexts(header.xml);
  if (headers.length === 0) throw new Error(`${label}: empty header row`);

  const byHeader = new Map(
    mappings.map((mapping) => [normalizeHeader(mapping[2]), mapping]),
  );
  const uiValues = [];
  const dbValues = [];
  for (const text of headers) {
    const mapping = byHeader.get(normalizeHeader(text));
    if (!mapping) throw new Error(`${label}: no mapping for column "${text}"`);
    uiValues.push(`${UI_PREFIX}${mapping[4]}`);
    dbValues.push(databaseText(mapping));
  }

  const second = rows.find((row) => row.number === 2);
  const annotated = second
    ? rowTexts(second.xml)[0]?.startsWith(UI_PREFIX)
    : false;
  const delta = annotated ? 0 : GUIDE_ROWS;
  const rest = rows.filter((row) => {
    if (row.number <= 1) return false;
    return !(annotated && row.number <= 1 + GUIDE_ROWS);
  });

  const body = [
    header.xml,
    guideRowXml(2, uiValues, styles.ui),
    guideRowXml(3, dbValues, styles.db),
    ...rest.map((row) => shiftRow(row.xml, delta)),
  ].join("");

  const lastRow = Math.max(3, ...rest.map((row) => row.number + delta));
  const lastColumn = columnName(headers.length - 1);

  return sheetXml
    .replace(original, `<sheetData>${body}</sheetData>`)
    .replace(
      /<dimension\b[^>]*\/>/,
      `<dimension ref="A1:${lastColumn}${lastRow}"/>`,
    )
    .replace(
      /<pane\b[^>]*\/>/,
      `<pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>`,
    )
    .replace(
      /<autoFilter\b[^>]*\/>/,
      `<autoFilter ref="A1:${lastColumn}${lastRow}"/>`,
    );
}

/** Adds the "rows 2 and 3 are guides" line to the Instructions tab. */
function annotateInstructions(sheetXml) {
  const { original, rows } = splitRows(sheetXml);
  if (rows.some((row) => rowTexts(row.xml).includes(INSTRUCTION_NOTE))) {
    return sheetXml;
  }
  const lastRow = Math.max(1, ...rows.map((row) => row.number));
  const lastCell = [...sheetXml.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*>/g)]
    .map((match) => match[1])
    .pop();
  const column = lastCell ?? "A";
  const style = rows
    .flatMap((row) => [...row.xml.matchAll(/<c\b[^>]*\bs="(\d+)"[^>]*>/g)])
    .map((match) => match[1])
    .pop();
  const rowNumber = lastRow + 2;
  const cell = `<c r="${column}${rowNumber}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t xml:space="preserve">${escapeXml(INSTRUCTION_NOTE)}</t></is></c>`;
  const body = `${original
    .replace(/^<sheetData\b[^>]*>/, "")
    .replace(/<\/sheetData>$/, "")}<row r="${rowNumber}">${cell}</row>`;

  return sheetXml
    .replace(original, `<sheetData>${body}</sheetData>`)
    .replace(
      /<dimension\b[^>]*ref="([A-Z]+)\d*:?([A-Z]*)\d*"\/>/,
      (_, first, second) =>
        `<dimension ref="${first}1:${second || column}${rowNumber}"/>`,
    );
}

let updated = 0;

for (const template of templates) {
  const entries = readOpcZip(template.path);
  const removed = removeSheet(entries, "Field Mapping");
  const styles = ensureMappingStyles(entries);

  const mappings = columnMappings.filter(
    (row) =>
      row[0] === template.key &&
      row[1] !== "—" &&
      !row[2].startsWith("(not in template)"),
  );
  const dataSheets = sheetNames(entries).filter(
    (name) => name !== "Instructions",
  );

  for (const name of dataSheets) {
    const part = sheetPath(entries, name);
    const sheetMappings = mappings.filter((row) => row[1] === name);
    if (sheetMappings.length === 0) {
      throw new Error(`${template.key}: no mappings for sheet ${name}`);
    }
    replaceTextEntry(
      entries,
      part,
      annotateDataSheet(
        textEntry(entries, part),
        sheetMappings,
        `${template.key}/${name}`,
        styles,
      ),
    );
  }

  const instructions = sheetPath(entries, "Instructions");
  replaceTextEntry(
    entries,
    instructions,
    annotateInstructions(textEntry(entries, instructions)),
  );

  writeOpcZip(template.path, entries);
  updated += 1;
  console.log(
    `${template.path}: guide rows on ${dataSheets.length} tab(s)${removed ? "; removed Field Mapping tab" : ""}`,
  );
}

console.log(`Updated ${updated} template(s).`);
