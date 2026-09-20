import { rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parseSchema } from './generate-website-schema-mapping-workbook.mjs';
import { loadSchemaSql } from './lib/schema-sql.mjs';

const root = resolve(import.meta.dirname, '..');
const schemaPath = join(root, 'db', 'schema', 'schema.sql');
const outPath = join(root, 'docs', 'db-schema-flow-chart.html');
const legacySplitDir = join(root, 'docs', 'db-schema');

const schemaSql = loadSchemaSql(schemaPath);
const tables = parseSchema(schemaSql);

const postCreateForeignKeys = {
  'document_placement.work_task_id': 'work_task.id',
  'content_placement.work_task_id': 'work_task.id',
  'pulse_event.related_signal_id': 'signal.id',
  'work_task_prompt_setting.source_signal_id': 'signal.id',
};
for (const table of tables) {
  for (const column of table.columns) {
    column.foreignKey =
      postCreateForeignKeys[`${table.name}.${column.column}`] ??
      column.foreignKey;
  }
}

const tableDomains = {
  Identity: ['app_user', 'auth_token'],
    'Tenancy & sites': [
    'tenant',
    'user_tenant_membership',
    'site',
    'user_site_membership',
    'space',
    'tenant_privacy_request',
  ],
  Access: ['role', 'permission', 'role_permission'],
  'Hazard taxonomy': ['hazard_category', 'site_category_owner'],
  Documents: ['document', 'document_revision', 'document_placement'],
  Content: [
    'content_pack',
    'content_prompt',
    'content_asset',
    'content_placement',
  ],
  'Work tasks': [
    'work_task',
    'work_task_crew',
    'work_task_content_prompt',
    'work_task_prompt_setting',
    'work_task_learn5_media',
  ],
  PULSE: [
    'pulse',
    'pulse_event',
    'pulse_checklist_response',
    'pulse_content_acknowledgement',
    'checklist_completion',
  ],
  'Echoes (signals)': [
    'signal',
    'signal_classification_event',
    'signal_acknowledgement',
    'signal_media',
  ],
  Media: ['upload_session', 'audio_clip', 'transcription_job'],
  Realtime: [
    'realtime_connection',
    'realtime_connection_room',
    'realtime_message',
  ],
};

const domainColors = {
  Identity: '#4f6ef7',
  'Tenancy & sites': '#17225b',
  Access: '#0f766e',
  'Hazard taxonomy': '#7c5cdb',
  Documents: '#0d9488',
  Content: '#0891b2',
  'Work tasks': '#d97706',
  PULSE: '#dc2626',
  'Echoes (signals)': '#be185d',
  Media: '#64748b',
  Realtime: '#4338ca',
};

const tablePurpose = {
  app_user:
    'People who sign in — workers, supervisors, client admins, platform admins. invited until first successful OTP, then active.',
  auth_token: 'Hashed email OTP codes for sign-up and sign-in. First successful OTP activates the account.',
  tenant: 'Client organisation. Root of tenant isolation and retention settings.',
  user_tenant_membership: 'Org-wide member or tenant_admin (not site role).',
  site: 'Site within a tenant (Plant A). Bulk import = auto-approved. Manager and supervisor come from user_site_membership.',
  user_site_membership: 'Per-site membership; role_id → role (site scope).',
  role: 'Canonical roles for platform, tenant, and site scope.',
  permission:
    'Catalog of capabilities the React app checks after login (nav.*, tasks.create, …).',
  role_permission:
    'Which permissions each role row is granted. Unioned on login.',
  space: 'Scannable place/asset. QR scan starts a PULSE.',
  hazard_category: 'Seeded Echo category taxonomy (12 categories).',
  site_category_owner: 'Site rule: default owner per hazard category.',
  tenant_privacy_request: 'Logged privacy requests. Nothing auto-deleted.',
  document: 'Document library — PTW, RAMS, rescue plan, checklist, etc.',
  document_revision: 'Versioned S3 file. One current revision per document.',
  document_placement:
    'Where a document applies: tenant, site, space, or work task.',
  content_pack: 'Job Checklist, Learn 5, Uncover, or Shift pack.',
  content_prompt: 'Shared Job Checklist / Learn 5 / Uncover / Shift prompt list. Tasks select these rows; they are not copied.',
  content_asset: 'Media/file attached to a content pack.',
  content_placement:
    'Attach Job Checklist, Learn 5, Uncover or Shift to a space or work task.',
  work_task:
    'Permit / work order. Attachments: Job Checklist, Learn 5, Documents, Uncover, Shift.',
  work_task_crew: 'Additional workers on a task (PULSE team).',
  work_task_content_prompt:
    'Job Checklist / Learn 5: tasks select shared library prompts; many tasks can use the same prompt.',
  work_task_prompt_setting:
    'Per-task Uncover / Shift checks (custom wording or from an open Echo).',
  work_task_learn5_media: 'Learn 5 visual media rows (required vs optional) on a task.',
  pulse: 'One worker journey at a space/task (QR or observation).',
  pulse_event: 'Stage events in a PULSE journey.',
  pulse_checklist_response: 'Worker answer per checklist prompt.',
  pulse_content_acknowledgement: 'Viewed/acknowledged Learn 5 or guidance.',
  signal: 'Echo — observation, classification, assignment, media.',
  signal_classification_event: 'Audit when Echo classification changes.',
  signal_acknowledgement: 'Messages shown to reporter per status stage.',
  upload_session: 'Chunked video upload to S3 + thumbnail/playback.',
  audio_clip: 'Voice note in S3 (Echo voice capture).',
  transcription_job: 'AWS Transcribe job for a voice clip.',
  signal_media: 'Photo, video, voice, or after-photo on an Echo.',
  checklist_completion: 'Checklist outcome: carried on, changed plan, stopped.',
  realtime_connection:
    'Socket.IO /realtime socket: worker or back office, tenant, optional user.',
  realtime_connection_room:
    'Rooms the server assigned to a socket (tenant, pulse, echoes, user).',
  realtime_message:
    'Published realtime events (Echo, PULSE, notification, signal) for audit.',
};

