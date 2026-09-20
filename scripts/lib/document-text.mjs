import { inflateRawSync, inflateSync } from "node:zlib";

const MAX_TEXT_CHARS = 80_000;

export function extractDocumentText(fileName, bytes) {
  const ext = extension(fileName);
  let text;
  if (ext === "txt" || ext === "md" || ext === "csv") {
    text = bytes.toString("utf8");
  } else if (ext === "docx") {
    text = xmlToText(zipReadFile(bytes, "word/document.xml").toString("utf8"));
  } else if (ext === "xlsx") {
    text = xlsxToText(bytes);
  } else if (ext === "pdf") {
    text = pdfToText(bytes);
  } else if (ext === "html" || ext === "htm") {
    text = xmlToText(bytes.toString("utf8"));
  } else {
    throw new Error("UNSUPPORTED_DOCUMENT");
  }
  const trimmed = collapseWs(text);
  if (!trimmed) throw new Error("EMPTY_DOCUMENT");
  return trimmed.length > MAX_TEXT_CHARS ? trimmed.slice(0, MAX_TEXT_CHARS) : trimmed;
}

export function isImageFile(fileName) {
  const ext = extension(fileName);
  return ext === "jpeg" || ext === "jpg" || ext === "png" || ext === "webp" || ext === "gif";
}

export function imageMimeType(fileName) {
  const ext = extension(fileName);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function xmlToText(xml) {
  return collapseWs(
    xml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<w:br[^/]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<\/w:tc>/g, " | ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
  );
}

function xlsxToText(bytes) {
  let sharedXml = "";
  try {
    sharedXml = zipReadFile(bytes, "xl/sharedStrings.xml").toString("utf8");
  } catch {
    throw new Error("EMPTY_DOCUMENT");
  }
  const strings = [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((m) => m[1])
    .filter((s) => s.trim().length > 0);
  return strings.join("\n");
}

function pdfToText(buf) {
  const raw = buf.toString("latin1");
  const chunks = [];
  const objRe = /(\d+)\s+\d+\s+obj[\s\S]*?endobj/g;
  let m;
  while ((m = objRe.exec(raw))) {
    const obj = m[0];
    const streamMatch = obj.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) continue;
    const header = obj.slice(0, obj.indexOf("stream"));
    let data = Buffer.from(streamMatch[1], "latin1");
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
    chunks.push(...pdfStrings(data.toString("latin1")));
  }
  return collapseWs(chunks.join("\n"));
}

function pdfStrings(body) {
  const out = [];
  for (const t of body.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    out.push(unescapePdf(t[0].slice(1, t[0].lastIndexOf(")"))));
  }
  for (const t of body.matchAll(/\[((?:[^\]]|\\])*)\]\s*TJ/g)) {
    const parts = [...t[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((p) =>
      unescapePdf(p[0].slice(1, -1)),
    );
    if (parts.length) out.push(parts.join(""));
  }
  return out;
}

function unescapePdf(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, n) => String.fromCharCode(parseInt(n, 8)));
}

function zipReadFile(buf, innerPath) {
  const eocd = findEocd(buf);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdEntries = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  const norm = innerPath.replace(/\\/g, "/");
  for (let i = 0; i < cdEntries; i++) {
    if (buf.toString("ascii", p, p + 4) !== "PK\x01\x02") {
      throw new Error("INVALID_DOCUMENT");
    }
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.replace(/\\/g, "/") !== norm) continue;
    return inflateZipEntry(buf, localOff, method, compSize);
  }
  throw new Error("INVALID_DOCUMENT");
}

function inflateZipEntry(buf, localOff, method, compSize) {
  if (buf.toString("ascii", localOff, localOff + 4) !== "PK\x03\x04") {
    throw new Error("INVALID_DOCUMENT");
  }
  const nameLen = buf.readUInt16LE(localOff + 26);
  const extraLen = buf.readUInt16LE(localOff + 28);
  const dataStart = localOff + 30 + nameLen + extraLen;
  const compressed = buf.subarray(dataStart, dataStart + compSize);
  if (method === 0) return Buffer.from(compressed);
  if (method === 8) return inflateRawSync(compressed);
  throw new Error("UNSUPPORTED_DOCUMENT");
}

function findEocd(buf) {
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
  throw new Error("INVALID_DOCUMENT");
}

function extension(fileName) {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : "";
}

function collapseWs(s) {
  return s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
