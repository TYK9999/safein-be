import { inflateRawSync, inflateSync } from 'zlib';

const MAX_TEXT_CHARS = 80_000;

export function extractDocumentText(fileName: string, bytes: Buffer): string {
  const ext = extension(fileName);
  let text: string;
  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    text = bytes.toString('utf8');
  } else if (ext === 'docx') {
    text = xmlToText(zipReadFile(bytes, 'word/document.xml').toString('utf8'));
  } else if (ext === 'xlsx') {
    text = xlsxToText(bytes);
  } else if (ext === 'pdf') {
    text = pdfToText(bytes);
  } else if (ext === 'html' || ext === 'htm') {
    text = xmlToText(bytes.toString('utf8'));
  } else {
    const asUtf8 = bytes.toString('utf8');
    if (!looksLikeText(asUtf8)) {
      throw new Error('UNSUPPORTED_DOCUMENT');
    }
    text = asUtf8;
  }
  const trimmed = collapseWs(text);
  if (!trimmed) {
    throw new Error('EMPTY_DOCUMENT');
  }
  return trimmed.length > MAX_TEXT_CHARS
    ? trimmed.slice(0, MAX_TEXT_CHARS)
    : trimmed;
}

export function xmlToText(xml: string): string {
  return collapseWs(
    xml
      .replace(/<w:tab\/>/g, ' ')
      .replace(/<w:br[^/]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<\/w:tc>/g, ' | ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
  );
}

function xlsxToText(bytes: Buffer): string {
  let sharedXml = '';
  try {
    sharedXml = zipReadFile(bytes, 'xl/sharedStrings.xml').toString('utf8');
  } catch {
    throw new Error('EMPTY_DOCUMENT');
  }
  const strings = [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((m) => m[1])
    .filter((s) => s.trim().length > 0);
  return strings.join('\n');
}

function pdfToText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const chunks: string[] = [];
  const objRe = /(\d+)\s+\d+\s+obj[\s\S]*?endobj/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(raw))) {
    const obj = m[0];
    const streamMatch = obj.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) continue;
    const header = obj.slice(0, obj.indexOf('stream'));
    let data = Buffer.from(streamMatch[1], 'latin1');
    if (/\/FlateDecode/.test(header)) {
      try {
        data = inflateSync(data);
      } catch {
        try {
          data = inflateRawSync(data);
        } catch {
          continue;
        }
      }
    }
    chunks.push(...pdfStrings(data.toString('latin1')));
  }
  return collapseWs(chunks.join('\n'));
}

function pdfStrings(body: string): string[] {
  const out: string[] = [];
  for (const t of body.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    out.push(unescapePdf(t[0].slice(1, t[0].lastIndexOf(')'))));
  }
  for (const t of body.matchAll(/\[((?:[^\]]|\\])*)\]\s*TJ/g)) {
    const parts = [...t[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((p) =>
      unescapePdf(p[0].slice(1, -1)),
    );
    if (parts.length) out.push(parts.join(''));
  }
  return out;
}

function unescapePdf(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{1,3})/g, (_, n) =>
      String.fromCharCode(parseInt(n as string, 8)),
    );
}

/** Read one inner path from a ZIP (DOCX/XLSX). */
export function zipReadFile(buf: Buffer, innerPath: string): Buffer {
  const eocd = findEocd(buf);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdEntries = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  const norm = innerPath.replace(/\\/g, '/');
  for (let i = 0; i < cdEntries; i++) {
    if (buf.toString('ascii', p, p + 4) !== 'PK\x01\x02') {
      throw new Error('INVALID_DOCUMENT');
    }
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.replace(/\\/g, '/') !== norm) continue;
    return inflateZipEntry(buf, localOff, method, compSize);
  }
  throw new Error('INVALID_DOCUMENT');
}

function inflateZipEntry(
  buf: Buffer,
  localOff: number,
  method: number,
  compSize: number,
): Buffer {
  if (buf.toString('ascii', localOff, localOff + 4) !== 'PK\x03\x04') {
    throw new Error('INVALID_DOCUMENT');
  }
  const nameLen = buf.readUInt16LE(localOff + 26);
  const extraLen = buf.readUInt16LE(localOff + 28);
  const dataStart = localOff + 30 + nameLen + extraLen;
  const compressed = buf.subarray(dataStart, dataStart + compSize);
  if (method === 0) return Buffer.from(compressed);
  if (method === 8) return inflateRawSync(compressed);
  throw new Error('UNSUPPORTED_DOCUMENT');
}

function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= min; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      return i;
    }
  }
  throw new Error('INVALID_DOCUMENT');
}

function extension(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

function looksLikeText(s: string): boolean {
  if (!s.trim()) return false;
  let bad = 0;
  const n = Math.min(s.length, 2000);
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    if (c === 0) return false;
    if (c < 9 || (c > 13 && c < 32)) bad++;
  }
  return bad / n < 0.05;
}

function collapseWs(s: string): string {
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