function classifyColumn(column) {
  if (column.primaryKey || column.generated) return 'System';
  if (column.notNull && !column.defaultValue) return 'Mandatory';
  if (column.notNull && column.defaultValue) return 'Default';
  return 'Optional';
}

function mandatoryFields(table) {
  return table.columns
    .filter((c) => classifyColumn(c) === 'Mandatory')
    .map((c) => c.column);
}

function optionalFields(table) {
  return table.columns
    .filter((c) => classifyColumn(c) === 'Optional')
    .map((c) => c.column);
}

function restOfFields(table) {
  return table.columns
    .filter((c) => classifyColumn(c) !== 'Mandatory')
    .map((c) => {
      const kind = classifyColumn(c);
      if (kind === 'Optional') return `${c.column} (optional, ${c.sqlType})`;
      if (kind === 'Default')
        return `${c.column} (${c.sqlType}, default ${c.defaultValue})`;
      return `${c.column} (system ${c.sqlType})`;
    });
}

/** Flow-chart field line. Mandatory (no default) is prefixed with *. */
function fieldFlowLabel(column) {
  const fk = column.foreignKey ? ` → ${column.foreignKey}` : '';
  const kind = classifyColumn(column);
  if (kind === 'Mandatory') return `* ${column.column}${fk}`;
  if (kind === 'System') return `${column.column} (PK)`;
  if (kind === 'Default') return `${column.column}${fk} (default)`;
  return `${column.column}${fk}`;
}

function relationalKeys(table) {
  const pk = `PRIMARY KEY: ${primaryKey(table)}`;
  const fks = foreignKeys(table);
  const uniques = table.columns
    .filter((c) => /\bUNIQUE\b/i.test(c.definition) && !c.primaryKey)
    .map((c) => `UNIQUE: ${c.column}`);
  return [pk, ...fks, ...uniques];
}

function primaryKey(table) {
  const pk = table.columns.find((c) => c.primaryKey);
  return pk ? pk.column : 'id';
}

function foreignKeys(table) {
  return table.columns
    .filter((c) => c.foreignKey)
    .map((c) => `${c.column} → ${c.foreignKey}`);
}

function domainForTable(name) {
  for (const [domain, names] of Object.entries(tableDomains)) {
    if (names.includes(name)) return domain;
  }
  return 'Other';
}

