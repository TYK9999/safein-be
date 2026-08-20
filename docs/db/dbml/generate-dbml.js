/* Generate dbdiagram.io DBML from the live SafeIn5 Postgres schema. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PSQL = 'C:/Program Files/PostgreSQL/16/bin/psql';
const DB = process.argv[2] || 'safein5_final';
const OUTDIR = process.argv[3] || 'c:/Users/YaswanthK/Desktop/safeIn/db/dbml';

function q(sql) {
  const out = execFileSync(PSQL, ['-w', '-h', 'localhost', '-U', 'postgres', '-d', DB, '-tAF', '\x1f', '-c', sql],
    { env: { ...process.env, PGPASSWORD: 'admin', PGCLIENTENCODING: 'UTF8' }, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8');
  return out.split('\n').filter(l => l.trim() !== '').map(l => l.split('\x1f'));
}

// ---- tables + comments
const tables = q(`
  SELECT c.relname, c.relkind::text, coalesce(obj_description(c.oid,'pg_class'),'')
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition
  ORDER BY 1`);

// ---- columns
const cols = q(`
  SELECT c.relname, a.attname, format_type(a.atttypid,a.atttypmod), a.attnotnull::text,
         coalesce(pg_get_expr(d.adbin,d.adrelid),''),
         coalesce(col_description(c.oid,a.attnum),''),
         a.attnum::text, coalesce(a.attgenerated,'')::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition
  ORDER BY c.relname, a.attnum`);

// ---- primary keys
const pks = q(`
  SELECT c.relname, a.attname, array_position(con.conkey, a.attnum)::text
  FROM pg_constraint con
  JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum = ANY(con.conkey)
  WHERE n.nspname='public' AND con.contype='p'
  ORDER BY 1,3`);

// ---- unique constraints
const uqs = q(`
  SELECT c.relname, con.conname, a.attname, array_position(con.conkey, a.attnum)::text
  FROM pg_constraint con
  JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum = ANY(con.conkey)
  WHERE n.nspname='public' AND con.contype='u'
  ORDER BY 1,2,4`);

// ---- foreign keys (ordered column pairs)
const fks = q(`
  SELECT con.conname, src.relname, tgt.relname,
         (SELECT string_agg(sa.attname, ',' ORDER BY k.ord)
            FROM unnest(con.conkey) WITH ORDINALITY k(attnum,ord)
            JOIN pg_attribute sa ON sa.attrelid=con.conrelid AND sa.attnum=k.attnum),
         (SELECT string_agg(ta.attname, ',' ORDER BY k.ord)
            FROM unnest(con.confkey) WITH ORDINALITY k(attnum,ord)
            JOIN pg_attribute ta ON ta.attrelid=con.confrelid AND ta.attnum=k.attnum),
         con.confdeltype::text
  FROM pg_constraint con
  JOIN pg_class src ON src.oid=con.conrelid
  JOIN pg_class tgt ON tgt.oid=con.confrelid
  JOIN pg_namespace n ON n.oid=src.relnamespace
  WHERE n.nspname='public' AND con.contype='f'
  ORDER BY 2,1`);

// ---- CHECK constraints (to surface enum-like value sets in notes)
const checks = q(`
  SELECT c.relname, con.conname, pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND con.contype='c'
  ORDER BY 1,2`);

// ---- indexes (non-constraint backed)
const idxs = q(`
  SELECT tablename, indexname, indexdef FROM pg_indexes
  WHERE schemaname='public' ORDER BY 1,2`);

// ================= shaping =================
const T = new Map();
for (const [name, kind, comment] of tables) {
  T.set(name, { name, kind, comment, cols: [], pk: [], uq: new Map(), checks: [], idx: [] });
}
for (const [t, col, type, notnull, def, comment, num, generated] of cols) {
  if (T.has(t)) T.get(t).cols.push({ col, type, notnull: notnull === 'true' || notnull === 't', def, comment, generated });
}
for (const [t, col] of pks) if (T.has(t)) T.get(t).pk.push(col);
for (const [t, con, col] of uqs) {
  if (!T.has(t)) continue;
  const m = T.get(t).uq;
  if (!m.has(con)) m.set(con, []);
  m.get(con).push(col);
}
for (const [t, con, def] of checks) if (T.has(t)) T.get(t).checks.push({ con, def });
for (const [t, name, def] of idxs) if (T.has(t)) T.get(t).idx.push({ name, def });

// type mapping -> shorter DBML-friendly names
const TYPEMAP = {
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
  'character varying': 'varchar',
  'double precision': 'float8',
  'boolean': 'bool',
};
function dbType(t) {
  let s = t;
  for (const [k, v] of Object.entries(TYPEMAP)) {
    if (s === k) return v;
    if (s.startsWith(k + '(')) return v + s.slice(k.length);
  }
  return s.replace(/\[\]$/, '[]');
}

// Extract a genuine value set for a column from a CHECK.
// Only "col = ANY (ARRAY[...])" or "col IN (...)" count. Deliberately ignores
// not-blank checks (btrim(x) <> ''), regex checks (~) and range checks, which
// otherwise yield empty or nonsense "one of" lists.
function enumValuesFor(tbl, colName) {
  const vals = new Set();
  for (const { def } of tbl.checks) {
    if (!new RegExp(`\\b${colName}\\b`).test(def)) continue;
    // single-column checks only
    const cited = new Set((def.match(/\b[a-z_][a-z0-9_]*\b/g) || []).filter(w => tbl.cols.some(c => c.col === w)));
    if (cited.size !== 1) continue;
    const m = def.match(new RegExp(`${colName}\\s*=\\s*ANY\\s*\\(\\s*ARRAY\\[([^\\]]*)\\]`, 'i'))
           || def.match(new RegExp(`${colName}\\s+IN\\s*\\(([^)]*)\\)`, 'i'));
    if (!m) continue;
    const lits = m[1].match(/'((?:[^']|'')*)'/g) || [];
    lits.forEach(l => {
      const v = l.slice(1, -1).replace(/''/g, "'").trim();
      if (v) vals.add(v);
    });
  }
  return [...vals];
}

function esc(s) { return (s || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim(); }
// DBML: use ''' ''' for anything containing an apostrophe, so no backslash escaping is needed.
function noteStr(s) {
  const e = esc(s);
  if (!e) return null;
  return e.includes("'") ? `'''${e.replace(/'''/g, "''")}'''` : `'${e}'`;
}

const GROUPS = [
  { key: '01-tenancy', title: 'Tenancy & Organisation Hierarchy',
    tables: ['tenant', 'organisation', 'site', 'sub_site', 'asset', 'role'] },
  { key: '02-identity', title: 'Identity, Membership & Anonymity',
    tables: ['app_user', 'user_tenant_membership', 'user_site_assignment', 'guest_session', 'auth_token', 'tenant_secret', 'role', 'tenant'] },
  { key: '03-qr-context', title: 'QR Codes & Context Resolution',
    tables: ['task_type', 'risk_type', 'qr_context', 'qr_code', 'pulse_template', 'context_binding', 'qr_scan_event', 'site', 'sub_site', 'asset', 'rescue_plan', 'learn5_item'] },
  { key: '04-signal', title: 'Signal Core, Media & Learning',
    tables: ['classification', 'pulse_session', 'behaviour_signal', 'signal_media', 'signal_classification_event', 'signal_read_state', 'learn5_item', 'learn5_binding', 'learn5_view', 'rescue_plan', 'qr_code', 'site', 'sub_site', 'asset'] },
  { key: '05-workflow', title: 'Workflow, Moderation, Audit & Notifications',
    tables: ['workflow_state_def', 'workflow_transition_def', 'review_task', 'workflow_transition', 'evidence', 'moderation_action', 'audit_log', 'device_subscription', 'notification', 'outbox_event', 'behaviour_signal', 'user_tenant_membership'] },
];

function renderTable(tbl, scope) {
  const L = [];
  const tnote = noteStr(tbl.comment);
  L.push(`Table ${tbl.name} {`);
  const pkSet = new Set(tbl.pk);
  const singleUq = new Set();
  for (const [, c] of tbl.uq) if (c.length === 1) singleUq.add(c[0]);

  for (const c of tbl.cols) {
    const settings = [];
    if (pkSet.size === 1 && pkSet.has(c.col)) settings.push('pk');
    if (c.notnull && !(pkSet.size === 1 && pkSet.has(c.col))) settings.push('not null');
    if (singleUq.has(c.col)) settings.push('unique');
    if (c.def) {
      const d = c.def;
      if (/^'(.*)'::/.test(d)) settings.push(`default: '${esc(d.slice(1, d.lastIndexOf("'::")))}'`);
      else if (/^(true|false)$/i.test(d)) settings.push(`default: ${d.toLowerCase()}`);
      else if (/^-?\d+(\.\d+)?$/.test(d)) settings.push(`default: ${d}`);
      else settings.push('default: `' + d.replace(/`/g, '') + '`');
    }
    const bits = [];
    if (c.generated === 's') bits.push('GENERATED STORED');
    const ev = enumValuesFor(tbl, c.col);
    // Skip the generated "one of" line when the hand-written column comment
    // already spells the same values out, which most of them do.
    const commentCoversEnum = ev.length > 0 && c.comment &&
      ev.every(v => c.comment.includes(v));
    if (ev.length && ev.length <= 12 && !commentCoversEnum) bits.push('one of: ' + ev.join(' | '));
    if (c.comment) bits.push(c.comment);
    const n = noteStr(bits.join('. '));
    if (n) settings.push(`note: ${n}`);
    L.push(`  ${c.col} ${dbType(c.type)}${settings.length ? ' [' + settings.join(', ') + ']' : ''}`);
  }

  const idxLines = [];
  if (pkSet.size > 1) idxLines.push(`    (${tbl.pk.join(', ')}) [pk]`);
  for (const [con, c] of tbl.uq) if (c.length > 1) idxLines.push(`    (${c.join(', ')}) [unique, name: '${con}']`);
  if (idxLines.length) { L.push('', '  indexes {'); idxLines.forEach(l => L.push(l)); L.push('  }'); }

  if (tnote) L.push('', `  Note: ${tnote}`);
  L.push('}');
  return L.join('\n');
}

const DELMAP = { a: 'no action', r: 'restrict', c: 'cascade', n: 'set null', d: 'set default' };

function renderRefs(scope) {
  const out = [];
  const skipped = [];
  for (const [conname, src, tgt, srcCols, tgtCols, del] of fks) {
    const inScope = scope.has(src) && scope.has(tgt);
    const sc = srcCols.split(',');
    const tc = tgtCols.split(',');
    const left = sc.length > 1 ? `${src}.(${sc.join(', ')})` : `${src}.${sc[0]}`;
    const right = tc.length > 1 ? `${tgt}.(${tc.join(', ')})` : `${tgt}.${tc[0]}`;
    const settings = [];
    if (DELMAP[del] && del !== 'a') settings.push(`delete: ${DELMAP[del]}`);
    const line = `Ref ${conname}: ${left} > ${right}${settings.length ? ' [' + settings.join(', ') + ']' : ''}`;
    if (inScope) out.push(line); else if (scope.has(src)) skipped.push(`// out of scope: ${src}.${sc.join('+')} -> ${tgt}`);
  }
  return { refs: out, skipped };
}

function header(title, scopeNote) {
  return [
    `// ============================================================`,
    `// SafeIn5 MVP - ${title}`,
    `// Generated from the live PostgreSQL 16 schema (db/migrations/0001-0008).`,
    `// Import at https://dbdiagram.io  ->  paste, or File > Import > DBML`,
    scopeNote ? `// ${scopeNote}` : null,
    `// ============================================================`,
    '',
  ].filter(Boolean).join('\n');
}

fs.mkdirSync(OUTDIR, { recursive: true });

// ---------- full schema ----------
{
  const scope = new Set(T.keys());
  const L = [header('COMPLETE SCHEMA (39 tables)')];
  L.push(`Project SafeIn5 {`);
  L.push(`  database_type: 'PostgreSQL'`);
  L.push(`  Note: 'SafeIn5 behavioural safety platform - MVP schema. 39 tables, multi-tenant with row-level security. Anonymity is enforced by a database CHECK: is_anonymous = true implies author_user_id IS NULL.'`);
  L.push('}', '');
  for (const g of GROUPS) {
    const own = g.tables.filter(t => T.has(t));
    L.push(`TableGroup "${g.title}" {`);
    // assign each table to its FIRST group only
    for (const t of own) {
      const first = GROUPS.find(gg => gg.tables.includes(t));
      if (first.key === g.key) L.push(`  ${t}`);
    }
    L.push('}', '');
  }
  for (const name of [...T.keys()].sort()) L.push(renderTable(T.get(name), scope), '');
  const { refs } = renderRefs(scope);
  L.push('// ---------- Relationships ----------');
  refs.forEach(r => L.push(r));
  fs.writeFileSync(path.join(OUTDIR, 'safein5-full.dbml'), L.join('\n') + '\n');
}

// ---------- per subsystem ----------
for (const g of GROUPS) {
  const scope = new Set(g.tables.filter(t => T.has(t)));
  const core = g.tables.filter(t => T.has(t) && GROUPS.find(gg => gg.tables.includes(t)).key === g.key);
  const ctx = [...scope].filter(t => !core.includes(t));
  const L = [header(g.title, ctx.length ? `Context tables (shown for their relationships, owned by another subsystem): ${ctx.join(', ')}` : null)];
  L.push(`Project SafeIn5_${g.key.replace(/-/g, '_')} {`);
  L.push(`  database_type: 'PostgreSQL'`);
  L.push(`  Note: 'SafeIn5 MVP - ${g.title}'`);
  L.push('}', '');
  if (core.length) { L.push(`TableGroup "${g.title}" {`); core.forEach(t => L.push(`  ${t}`)); L.push('}', ''); }
  if (ctx.length) { L.push(`TableGroup "Context (owned elsewhere)" {`); ctx.forEach(t => L.push(`  ${t}`)); L.push('}', ''); }
  for (const name of [...scope].sort()) L.push(renderTable(T.get(name), scope), '');
  const { refs, skipped } = renderRefs(scope);
  L.push('// ---------- Relationships ----------');
  refs.forEach(r => L.push(r));
  if (skipped.length) { L.push('', '// ---------- Relationships to other subsystems (omitted here) ----------'); [...new Set(skipped)].forEach(s => L.push(s)); }
  fs.writeFileSync(path.join(OUTDIR, `safein5-${g.key}.dbml`), L.join('\n') + '\n');
}

console.log('tables:', T.size, '| fks:', fks.length, '| files written to', OUTDIR);
