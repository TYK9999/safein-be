import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

/**
 * Minimal xlsx writer. An xlsx file is an OPC package: a ZIP of XML parts.
 * Archive tools such as `tar` cannot produce one, so the ZIP is written here.
 *
 * Styles available to callers, by name:
 *   title | header | subheader | body | example | note
 *   extracted | synthetic | missing_required
 */
const STYLE_INDEX = {
  body: 0,
  header: 1,
  title: 2,
  subheader: 3,
  example: 4,
  note: 5,
  extracted: 6,
  synthetic: 7,
  missing_required: 8,
};

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="15"/><color rgb="FF17225B"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF17225B"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF6B6B6B"/><name val="Calibri"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF17225B"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8EEFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF6D9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDFF5E4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF0CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFAD4D4"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function columnName(index) {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function resolveStyle(name) {
  const index = STYLE_INDEX[name];
  if (index === undefined) {
    throw new Error(`Unknown cell style: ${name}`);
  }
  return index;
}

function cellXml(cell, rowNumber, columnIndex, defaultStyle) {
  const ref = `${columnName(columnIndex)}${rowNumber}`;
  const isObject = cell !== null && typeof cell === 'object';
  const value = isObject ? (cell.v ?? cell.value) : cell;
  const style = resolveStyle(isObject && cell.style ? cell.style : defaultStyle);
  if (typeof value === 'number') {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(value ?? '')}</t></is></c>`;
}

/**
 * @param {{
 *   name: string,
 *   rows: Array<Array<unknown>>,
 *   widths?: number[],
 *   freezeRows?: number,
 *   headerRow?: number,
 *   autoFilter?: boolean,
 *   rowStyle?: (rowIndex: number) => string | undefined,
 * }} sheet
 */
function worksheetXml(sheet) {
  const headerRow = sheet.headerRow ?? 0;
  const maxColumns = Math.max(...sheet.rows.map((row) => row.length));
  const lastColumn = columnName(maxColumns - 1);
  const widths = sheet.widths ?? [];
  const columns = Array.from({ length: maxColumns }, (_, index) => {
    const width = Math.min(widths[index] ?? 24, 120);
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  const rows = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const style =
        sheet.rowStyle?.(rowIndex) ??
        (rowIndex === headerRow ? 'header' : 'body');
      const height = rowIndex === headerRow ? ' ht="30" customHeight="1"' : '';
      return `<row r="${rowNumber}"${height}>${row
        .map((cell, columnIndex) =>
          cellXml(cell, rowNumber, columnIndex, style),
        )
        .join('')}</row>`;
    })
    .join('');

  const freezeRows = sheet.freezeRows ?? headerRow + 1;
  const freeze = freezeRows
    ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/>`
    : '';
  const autoFilter =
    sheet.autoFilter === false
      ? ''
      : `<autoFilter ref="A${headerRow + 1}:${lastColumn}${sheet.rows.length}"/>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${sheet.rows.length}"/>
  <sheetViews><sheetView workbookViewId="0">${freeze}</sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns}</cols>
  <sheetData>${rows}</sheetData>
  ${autoFilter}
</worksheet>`;
}

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let value = -1;
  for (const byte of buffer) {
    value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  }
  return (value ^ -1) >>> 0;
}

/** Timestamps are pinned to the ZIP epoch so output is reproducible. */
function zipParts(entries) {
  const localParts = [];
  const directoryParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const checksum = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12); // 1980-01-01
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    directoryParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const directory = Buffer.concat(directoryParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, directory, end]);
}

/** Read every file from a ZIP/OPC package. Uses the central directory so ZIPs
 * created by Excel (including data-descriptor archives) are supported. */
export function readOpcZip(inputPath) {
  const archive = readFileSync(inputPath);
  let endOffset = -1;
  const searchStart = Math.max(0, archive.length - 65_557);
  for (let index = archive.length - 22; index >= searchStart; index -= 1) {
    if (archive.readUInt32LE(index) === 0x06054b50) {
      endOffset = index;
      break;
    }
  }
  if (endOffset < 0) throw new Error(`ZIP end record not found: ${inputPath}`);

  const entryCount = archive.readUInt16LE(endOffset + 10);
  let cursor = archive.readUInt32LE(endOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory: ${inputPath}`);
    }
    const method = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString('utf8');

    if (archive.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local header for ${name}`);
    }
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = archive.subarray(
      dataStart,
      dataStart + compressedSize,
    );
    const data =
      method === 8
        ? inflateRawSync(compressed)
        : method === 0
          ? Buffer.from(compressed)
          : (() => {
              throw new Error(`Unsupported ZIP method ${method} for ${name}`);
            })();
    entries.push({ name, data });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Write raw files to a ZIP/OPC package. */
export function writeOpcZip(outputPath, entries) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, zipParts(entries));
}

/** Write `sheets` to `outputPath` as an xlsx workbook. */
export function writeXlsx(outputPath, sheets) {
  if (sheets.length === 0) {
    throw new Error('A workbook needs at least one sheet.');
  }
  for (const sheet of sheets) {
    if (sheet.name.length > 31) {
      throw new Error(`Sheet name longer than 31 characters: ${sheet.name}`);
    }
    if (/[\\/?*[\]:]/.test(sheet.name)) {
      throw new Error(`Sheet name contains invalid characters: ${sheet.name}`);
    }
  }
  const names = sheets.map((sheet) => sheet.name.toLowerCase());
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) {
    throw new Error(`Duplicate sheet name: ${duplicate}`);
  }

  const parts = [];
  const addPart = (name, content) =>
    parts.push({ name, data: Buffer.from(content, 'utf8') });

  addPart(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`,
  );
  addPart(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );
  addPart(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets>
</workbook>`,
  );
  addPart(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );
  addPart('xl/styles.xml', STYLES_XML);
  sheets.forEach((sheet, index) => {
    addPart(`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(sheet));
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, zipParts(parts));
  return { sheets: sheets.length, parts: parts.length };
}