function domainSlug(domain) {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const NAV = [
  { id: 'flow', label: 'Flow chart' },
  { id: 'all-fields', label: 'All fields flow' },
  { id: 'reference', label: 'Table reference' },
  { id: 'fields', label: 'All fields' },
];

const SHARED_CSS = `
:root {
  color-scheme: light;
  --ink: #17225b;
  --muted: #5c6b8a;
  --line: #d8deef;
  --bg: #f4f6fc;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Calibri, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--bg);
  line-height: 1.45;
}
a { color: #4f6ef7; text-decoration: none; }
a:hover { text-decoration: underline; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  border-bottom: 1px solid var(--line);
  padding: 12px 20px;
}
.site-header h1 { margin: 0; font-size: 1.15rem; }
.site-header p { margin: 4px 0 0; color: var(--muted); font-size: 0.88rem; }
.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.site-nav a, .site-nav span {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.88rem;
  border: 1px solid var(--line);
  background: #fff;
}
.site-nav a.active {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
.site-nav span.muted {
  color: var(--muted);
  border-style: dashed;
}
.content { padding: 20px; max-width: 1400px; margin: 0 auto; }
.card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.card h2 { margin: 0 0 8px; font-size: 1.05rem; }
.card h3 { margin: 0 0 6px; font-size: 1rem; }
.card p { margin: 0 0 10px; color: var(--muted); }
.card dt { font-weight: 700; font-size: 0.82rem; color: var(--muted); margin-top: 10px; }
.card dd { margin: 4px 0 0; font-size: 0.92rem; }
.card ul { margin: 6px 0 0; padding-left: 1.2rem; }
.card li { margin-bottom: 4px; font-size: 0.9rem; }
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}
.req { color: #b42318; font-weight: 600; }
table.data {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  background: #fff;
}
table.data th, table.data td {
  border: 1px solid var(--line);
  padding: 8px;
  vertical-align: top;
  text-align: left;
}
table.data th {
  background: var(--ink);
  color: #fff;
  position: sticky;
  top: 0;
}
table.data tr:nth-child(even) td { background: #f7f9ff; }
.req-cell { background: #fff5f5 !important; font-weight: 600; }
code {
  background: #eef2ff;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.85em;
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
}
.toolbar input, .toolbar button, .toolbar .btn {
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font: inherit;
  background: #fff;
}
.toolbar button.primary, .toolbar .btn.primary {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
.grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.view { display: none; }
.view.is-on { display: block; }
.view.wide .content { max-width: none; padding: 16px; }
.site-nav a { cursor: pointer; }
`;

function renderNav() {
  const items = NAV.map(
    (item) => `<a href="#${item.id}" data-view="${item.id}">${esc(item.label)}</a>`,
  );
  const domains = Object.keys(tableDomains)
    .map((domain) => {
      const slug = domainSlug(domain);
      return `<a href="#${slug}" data-view="${slug}">${esc(domain)}</a>`;
    })
    .join('');
  return `<nav class="site-nav">${items.join('')}<span class="muted">Domains</span>${domains}</nav>`;
}

function viewSection(id, inner, { wide = false } = {}) {
  return `<section class="view${wide ? ' wide' : ''}" id="view-${id}" data-view="${id}">${inner}</section>`;
}

function tableCard(table, domain) {
  const color = domainColors[domain] ?? '#64748b';
  return `
  <article class="card" id="tbl-${esc(table.name)}" style="border-left: 4px solid ${color}">
    <span class="pill" style="background:${color}22;color:${color}">${esc(domain)}</span>
    <h2><code>${esc(table.name)}</code></h2>
    <p>${esc(tablePurpose[table.name] ?? '')}</p>
    <dl>
      <dt>Relational keys</dt>
      <dd><ul>${relationalKeys(table).map((k) => `<li><code>${esc(k)}</code></li>`).join('')}</ul></dd>
      <dt>Mandatory fields (no default)</dt>
      <dd class="req">${esc(mandatoryFields(table).join(', ') || '—')}</dd>
      <dt>Rest of fields</dt>
      <dd><ul>${restOfFields(table).map((f) => `<li>${esc(f)}</li>`).join('')}</ul></dd>
    </dl>
  </article>`;
}

// --- Flow chart layout (index page) ---
const layout = {};
const BOX_W = 220;
const BOX_H = 88;
const COL_GAP = 48;
const ROW_GAP = 28;
const LANE_PAD = 24;
const LANE_HEADER = 36;
const LANE_W = BOX_W + LANE_PAD * 2;
let laneX = 24;
let maxLaneH = 0;

for (const [domain, names] of Object.entries(tableDomains)) {
  const laneH =
    LANE_HEADER + names.length * (BOX_H + ROW_GAP) - ROW_GAP + LANE_PAD * 2;
  maxLaneH = Math.max(maxLaneH, laneH);
  let y = 40 + LANE_HEADER + LANE_PAD;
  for (const name of names) {
    layout[name] = {
      x: laneX + LANE_PAD,
      y,
      w: BOX_W,
      h: BOX_H,
      domain,
      laneX,
      laneW: LANE_W,
      laneH,
    };
    y += BOX_H + ROW_GAP;
  }
  laneX += LANE_W + COL_GAP;
}

const canvasW = laneX + 24;
const canvasH = 40 + maxLaneH + 24;

const edges = [];
for (const table of tables) {
  for (const column of table.columns) {
    if (!column.foreignKey) continue;
    const parent = column.foreignKey.split('.')[0];
    if (!layout[parent] || !layout[table.name]) continue;
    if (parent === table.name) continue;
    edges.push({ from: parent, to: table.name, label: column.column });
  }
}

function boxCenter(name) {
  const b = layout[name];
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function edgePath(from, to) {
  const a = boxCenter(from);
  const b = boxCenter(to);
  const bFrom = layout[from];
  const bTo = layout[to];
  let x1 = a.x;
  let y1 = a.y;
  let x2 = b.x;
  let y2 = b.y;
  if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
    if (a.x < b.x) {
      x1 = bFrom.x + bFrom.w;
      x2 = bTo.x;
    } else {
      x1 = bFrom.x;
      x2 = bTo.x + bTo.w;
    }
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }
  if (a.y < b.y) {
    y1 = bFrom.y + bFrom.h;
    y2 = bTo.y;
  } else {
    y1 = bFrom.y;
    y2 = bTo.y + bTo.h;
  }
  x1 = a.x;
  x2 = b.x;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

const tableMeta = {};
for (const table of tables) {
  const b = layout[table.name];
  tableMeta[table.name] = {
    name: table.name,
    domain: b?.domain ?? domainForTable(table.name),
    purpose: tablePurpose[table.name] ?? '',
    pk: primaryKey(table),
    mandatory: mandatoryFields(table),
    optional: optionalFields(table),
    relational: relationalKeys(table),
    rest: restOfFields(table),
    fks: foreignKeys(table),
  };
}

// --- Flow chart view ---
const flowExtraCss = `
main.flow { display: grid; grid-template-columns: 1fr 360px; min-height: calc(100vh - 140px); }
@media (max-width: 1000px) { main.flow { grid-template-columns: 1fr; } #detail { order: -1; } }
#viewport {
  overflow: hidden;
  background: linear-gradient(#e8eefc 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, #e8eefc 1px, transparent 1px) 0 0 / 24px 24px, #fafbff;
  min-height: 65vh;
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: grab;
}
#viewport.dragging { cursor: grabbing; }
#canvas { transform-origin: 0 0; width: ${canvasW}px; height: ${canvasH}px; }
.lane-title { font-size: 15px; font-weight: 700; }
.table-name { font-size: 13px; font-weight: 700; fill: var(--ink); }
.table-meta { font-size: 10px; fill: var(--muted); }
.table-meta.req { fill: #b42318; font-weight: 600; }
.table-meta.fk { fill: #0d9488; }
.table-box { transition: filter .15s; }
.table-node:hover .table-box, .table-node.focused .table-box {
  filter: drop-shadow(0 4px 10px rgba(23,34,91,.18));
  stroke-width: 3.5;
}
.edge { fill: none; stroke: #94a3b8; stroke-width: 1.5; marker-end: url(#arrow); opacity: .55; }
.edge.highlight { stroke: #4f6ef7; stroke-width: 2.5; opacity: 1; }
#detail { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px; overflow: auto; }
`;

function laneBackgrounds() {
  return Object.entries(tableDomains)
    .map(([domain, names]) => {
      const first = layout[names[0]];
      if (!first) return '';
      const color = domainColors[domain] ?? '#64748b';
      return `<rect x="${first.laneX}" y="40" width="${first.laneW}" height="${first.laneH}" rx="12" fill="${color}08" stroke="${color}33" stroke-width="1.5"/>
        <text x="${first.laneX + 12}" y="64" class="lane-title" fill="${color}">${esc(domain)}</text>`;
    })
    .join('');
}

function tableBoxes() {
  return tables
    .map((table) => {
      const b = layout[table.name];
      if (!b) return '';
      const color = domainColors[b.domain] ?? '#64748b';
      return `<a xlink:href="#tbl-${esc(table.name)}">
        <g class="table-node" data-table="${esc(table.name)}" tabindex="0">
          <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#fff" stroke="${color}" stroke-width="2.5" class="table-box"/>
          <text x="${b.x + 10}" y="${b.y + 20}" class="table-name">${esc(table.name)}</text>
          <text x="${b.x + 10}" y="${b.y + 38}" class="table-meta">PK: ${esc(primaryKey(table))}</text>
          <text x="${b.x + 10}" y="${b.y + 54}" class="table-meta req">Req: ${esc(mandatoryFields(table).slice(0, 3).join(', ') || '—')}</text>
          <title>${esc(tablePurpose[table.name] ?? '')}</title>
        </g></a>`;
    })
    .join('');
}

function edgeLines() {
  const seen = new Set();
  return edges
    .filter(({ from, to, label }) => {
      const key = `${from}|${to}|${label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(
      ({ from, to }) =>
        `<path d="${edgePath(from, to)}" class="edge" data-from="${esc(from)}" data-to="${esc(to)}"/>`,
    )
    .join('');
}

const flowViewInner = `
      <div class="content">
      <div class="toolbar">
        <input id="search" type="search" placeholder="Find table…" />
        <button type="button" id="zoom-out">−</button>
        <button type="button" id="zoom-in">+</button>
        <button type="button" id="fit" class="primary">Fit to screen</button>
        <button type="button" id="toggle-edges">Hide FK lines</button>
        <a class="btn" href="#reference">Open table reference →</a>
      </div>
      <main class="flow">
        <div id="viewport"><div id="canvas">
          <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs>
            ${laneBackgrounds()}
            <g id="edges">${edgeLines()}</g>
            <g id="nodes">${tableBoxes()}</g>
          </svg>
        </div></div>
        <aside id="detail"><p style="color:var(--muted)">Click a table for details, or open <a href="#reference">Table reference</a> for the full list.</p></aside>
      </main>
      </div>`;

const flowViewScript = `
        const meta = JSON.parse(document.getElementById('table-meta').textContent);
        const colors = ${JSON.stringify(domainColors)};
        const tableDomainView = ${JSON.stringify(
          Object.fromEntries(
            tables.map((t) => [t.name, domainSlug(domainForTable(t.name))]),
          ),
        )};
        const viewport = document.getElementById('viewport');
        const canvas = document.getElementById('canvas');
        const detail = document.getElementById('detail');
        const edgeEls = [...document.querySelectorAll('#edges .edge')];
        let scale = 0.72, tx = 20, ty = 20, edgesVisible = true, dragging = false, dragX = 0, dragY = 0;
        function applyTransform() { canvas.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; }
        function fitToScreen() {
          const pad = 24, vw = viewport.clientWidth - pad * 2, vh = viewport.clientHeight - pad * 2;
          scale = Math.min(vw / ${canvasW}, vh / ${canvasH}, 1); tx = pad; ty = pad; applyTransform();
        }
        function showTable(name) {
          const data = meta[name]; if (!data) return;
          const color = colors[data.domain] || '#64748b';
          document.querySelectorAll('.table-node').forEach((n) => n.classList.toggle('focused', n.dataset.table === name));
          edgeEls.forEach((e) => e.classList.toggle('highlight', edgesVisible && (e.dataset.from === name || e.dataset.to === name)));
          const slug = tableDomainView[name];
          detail.innerHTML = '<span class="pill" style="background:' + color + '22;color:' + color + '">' + data.domain + '</span>' +
            '<h2 style="margin:8px 0"><code>' + data.name + '</code></h2><p>' + data.purpose + '</p>' +
            '<p><a href="#' + slug + '" data-scroll="tbl-' + data.name + '">Full table details →</a></p>' +
            '<dl><dt>Relational keys</dt><dd>' + (data.relational.join('<br>') || '—') + '</dd>' +
            '<dt>Mandatory</dt><dd class="req">' + (data.mandatory.join(', ') || '—') + '</dd>' +
            '<dt>Rest of fields</dt><dd>' + (data.rest.slice(0, 8).join('<br>') + (data.rest.length > 8 ? '<br>…' : '')) + '</dd></dl>';
        }
        document.querySelectorAll('.table-node').forEach((node) => {
          node.addEventListener('click', (e) => { e.preventDefault(); showTable(node.dataset.table); });
        });
        document.getElementById('zoom-in').onclick = () => { scale = Math.min(scale * 1.15, 2.5); applyTransform(); };
        document.getElementById('zoom-out').onclick = () => { scale = Math.max(scale / 1.15, 0.25); applyTransform(); };
        document.getElementById('fit').onclick = fitToScreen;
        document.getElementById('toggle-edges').onclick = (e) => {
          edgesVisible = !edgesVisible;
          document.getElementById('edges').style.display = edgesVisible ? '' : 'none';
          e.target.textContent = edgesVisible ? 'Hide FK lines' : 'Show FK lines';
        };
        document.getElementById('search').addEventListener('input', (e) => {
          const q = e.target.value.trim().toLowerCase();
          document.querySelectorAll('.table-node').forEach((n) => { n.style.opacity = !q || n.dataset.table.includes(q) ? '1' : '0.2'; });
          if (q) { const hit = Object.keys(meta).find((k) => k.includes(q)); if (hit) showTable(hit); }
        });
        viewport.addEventListener('pointerdown', (e) => {
          if (e.target.closest('.table-node')) return;
          dragging = true; dragX = e.clientX - tx; dragY = e.clientY - ty;
          viewport.classList.add('dragging'); viewport.setPointerCapture(e.pointerId);
        });
        viewport.addEventListener('pointermove', (e) => { if (!dragging) return; tx = e.clientX - dragX; ty = e.clientY - dragY; applyTransform(); });
        viewport.addEventListener('pointerup', () => { dragging = false; viewport.classList.remove('dragging'); });
        fitToScreen(); showTable('tenant');
`;

// --- reference.html: master table ---
const referenceRows = [];
for (const [domain, names] of Object.entries(tableDomains)) {
  for (const name of names) {
    const table = tables.find((t) => t.name === name);
    if (!table) continue;
    const color = domainColors[domain] ?? '#64748b';
    referenceRows.push(`<tr>
      <td><span class="pill" style="background:${color}22;color:${color}">${esc(domain)}</span></td>
      <td><a href="#tbl-${esc(name)}"><code>${esc(name)}</code></a></td>
      <td>${esc(tablePurpose[name] ?? '')}</td>
      <td>${relationalKeys(table).map((k) => `<div><code>${esc(k)}</code></div>`).join('')}</td>
      <td class="req-cell">${esc(mandatoryFields(table).join(', ') || '—')}</td>
      <td>${restOfFields(table).map((f) => `<div>${esc(f)}</div>`).join('')}</td>
    </tr>`);
  }
}

const referenceViewInner = `
      <div class="content">
      <p style="color:var(--muted);margin-top:0">Mandatory = NOT NULL with no default. Rest of fields = optional, defaulted, and system-generated columns (including audit fields).</p>
      <div class="toolbar"><input id="filter" type="search" placeholder="Filter tables…" /></div>
      <div style="overflow:auto;max-height:80vh">
        <table class="data" id="ref-table">
          <thead><tr>
            <th>Domain</th><th>Table</th><th>Consumed for (purpose)</th>
            <th>Relational keys</th><th>Mandatory fields</th><th>Rest of fields</th>
          </tr></thead>
          <tbody>${referenceRows.join('')}</tbody>
        </table>
      </div>
      </div>`;

const fieldRows = tables
  .flatMap((table) =>
    table.columns.map((column) => {
      const req = classifyColumn(column);
      const notes = [
        column.foreignKey ? `FK → ${column.foreignKey}` : '',
        column.defaultValue ? `default ${column.defaultValue}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return `<tr data-table="${esc(table.name)}">
        <td>${esc(domainForTable(table.name))}</td>
        <td><code>${esc(table.name)}</code></td>
        <td><code>${esc(column.column)}</code></td>
        <td>${esc(column.sqlType)}</td>
        <td class="${req === 'Mandatory' ? 'req-cell' : ''}">${esc(req)}</td>
        <td>${esc(notes || '—')}</td>
      </tr>`;
    }),
  )
  .join('');

const fieldsViewInner = `
      <div class="content">
      <div class="toolbar">
        <input id="field-filter" type="search" placeholder="Filter by table or field…" />
      </div>
      <div style="overflow:auto;max-height:80vh">
        <table class="data" id="fields-table">
          <thead><tr>
            <th>Domain</th><th>Table</th><th>Field</th><th>Type</th><th>Requirement</th><th>Notes</th>
          </tr></thead>
          <tbody>${fieldRows}</tbody>
        </table>
      </div>
      </div>`;

// --- all-fields-flow: every column on the flow chart (* = mandatory) ---
const FULL_BOX_W = 300;
const FULL_LINE_H = 13;
const FULL_HEADER = 40;
const FULL_ROW_GAP = 22;
const FULL_LANE_W = FULL_BOX_W + LANE_PAD * 2;

const fullLayout = {};
let fullLaneX = 24;
let fullMaxLaneH = 0;

for (const [domain, names] of Object.entries(tableDomains)) {
  const heights = names.map((name) => {
    const table = tables.find((t) => t.name === name);
    return FULL_HEADER + (table?.columns.length ?? 0) * FULL_LINE_H + 12;
  });
  const laneH =
    LANE_HEADER +
    heights.reduce((sum, h) => sum + h, 0) +
    (names.length - 1) * FULL_ROW_GAP +
    LANE_PAD * 2;
  fullMaxLaneH = Math.max(fullMaxLaneH, laneH);
  let y = 40 + LANE_HEADER + LANE_PAD;
  for (const [index, name] of names.entries()) {
    const h = heights[index];
    fullLayout[name] = {
      x: fullLaneX + LANE_PAD,
      y,
      w: FULL_BOX_W,
      h,
      domain,
      laneX: fullLaneX,
      laneW: FULL_LANE_W,
      laneH,
    };
    y += h + FULL_ROW_GAP;
  }
  fullLaneX += FULL_LANE_W + COL_GAP;
}

const fullCanvasW = fullLaneX + 24;
const fullCanvasH = 40 + fullMaxLaneH + 24;

function fullBoxCenter(name) {
  const b = fullLayout[name];
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function fullEdgePath(from, to) {
  const a = fullBoxCenter(from);
  const b = fullBoxCenter(to);
  const bFrom = fullLayout[from];
  const bTo = fullLayout[to];
  let x1 = a.x;
  let y1 = a.y;
  let x2 = b.x;
  let y2 = b.y;
  if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
    if (a.x < b.x) {
      x1 = bFrom.x + bFrom.w;
      x2 = bTo.x;
    } else {
      x1 = bFrom.x;
      x2 = bTo.x + bTo.w;
    }
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }
  if (a.y < b.y) {
    y1 = bFrom.y + bFrom.h;
    y2 = bTo.y;
  } else {
    y1 = bFrom.y;
    y2 = bTo.y + bTo.h;
  }
  x1 = a.x;
  x2 = b.x;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function fullLaneBackgrounds() {
  return Object.entries(tableDomains)
    .map(([domain, names]) => {
      const first = fullLayout[names[0]];
      if (!first) return '';
      const color = domainColors[domain] ?? '#64748b';
      return `<rect x="${first.laneX}" y="40" width="${first.laneW}" height="${first.laneH}" rx="12" fill="${color}08" stroke="${color}33" stroke-width="1.5"/>
        <text x="${first.laneX + 12}" y="64" class="lane-title" fill="${color}">${esc(domain)}</text>`;
    })
    .join('');
}

function fullTableBoxes() {
  return tables
    .map((table) => {
      const b = fullLayout[table.name];
      if (!b) return '';
      const color = domainColors[b.domain] ?? '#64748b';
      const fieldLines = table.columns
        .map((column, index) => {
          const y = b.y + FULL_HEADER + index * FULL_LINE_H;
          const mandatory = classifyColumn(column) === 'Mandatory';
          const cls = mandatory ? 'field-line field-mandatory' : 'field-line';
          return `<text x="${b.x + 8}" y="${y}" class="${cls}">${esc(fieldFlowLabel(column))}</text>`;
        })
        .join('');
      return `<g class="table-full" data-table="${esc(table.name)}">
        <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#fff" stroke="${color}" stroke-width="2.5"/>
        <text x="${b.x + 8}" y="${b.y + 18}" class="table-name">${esc(table.name)}</text>
        <text x="${b.x + 8}" y="${b.y + 32}" class="table-purpose">${esc((tablePurpose[table.name] ?? '').slice(0, 42))}${(tablePurpose[table.name]?.length ?? 0) > 42 ? '…' : ''}</text>
        ${fieldLines}
      </g>`;
    })
    .join('');
}

function fullEdgeLines() {
  const seen = new Set();
  return edges
    .filter(({ from, to, label }) => {
      const key = `${from}|${to}|${label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return fullLayout[from] && fullLayout[to];
    })
    .map(
      ({ from, to }) =>
        `<path d="${fullEdgePath(from, to)}" class="edge" data-from="${esc(from)}" data-to="${esc(to)}"/>`,
    )
    .join('');
}

const allFieldsFlowCss = `
.content.wide { max-width: none; padding: 16px; }
#full-viewport {
  overflow: auto;
  background: linear-gradient(#e8eefc 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, #e8eefc 1px, transparent 1px) 0 0 / 24px 24px, #fafbff;
  min-height: 75vh;
  border: 1px solid var(--line);
  border-radius: 12px;
}
#full-canvas { width: ${fullCanvasW}px; height: ${fullCanvasH}px; margin: 12px; }
.table-purpose { font-size: 9px; fill: var(--muted); }
.field-line { font-size: 10px; fill: #334155; font-family: Consolas, "Courier New", monospace; }
.field-mandatory { fill: #b42318; font-weight: 700; }
.legend-box {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-bottom: 12px;
}
.legend-box code { color: #b42318; font-weight: 700; }
`;

const allFieldsViewInner = `
        <div class="legend-box">
          <strong>Field legend:</strong>
          <code>* field_name</code> = mandatory (NOT NULL, no default on insert) ·
          other lines = optional, defaulted, or system-generated (PK)
        </div>
        <div class="toolbar">
          <input id="full-search" type="search" placeholder="Find table or field…" />
          <button type="button" id="full-toggle-edges">Hide FK lines</button>
          <a class="btn" href="#reference">Table reference →</a>
        </div>
        <div id="full-viewport">
          <svg id="full-canvas" width="${fullCanvasW}" height="${fullCanvasH}" xmlns="http://www.w3.org/2000/svg">
            <defs><marker id="arrow-full" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs>
            <style>
              .lane-title { font-size: 15px; font-weight: 700; }
              .table-name { font-size: 13px; font-weight: 700; fill: #17225b; }
              .edge { fill: none; stroke: #94a3b8; stroke-width: 1.2; marker-end: url(#arrow-full); opacity: .45; }
              .table-full.dim { opacity: 0.15; }
              .table-full.highlight { opacity: 1; }
            </style>
            ${fullLaneBackgrounds()}
            <g id="full-edges">${fullEdgeLines()}</g>
            <g id="full-nodes">${fullTableBoxes()}</g>
          </svg>
        </div>`;

const domainViews = Object.entries(tableDomains)
  .map(([domain, names]) => {
    const slug = domainSlug(domain);
    const color = domainColors[domain] ?? '#64748b';
    const cards = names
      .map((name) => {
        const table = tables.find((t) => t.name === name);
        return table ? tableCard(table, domain) : '';
      })
      .join('');
    return viewSection(
      slug,
      `<div class="content">
        <p><span class="pill" style="background:${color}22;color:${color}">${esc(domain)}</span></p>
        <p style="color:var(--muted)">${names.length} tables in this domain.</p>
        ${cards}</div>`,
    );
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeIn5 DB schema</title>
  <style>${SHARED_CSS}${flowExtraCss}${allFieldsFlowCss}</style>
</head>
<body>
  <header class="site-header">
    <h1>SafeIn5 database schema</h1>
    <p>${tables.length} tables · <code>db/schema/*.sql</code> · one offline HTML file</p>
    ${renderNav()}
  </header>
  ${viewSection('flow', flowViewInner)}
  ${viewSection('all-fields', `<div class="content wide">${allFieldsViewInner}</div>`, { wide: true })}
  ${viewSection('reference', referenceViewInner)}
  ${viewSection('fields', fieldsViewInner)}
  ${domainViews}
  <script id="table-meta" type="application/json">${JSON.stringify(tableMeta)}</script>
  <script>
    const views = [...document.querySelectorAll('.view')];
    const navLinks = [...document.querySelectorAll('.site-nav a[data-view]')];
    const tableToView = ${JSON.stringify(
      Object.fromEntries(
        tables.map((t) => [t.name, domainSlug(domainForTable(t.name))]),
      ),
    )};

    function showView(id, scrollId) {
      views.forEach((v) => v.classList.toggle('is-on', v.dataset.view === id));
      navLinks.forEach((a) => a.classList.toggle('active', a.dataset.view === id));
      if (scrollId) {
        const el = document.getElementById(scrollId);
        if (el) el.scrollIntoView({ block: 'start' });
      }
    }

    function applyHash() {
      const raw = (location.hash || '#flow').replace(/^#/, '');
      if (raw.startsWith('tbl-')) {
        const table = raw.slice(4);
        showView(tableToView[table] || 'flow', raw);
        return;
      }
      if (document.getElementById('view-' + raw)) {
        showView(raw);
        return;
      }
      showView('flow');
    }

    window.addEventListener('hashchange', applyHash);
    applyHash();

    ${flowViewScript}

    document.getElementById('filter').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#ref-table tbody tr').forEach((tr) => {
        tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    document.getElementById('field-filter').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#fields-table tbody tr').forEach((tr) => {
        tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    const fullSearch = document.getElementById('full-search');
    const fullEdges = document.getElementById('full-edges');
    let edgesOn = true;
    document.getElementById('full-toggle-edges').onclick = (e) => {
      edgesOn = !edgesOn;
      fullEdges.style.display = edgesOn ? '' : 'none';
      e.target.textContent = edgesOn ? 'Hide FK lines' : 'Show FK lines';
    };
    fullSearch.addEventListener('input', () => {
      const q = fullSearch.value.trim().toLowerCase();
      document.querySelectorAll('.table-full').forEach((g) => {
        const name = g.dataset.table;
        const text = g.textContent.toLowerCase();
        const match = !q || name.includes(q) || text.includes(q);
        g.classList.toggle('dim', !!q && !match);
        g.classList.toggle('highlight', !!q && match);
      });
    });
  </script>
</body>
</html>`;

writeFileSync(outPath, html, 'utf8');
writeFileSync(
  join(root, 'docs', 'SafeIn5_DB_Schema_Flow_Chart.html'),
  `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=db-schema-flow-chart.html" />
  <title>SafeIn5 DB Schema</title>
</head><body>
  <p>Open <a href="db-schema-flow-chart.html">docs/db-schema-flow-chart.html</a></p>
</body></html>`,
  'utf8',
);
rmSync(legacySplitDir, { recursive: true, force: true });
console.log(`Wrote ${outPath} (${tables.length} tables, single file)`);
