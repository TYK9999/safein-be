import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Inline psql `\ir` includes so Node parsers see the full DDL.
 * Paths in `\ir` are relative to the file that contains them.
 */
export function loadSchemaSql(schemaPath) {
  const loaded = new Set();

  function load(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    if (loaded.has(normalized)) {
      return '';
    }
    loaded.add(normalized);

    const dir = dirname(filePath);
    const source = readFileSync(filePath, 'utf8');
    return source.replace(/^\s*\\ir\s+(\S+)\s*$/gm, (_match, included) => {
      const name = included.replace(/^['"]|['"]$/g, '');
      const nested = join(dir, name);
      return `\n-- begin ${name}\n${load(nested)}\n-- end ${name}\n`;
    });
  }

  return load(schemaPath);
}
