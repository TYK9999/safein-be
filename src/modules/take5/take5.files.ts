import { existsSync, readFileSync } from 'fs';
import { basename, isAbsolute, relative, resolve } from 'path';

/** Only files under this repo folder may be loaded via `filePath`. */
export const TAKE5_DOCS_DIR = 'docs/learn-take-rescue';

export function resolveTake5DocPath(
  filePath: string,
  cwd = process.cwd(),
): string {
  const trimmed = filePath.trim().replace(/\\/g, '/');
  if (!trimmed || trimmed.includes('\0') || isAbsolute(trimmed)) {
    throw new Error('INVALID_PATH');
  }

  const prefix = `${TAKE5_DOCS_DIR}/`;
  const rest = trimmed.startsWith(prefix)
    ? trimmed.slice(prefix.length)
    : trimmed.startsWith(TAKE5_DOCS_DIR)
      ? ''
      : trimmed;

  if (!rest || rest.includes('..') || rest.startsWith('/')) {
    throw new Error('INVALID_PATH');
  }

  const root = resolve(cwd, TAKE5_DOCS_DIR);
  const abs = resolve(root, rest);
  const rel = relative(root, abs).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('INVALID_PATH');
  }
  if (!existsSync(abs)) {
    throw new Error('MISSING_DOCUMENT');
  }
  return abs;
}

export function readTake5Doc(filePath: string): {
  fileName: string;
  bytes: Buffer;
} {
  const abs = resolveTake5DocPath(filePath);
  return { fileName: basename(abs), bytes: readFileSync(abs) };
}
