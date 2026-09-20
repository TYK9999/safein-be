import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeXlsx } from './lib/xlsx.mjs';
import { loadSchemaSql } from './lib/schema-sql.mjs';

const root = resolve(import.meta.dirname, '..');
const schemaPath = join(root, 'db', 'schema', 'schema.sql');
const output = join(
  root,
  'docs',
  'SafeIn5_Website_to_Schema_Field_Mapping.xlsx',
);

const schemaSql = loadSchemaSql(schemaPath);

function splitDefinitions(body) {
  const definitions = [];
  let start = 0;
  let depth = 0;
  let quote = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "'" && body[index + 1] === "'" && quote) {
      index += 1;
    } else if (char === "'") {
      quote = !quote;
    } else if (!quote && char === '(') {
      depth += 1;
    } else if (!quote && char === ')') {
      depth -= 1;
    } else if (!quote && depth === 0 && char === ',') {
      definitions.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  definitions.push(body.slice(start).trim());
  return definitions;
}

export function parseSchema(sql) {
  const tables = [];
  const tablePattern = /^CREATE TABLE\s+([a-z][a-z0-9_]*)\s*\(([\s\S]*?)^\);/gm;
  let tableMatch;
  while ((tableMatch = tablePattern.exec(sql))) {
    const [, name, body] = tableMatch;
    const tableLine = sql.slice(0, tableMatch.index).split('\n').length;
    const columns = [];
    // Replace comments with spaces (while preserving offsets/newlines) before
    // splitting. Comments often contain commas, which are not column separators.
    const parseableBody = body.replace(/--[^\n]*/g, (comment) =>
      ' '.repeat(comment.length),
    );
    for (const definition of splitDefinitions(parseableBody)) {
      const normalized = definition.replace(/\s+/g, ' ').trim();
      if (
        !normalized ||
        /^(UNIQUE|PRIMARY|FOREIGN|CONSTRAINT|CHECK)\b/i.test(normalized)
      ) {
        continue;
      }
      const columnMatch = normalized.match(/^([a-z][a-z0-9_]*)\s+(.+)$/i);
      if (!columnMatch) continue;
      const [, column, remainder] = columnMatch;
      const typeMatch = remainder.match(
        /^(.+?)(?=\s+(?:GENERATED|PRIMARY|NOT NULL|NULL\b|REFERENCES|DEFAULT|CHECK|UNIQUE)\b|$)/i,
      );
      const sqlType = typeMatch?.[1]?.trim() ?? remainder;
      const defaultMatch = remainder.match(
        /\bDEFAULT\s+(.+?)(?=\s+(?:CHECK|REFERENCES|UNIQUE|PRIMARY)\b|$)/i,
      );
      const fkMatch = remainder.match(
        /\bREFERENCES\s+([a-z][a-z0-9_]*)\s*\(\s*([a-z][a-z0-9_]*)\s*\)/i,
      );
      const optionsMatch = remainder.match(/\bIN\s*\(([^)]*)\)/i);
      const definitionOffset = parseableBody.indexOf(definition);
      const sourceLine =
        tableLine + body.slice(0, definitionOffset).split('\n').length;
      const generated = /\bGENERATED\b/i.test(remainder);
      const notNull = /\bNOT NULL\b/i.test(remainder);
      const primaryKey = /\bPRIMARY KEY\b/i.test(remainder);
      const defaultValue = defaultMatch?.[1]?.trim() ?? '';
      columns.push({
        table: name,
        column,
        sqlType,
        sourceLine,
        generated,
        notNull,
        primaryKey,
        defaultValue,
        foreignKey: fkMatch ? `${fkMatch[1]}.${fkMatch[2]}` : '',
        options: optionsMatch
          ? [...optionsMatch[1].matchAll(/'([^']+)'/g)]
              .map((match) => match[1])
              .join(' | ')
          : '',
        requiredForInsert:
          notNull && !generated && !defaultValue ? 'Yes' : 'No',
        definition: normalized,
      });
    }
    tables.push({ name, sourceLine: tableLine, columns });
  }
  return tables;
}

const tables = parseSchema(schemaSql);
if (tables.length === 0) {
  throw new Error('No CREATE TABLE statements found in db/schema/schema.sql.');
}
const postCreateForeignKeys = {
  'document_placement.work_task_id': 'work_task.id',
  'content_placement.work_task_id': 'work_task.id',
  'work_task_prompt_setting.source_signal_id': 'signal.id',
};
for (const table of tables) {
  for (const column of table.columns) {
    column.foreignKey =
      postCreateForeignKeys[`${table.name}.${column.column}`] ??
      column.foreignKey;
  }
}

const tableScreens = {
  app_user: ['Users / Invite people', 's-users; s-user; s-user-new', '4431-4664'],
  auth_token: ['Sign in / invitation', 'login; invitation workflow', '1214-1240; 4560-4798'],
  tenant: ['Clients / Add a client', 's-tenants; s-tenant-new; s-tenant', '4671-4924'],
  user_tenant_membership: ['Users / Client administrator', 's-user-new; s-tenant-invite', '4560-4798'],
  site: ['Sites / Add a site', 's-sites; s-site-new', '2884-2993; 4293-4333'],
  user_site_membership: ['Invite people / Role and scope', 's-user; s-user-new', '4502-4664'],
  space: ['Sites / Add a space / QR label', 's-space-new; s-site-*; s-qr-print', '3971-4380'],
  hazard_category: ['Echo category / routing taxonomy', 's-echo-*; site routing', '1266-2210'],
  site_category_owner: ['Echo category owner / Assign to', 's-echo-*; s-user', '1473-1590; 4502-4554'],
  document: ['Documents / Upload a document', 's-docs; s-doc; s-doc-new', '5456-5689'],
  document_revision: ['Document detail / Upload revision', 's-doc; s-doc-new', '5511-5689'],
  document_placement: ['Attach this document', 's-doc; s-doc-attach', '5570-5600; 5970-6060'],
  content_pack: ['Content / Upload content', 's-content; s-content-new; s-content-item', '2656-2731; 5122-5274'],
  content_prompt: ['Checks a worker sees / Learn 5 prompts', 's-content-*; s-attached', '5160-5171; 5202-5214; 5714-5888'],
  content_asset: ['Content files and media', 's-content-new; s-content-item; s-attached', '5130-5143; 5216-5221; 5771-5817'],
  content_placement: ['Attach content to a task', 's-content-attach; s-attached', '5277-5332; 5692-5897'],
  work_task: ['Tasks / Add a task', 's-jobs; s-job; s-job-new', '2214-2416; 4928-5119'],
  work_task_crew: ['Add another user / PULSE team', 's-job-new; s-pulse', '4991-5006; 5388-5455'],
  work_task_content_prompt: ['Job Checklist / Learn 5 on this task', 's-attached', '6532-6576'],
  work_task_prompt_setting: ['Uncover / Shift on this task', 's-attached', '6655-6676'],
  work_task_learn5_media: ['Learn 5 visual media rows', 's-attached', '6578-6624'],
  pulse: ['Work Task PULSE', 's-pulse', '5388-5455'],
  signal: ['Echo queue / Echo detail', 's-queue; s-echo-*', '1266-2210; 2996-3674'],
  signal_classification_event: ['Response / Classified by', 's-echo-*', '1480-1515; 1884-1910'],
  signal_acknowledgement: ['Worker update / close message', 's-echo-a2; s-echo-a3; s-echo-a4', '1541-1769'],
  upload_session: ['Video / photo upload', 's-echo-*; s-content-new', '1430-1460; 5130-5143'],
  audio_clip: ['Voice note', 's-echo-*', '1437-1460; 1850-1870'],
  transcription_job: ['Voice transcript', 's-echo-*', '1437-1460; 1850-1870'],
  signal_media: ['Echo media', 's-echo-*', '1430-1460; 1845-1870'],
  checklist_completion: ['Job Checklist completions', 's-takefive; s-pulse', '1379-1408; 5388-5455'],
};

export const directMappings = {
  'app_user.email': ['Work email / Email', 'User-entered', 'admin@safein5.com', 'Direct'],
  'app_user.first_name': ['Name', 'User-entered; split full name', 'Jordan', 'Derived'],
  'app_user.last_name': ['Name', 'User-entered; split full name', 'Blake', 'Derived'],
  'app_user.phone': ['Country code + Phone number', 'User-entered; normalize to E.164', '+447700900411', 'Direct'],
  'app_user.email_verified_at': ['Email verified on first OTP', 'System-set on first successful OTP', '2026-08-05T09:00:00Z', 'Derived'],
  'app_user.account_status': ['Status / Suspend access', 'invited until first OTP, then active; admin can suspend', 'invited', 'Direct'],
  'app_user.is_platform_admin': ['SafeIn5 admin', 'System/admin permission', 'false', 'Direct'],
  'app_user.last_signed_in_at': ['Signed in ... ago', 'System-set on authentication', '2026-09-01T08:50:00Z', 'Derived'],
  'auth_token.user_id': ['Invited person / Sign-in user', 'Relation lookup', 'app_user.id', 'Derived'],
  'auth_token.kind': ['OTP token type', 'Always otp (email one-time code)', 'otp', 'Derived'],
  'auth_token.token_hash': ['OTP hash', 'System-generated hash; never import plaintext', '<hash>', 'System'],
  'auth_token.expires_at': ['OTP expiry', 'System-generated', '2026-09-02T09:00:00Z', 'System'],
  'auth_token.consumed_at': ['OTP used', 'System-set when the code is verified', '', 'System'],
  'auth_token.attempt_count': ['Sign-in attempts', 'System counter', '0', 'System'],
  'tenant.name': ['Client name / Organisation', 'User-entered', 'Meldon', 'Direct'],
  'tenant.kind': ['Client type', 'System/admin selected; not exposed in prototype', 'corporate', 'System'],
  'user_tenant_membership.user_id': ['Name / Email', 'Relation lookup', 'app_user.id', 'Derived'],
  'user_tenant_membership.tenant_id': ['Client', 'Relation lookup', 'tenant.id', 'Direct'],
  'user_tenant_membership.role': [
    'Client admin vs ordinary member',
    'Org-wide only. Invite as administrator → tenant_admin. Everyone else is member. Site job is user_site_membership.role_id → role.',
    'tenant_admin',
    'Direct',
  ],
  'site.tenant_id': ['Client', 'Current tenant context', 'tenant.id', 'Derived'],
  'site.name': ['Site name / Site', 'User-entered', 'North Quarry', 'Direct'],
  'user_site_membership.user_id': ['Name / Email / Site Manager / Supervisor', 'Relation lookup', 'app_user.id', 'Derived'],
  'user_site_membership.site_id': ['Site / Sites', 'User-selected relation; repeat for multiple sites', 'site.id', 'Direct'],
  'user_site_membership.role_id': ['Role on site / Role and scope', 'User-selected → role.id (site scope)', 'role.id', 'Direct'],
  'role.key': ['Role on site / Role and scope', 'Lookup when displaying role name', 'supervisor', 'Derived'],
  'space.tenant_id': ['Client', 'Inherited from selected site', 'tenant.id', 'Derived'],
  'space.site_id': ['Site', 'User-selected relation', 'site.id', 'Direct'],
  'space.name': ['Space name / Space', 'User-entered', 'Tank 3B', 'Direct'],
  'space.location': ['Location on site / Location', 'User-entered', 'North tank farm, bund 2', 'Direct'],
  'space.asset_type': ['Asset type / Location · asset', 'User-entered or derived; no add-space control in prototype', 'Storage tank · confined space', 'Partial'],
  'space.task_type': ['Task type', 'User-selected', 'Confined space entry', 'Direct'],
  'space.qr_code': ['QR code', 'System-generated', 'SIS-QR-0031', 'Direct'],
  'space.permit_required': ['Permit required before work can start', 'User checkbox', 'true', 'Direct'],
  'space.rescue_plan_required': ['This space should carry a rescue plan', 'User checkbox', 'true', 'Direct'],
  'space.content_owner_user_id': ['Content owner', 'User/routing selection', 'app_user.id', 'Direct'],
  'space.owner_rule': ['Content owner / Owner rule', 'Routing rule display or generated description', 'Supervisor, Plant A', 'Partial'],
  'hazard_category.name': ['Category / Hazard category', 'Admin-selected/displayed', 'Confined space', 'Direct'],
  'hazard_category.energy_band': ['High energy / SIF potential', 'Taxonomy configuration', 'high_energy', 'Derived'],
  'hazard_category.sort_order': ['Category display order', 'System/admin ordering', '20', 'System'],
  'site_category_owner.site_id': ['Site', 'Routing-rule scope', 'site.id', 'Direct'],
  'site_category_owner.hazard_category_id': ['Category / Owns by rule', 'Routing-rule category', 'hazard_category.id', 'Direct'],
  'site_category_owner.owner_user_id': ['Assign to / Owner', 'User-selected relation', 'app_user.id', 'Direct'],
  'document.tenant_id': ['Client / Belongs to', 'User-selected; blank for SafeIn5 library', 'tenant.id', 'Direct'],
  'document.title': ['Document', 'User-entered or derived from filename', 'Confined Space Rescue Plan', 'Partial'],
  'document.doc_type': ['What kind of document is it? / Type', 'User-selected; prototype has more options than schema enum', 'rescue_plan', 'Direct'],
  'document.status': ['Status / Approve', 'User workflow', 'approved', 'Direct'],
  'document_revision.document_id': ['Document', 'Parent relation', 'document.id', 'Derived'],
  'document_revision.revision': ['Reference / Revision', 'User-entered or system revision label', 'r4 · rev Jan 26', 'Partial'],
  'document_revision.s3_key': ['File', 'System-set after upload', 'documents/rescue-plan-r4.pdf', 'Derived'],
  'document_revision.mime_type': ['File type', 'System-detected', 'application/pdf', 'Derived'],
  'document_revision.size_bytes': ['File size', 'System-detected', '491520', 'Derived'],
  'document_revision.is_current': ['Current/live revision', 'System-set when revision saved', 'true', 'Derived'],
  'document_placement.document_id': ['Document', 'Selected document relation', 'document.id', 'Direct'],
  'document_placement.scope_kind': ['Belongs to / Applies to', 'User-selected scope', 'space', 'Direct'],
  'document_placement.tenant_id': ['Client', 'Selected target when scope is tenant', 'tenant.id', 'Conditional'],
  'document_placement.site_id': ['Site', 'Selected target when scope is site', 'site.id', 'Conditional'],
  'document_placement.space_id': ['Space', 'Selected target when scope is space', 'space.id', 'Conditional'],
  'document_placement.work_task_id': ['Task', 'Selected target when scope is work_task', 'work_task.id', 'Conditional'],
  'document_placement.inherited': ['How / Inherited from space', 'System-derived placement display', 'true', 'Derived'],
  'content_pack.tenant_id': ['Client / Owner', 'Tenant context; blank for SafeIn5 library', 'tenant.id', 'Derived'],
  'content_pack.kind': ['Which kind of content is this? / Kind', 'User-selected', 'job_checklist', 'Direct'],
  'content_pack.title': ['Title', 'User-entered/editable', 'Confined space entry — before you go in', 'Direct'],
  'content_pack.category': ['Category', 'User/admin-selected', 'Safety', 'Direct'],
  'content_pack.duration_min': ['Duration', 'User/admin-entered', '5', 'Direct'],
  'content_pack.status': ['State / Publish this revision', 'User workflow', 'published', 'Direct'],
  'content_pack.revision': ['Revision', 'System-generated on publish', 'r4', 'Derived'],
  'content_pack.published_at': ['Published', 'System-set on publish', '2026-08-02T10:00:00Z', 'Derived'],
  'content_prompt.content_pack_id': ['Content / Job Checklist / Learn 5', 'Parent relation', 'content_pack.id', 'Derived'],
  'content_prompt.sort_order': ['Check/Prompt number', 'User ordering', '1', 'Direct'],
  'content_prompt.body_text': ['Check text / Prompt text', 'Existing library list; tasks select this row, they do not copy the text', 'Has the space been isolated, drained and vented?', 'Direct'],
  'content_prompt.is_critical': ['Critical', 'User checkbox', 'true', 'Direct'],
  'content_prompt.is_mandatory': ['Mandatory / Required', 'User checkbox/selection', 'true', 'Direct'],
  'content_asset.content_pack_id': ['Content', 'Parent relation', 'content_pack.id', 'Derived'],
  'content_asset.s3_key': ['Files / Media', 'System-set after upload', 'content/confined-space-entry.pdf', 'Derived'],
  'content_asset.filename': ['File name', 'System from upload', 'confined-space-entry-brief.pdf', 'Direct'],
  'content_asset.mime_type': ['File type', 'System-detected', 'application/pdf', 'Derived'],
  'content_asset.size_bytes': ['File size', 'System-detected', '1258291', 'Derived'],
  'content_asset.duration_sec': ['Media duration', 'System-detected for video/audio', '45', 'Derived'],
  'content_placement.content_pack_id': ['Content', 'Selected content relation', 'content_pack.id', 'Direct'],
  'content_placement.pack_kind': ['Kind (Job Checklist / Learn 5 / Uncover / Shift)', 'Copied from content_pack.kind', 'job_checklist', 'Derived'],
  'content_placement.scope_kind': ['Attach to a task / space', 'User-selected scope', 'work_task', 'Direct'],
  'content_placement.space_id': ['Space', 'Selected target when scope is space', 'space.id', 'Conditional'],
  'content_placement.work_task_id': ['Task / Attach', 'Selected target when scope is work_task', 'work_task.id', 'Conditional'],
  'content_placement.inherited': ['From / Inherited from space', 'System-derived when Uncover/content sits on the space', 'true', 'Derived'],
  'content_placement.learn5_kind': ['Which kind of Learn 5 is this?', 'User-selected on s-attached Learn 5 tab', 'list', 'Conditional'],
  'work_task_content_prompt.work_task_id': ['Task', 'Parent relation', 'work_task.id', 'Derived'],
  'work_task_content_prompt.content_prompt_id': ['Prompt from library', 'Selected existing Job Checklist or Learn 5 prompt; shared across tasks', 'content_prompt.id', 'Direct'],
  'work_task_content_prompt.pack_kind': ['Job Checklist or Learn 5', 'From the selected prompt’s pack', 'job_checklist', 'Derived'],
  'work_task_content_prompt.sort_order': ['Order on this task', 'User order on s-attached', '1', 'Direct'],
  'work_task_content_prompt.is_critical': ['Critical', 'Job Checklist checkbox on this task only', 'true', 'Direct'],
  'work_task_content_prompt.is_mandatory': ['Mandatory', 'Learn 5 checkbox on this task only', 'true', 'Direct'],
  'work_task_content_prompt.fail_missing_items': ['If it fails, ask the worker what is missing', 'Tags on this task’s critical Job Checklist row', 'Isolation certificate; Lock and tag', 'Direct'],
  'work_task_content_prompt.tied_checklist_prompt_id': ['Shown with which Job Checklist check', 'Learn 5 dropdown; points at a library Job Checklist prompt', 'content_prompt.id', 'Conditional'],
  'work_task_prompt_setting.work_task_id': ['Task', 'Parent relation', 'work_task.id', 'Derived'],
  'work_task_prompt_setting.content_placement_id': ['Attached Uncover / Shift pack', 'Optional pack this check was initialised from', 'content_placement.id', 'Conditional'],
  'work_task_prompt_setting.pack_kind': ['Uncover or Shift', 'Tab on s-attached', 'uncover', 'Direct'],
  'work_task_prompt_setting.sort_order': ['Order on the phone', 'User order on s-attached', '1', 'Direct'],
  'work_task_prompt_setting.source': ['How this check was added', 'custom / echo / library', 'echo', 'Direct'],
  'work_task_prompt_setting.content_prompt_id': ['Optional library Uncover/Shift prompt', 'Copied wording if started from a pack', 'content_prompt.id', 'Conditional'],
  'work_task_prompt_setting.source_signal_id': ['Open Echo this Uncover check came from', 'Relation when Uncover is pulled from Echoes', 'signal.id', 'Conditional'],
  'work_task_prompt_setting.body_text': ['Check wording', 'Edited Uncover / Shift text on this task', 'Is the ladder rung still damaged?', 'Direct'],
  'work_task_learn5_media.work_task_id': ['Task', 'Parent relation', 'work_task.id', 'Derived'],
  'work_task_learn5_media.content_placement_id': ['Learn 5 attachment', 'The visual-media Learn 5 on this task', 'content_placement.id', 'Direct'],
  'work_task_learn5_media.content_asset_id': ['Media in this row', 'Flash card / reel from the pack', 'content_asset.id', 'Direct'],
  'work_task_learn5_media.row_kind': ['This row is Required / Optional', 'User-selected on s-attached Learn 5 visual media', 'required', 'Direct'],
  'work_task_learn5_media.sort_order': ['Order in the row', 'User order', '0', 'Direct'],
  'work_task.tenant_id': ['Client', 'Current tenant context', 'tenant.id', 'Derived'],
  'work_task.site_id': ['Site', 'Derived from selected space', 'site.id', 'Derived'],
  'work_task.space_id': ['Space', 'User-selected relation', 'space.id', 'Direct'],
  'work_task.reference': ['Task reference / Task', 'User-entered', 'PTW-4471', 'Direct'],
  'work_task.work_description': ['What is the work / Work', 'User-entered or RAMS suggestion', 'Tank cleaning', 'Direct'],
  'work_task.status': ['Status', 'User workflow', 'active', 'Direct'],
  'work_task.permit_required': ['Permit required before work can start', 'User checkbox', 'true', 'Direct'],
  'work_task.permit_type': ['Permit reference type', 'User-selected', 'Special Permit — Confined Space', 'Direct'],
  'work_task.permit_number': ['Permit reference number / Permit', 'User-entered', 'PTW-4471', 'Direct'],
  'work_task.permit_valid_until': ['Permit valid to', 'User-entered or document-derived', '2026-09-01T19:00:00Z', 'Partial'],
  'work_task.rams_document_id': ['RAMS document', 'User-selected relation', 'document.id', 'Direct'],
  'work_task.rams_reference': ['RAMS reference number', 'User-entered', 'RAMS-4471-B', 'Direct'],
  'work_task.lead_user_id': ['Task Lead', 'User-selected relation', 'app_user.id', 'Direct'],
  'work_task.copied_from_task_id': ['Start from an existing task', 'Selected template/source task', 'work_task.id', 'Direct'],
  'work_task.starts_at': ['Starts / Started', 'User-entered', '2026-09-01T07:00:00Z', 'Direct'],
  'work_task.ends_at': ['Runs for / Permit expiry', 'Derived from starts + duration or entered expiry', '2026-09-04T07:00:00Z', 'Derived'],
  'work_task.planned_days': ['Runs for', 'User-entered duration', '3', 'Direct'],
  'work_task_crew.work_task_id': ['Task', 'Parent relation', 'work_task.id', 'Derived'],
  'work_task_crew.user_id': ['Add another user / Team', 'User-selected relation; one row per person', 'app_user.id', 'Direct'],
  'pulse.tenant_id': ['Client', 'Derived from task/space', 'tenant.id', 'Derived'],
  'pulse.site_id': ['Site / Location', 'Derived from task/space', 'site.id', 'Derived'],
  'pulse.space_id': ['Space / Asset', 'QR-selected relation', 'space.id', 'Direct'],
  'pulse.work_task_id': ['Task / Permit', 'Selected/active task relation', 'work_task.id', 'Direct'],
  'pulse.worker_user_id': ['Started by / From', 'Authenticated worker', 'app_user.id', 'Derived'],
  'pulse.source': ['Source', 'Worker journey selection', 'work_task', 'Direct'],
  'pulse.trigger': ['Trigger', 'System capture', 'qr_scan', 'Direct'],
  'pulse.started_at': ['Started', 'System capture', '2026-09-01T07:12:00Z', 'Direct'],
  'signal.tenant_id': ['Client', 'Derived from PULSE', 'tenant.id', 'Derived'],
  'signal.author_user_id': ['From / Reporter', 'Authenticated worker relation', 'app_user.id', 'Direct'],
  'signal.classification': ['Response · set by AI / Classification', 'AI or human selected', 'needs_attention_now', 'Direct'],
  'signal.body_text': ['What the AI reads / Worker summary', 'Captured/AI-generated text', 'Rescue set missing at entry', 'Direct'],
  'signal.is_anonymous': ['From · named / Anonymous', 'Worker privacy choice', 'false', 'Direct'],
  'signal.status': ['Queue status', 'System workflow compatibility status', 'open', 'Derived'],
  'signal.acknowledged_at': ['Acknowledged', 'System-set on acknowledgement', '2026-09-01T07:44:00Z', 'Direct'],
  'signal.acknowledged_by': ['Acknowledged by', 'Actor relation', 'app_user.id', 'Direct'],
  'signal.closed_at': ['Closed / When', 'System-set on close', '2026-09-01T08:31:00Z', 'Direct'],
  'signal.closed_by': ['Closed by', 'Actor relation', 'app_user.id', 'Direct'],
  'signal.close_note': ['What was done / Close note', 'User-entered action narrative', 'Rescue set staged and permit re-briefed.', 'Direct'],
  'signal.echo_ref': ['Echo', 'System-generated display reference', '4471-03', 'Direct'],
  'signal.title': ['Echo title', 'AI-generated; user editable', 'Rescue set not staged before entry', 'Direct'],
  'signal.ai_summary': ['AI summary / What the AI reads', 'AI-generated', 'Worker stopped because rescue equipment was absent.', 'Direct'],
  'signal.transcript': ['Transcript / Voice note', 'STT-generated', 'The rescue set is not here so we stopped.', 'Direct'],
  'signal.source': ['Source', 'Captured journey source', 'work_task', 'Direct'],
  'signal.pulse_stage': ['PULSE stage', 'Captured journey stage', 'shift', 'Direct'],
  'signal.worker_visible_status': ['Status shown on phone', 'Workflow state', 'viewed', 'Direct'],
  'signal.site_id': ['Site', 'Derived relation', 'site.id', 'Derived'],
  'signal.space_id': ['Space', 'Derived relation', 'space.id', 'Direct'],
  'signal.work_task_id': ['Task', 'Derived/selected relation', 'work_task.id', 'Direct'],
  'signal.pulse_id': ['PULSE ID', 'Parent relation', 'pulse.id', 'Direct'],
  'signal.hazard_category_id': ['Category / Hazard category', 'AI/human selected relation', 'hazard_category.id', 'Direct'],
  'signal.assigned_to_user_id': ['Owner / Assign to', 'User/routing selected relation', 'app_user.id', 'Direct'],
  'signal.assigned_at': ['Assigned at', 'System-set', '2026-09-01T07:44:00Z', 'Direct'],
  'signal.assigned_by': ['Assigned by', 'Actor or site rule', 'app_user.id', 'Direct'],
  'signal.due_at': ['Due', 'User/rule-entered', '2026-09-01T17:00:00Z', 'Direct'],
  'signal.viewed_at': ['Viewed', 'System-set', '2026-09-01T07:50:00Z', 'Direct'],
  'signal.viewed_by': ['Viewed by', 'Actor relation', 'app_user.id', 'Derived'],
  'signal.actioned_at': ['Actioned', 'System-set', '2026-09-01T08:26:00Z', 'Direct'],
  'signal.actioned_by': ['Actioned by', 'Actor relation', 'app_user.id', 'Derived'],
  'signal.captured_at': ['Captured / Time', 'Device-captured timestamp', '2026-09-01T07:42:00Z', 'Direct'],
  'signal.synced_at': ['Captured offline / Reached queue', 'System sync timestamp', '2026-09-01T07:43:00Z', 'Derived'],
  'signal.geo_lat': ['Geo-located · latitude', 'Device location', '52.123456', 'Direct'],
  'signal.geo_lng': ['Geo-located · longitude', 'Device location', '-1.234567', 'Direct'],
  'signal.title_edited_by': ['Edited title', 'Actor relation', 'app_user.id', 'Derived'],
  'signal.classification_source': ['Classified by', 'AI/human source', 'ai', 'Direct'],
  'signal_classification_event.signal_id': ['Echo', 'Parent relation', 'signal.id', 'Derived'],
  'signal_classification_event.classification': ['Response / Classification', 'AI/human selected', 'needs_attention_now', 'Direct'],
  'signal_classification_event.source': ['Classified by', 'AI/human source', 'human', 'Direct'],
  'signal_classification_event.actor_user_id': ['Recorded by', 'Actor relation; blank for AI', 'app_user.id', 'Derived'],
  'signal_acknowledgement.signal_id': ['Echo', 'Parent relation', 'signal.id', 'Derived'],
  'signal_acknowledgement.stage': ['Received / Viewed / Actioned / Closed', 'Workflow stage', 'closed', 'Direct'],
  'signal_acknowledgement.body_text': ['Worker told / Your message', 'System or user message', 'The rescue set is now staged. Thanks for stopping.', 'Direct'],
  'signal_acknowledgement.sent_at': ['Delivered / Sent', 'System delivery timestamp', '2026-09-01T08:31:00Z', 'Direct'],
  'signal_acknowledgement.is_automatic': ['Acknowledged automatically', 'System flag', 'false', 'Direct'],
  'upload_session.session_token': ['Upload', 'System-generated', '<opaque-token>', 'System'],
  'upload_session.tenant_id': ['Client', 'Current tenant context', 'tenant.id', 'Derived'],
  'upload_session.s3_key': ['Photo / Video file', 'System storage key', 'signals/video-001.mp4', 'Derived'],
  'upload_session.s3_upload_id': ['Upload', 'S3 multipart identifier', '<s3-upload-id>', 'System'],
  'upload_session.filename': ['Photo / Video filename', 'Device upload metadata', 'entry-point.mp4', 'Direct'],
  'upload_session.mime_type': ['Media type', 'System/device metadata', 'video/mp4', 'Derived'],
  'upload_session.size_bytes': ['File size', 'System/device metadata', '18874368', 'Derived'],
  'upload_session.chunk_size': ['Upload chunk size', 'System configuration', '5242880', 'System'],
  'upload_session.chunk_count': ['Upload chunks', 'System-calculated', '4', 'System'],
  'upload_session.next_chunk_number': ['Upload progress', 'System counter', '1', 'System'],
  'upload_session.parts': ['Upload parts', 'System S3 metadata JSON', '[]', 'System'],
  'upload_session.status': ['Upload status', 'System workflow', 'completed', 'Derived'],
  'upload_session.video_id': ['Video', 'System-generated', 'video-001', 'System'],
  'upload_session.completed_at': ['Upload completed', 'System-set', '2026-09-01T07:42:00Z', 'System'],
  'upload_session.thumbnail_key': ['Video thumbnail', 'System-generated storage key', 'thumbs/video-001.jpg', 'System'],
  'upload_session.thumbnail_status': ['Thumbnail status', 'System workflow', 'ready', 'System'],
  'upload_session.thumbnail_attempts': ['Thumbnail attempts', 'System counter', '1', 'System'],
  'upload_session.playback_key': ['Video playback', 'System-generated storage key', 'playback/video-001.mp4', 'System'],
  'upload_session.playback_status': ['Playback status', 'System workflow', 'ready', 'System'],
  'upload_session.playback_attempts': ['Playback attempts', 'System counter', '1', 'System'],
  'audio_clip.tenant_id': ['Client', 'Current tenant context', 'tenant.id', 'Derived'],
  'audio_clip.s3_key': ['Voice note', 'System storage key', 'signals/voice-001.m4a', 'Derived'],
  'audio_clip.mime_type': ['Voice media type', 'Device metadata', 'audio/mp4', 'Derived'],
  'audio_clip.size_bytes': ['Voice file size', 'Device metadata', '245760', 'Derived'],
  'audio_clip.status': ['Voice upload status', 'System workflow', 'uploaded', 'Derived'],
  'audio_clip.uploaded_at': ['Voice uploaded', 'System-set', '2026-09-01T07:42:00Z', 'System'],
  'transcription_job.tenant_id': ['Client', 'Current tenant context', 'tenant.id', 'Derived'],
  'transcription_job.job_name': ['Voice transcript job', 'System-generated', 'signal-4471-03-voice-1', 'System'],
  'transcription_job.s3_key': ['Voice note', 'System storage key', 'signals/voice-001.m4a', 'Derived'],
  'transcription_job.language': ['Transcript language', 'Detected/selected language', 'en-GB', 'Derived'],
  'transcription_job.status': ['Transcript status', 'System workflow', 'completed', 'System'],
  'transcription_job.transcript': ['Transcript', 'STT result', 'The rescue set is not here so we stopped.', 'Direct'],
  'transcription_job.failure_reason': ['Transcription failure', 'System error', '', 'System'],
  'transcription_job.completed_at': ['Transcript completed', 'System-set', '2026-09-01T07:43:00Z', 'System'],
  'signal_media.signal_id': ['Echo', 'Parent relation', 'signal.id', 'Derived'],
  'signal_media.kind': ['Photo / Video / Voice / After photo', 'User-selected/captured media kind', 'photo', 'Direct'],
  'signal_media.sort_order': ['Photo 1 of 2 / Media order', 'Capture/display order', '1', 'Direct'],
  'signal_media.caption': ['Media caption', 'User/AI description', 'Entry point, no rescue set staged', 'Direct'],
  'signal_media.upload_session_id': ['Photo / Video upload', 'Relation to uploaded media', 'upload_session.id', 'Derived'],
  'signal_media.audio_clip_id': ['Voice note', 'Relation to audio clip', 'audio_clip.id', 'Derived'],
  'signal_media.transcription_job_id': ['Transcript', 'Relation to STT job', 'transcription_job.id', 'Derived'],
  'checklist_completion.tenant_id': ['Client', 'Derived from PULSE', 'tenant.id', 'Derived'],
  'checklist_completion.pulse_id': ['PULSE', 'Parent journey relation', 'pulse.id', 'Direct'],
  'checklist_completion.space_id': ['Space', 'Derived relation', 'space.id', 'Direct'],
  'checklist_completion.work_task_id': ['Task', 'Derived relation', 'work_task.id', 'Direct'],
  'checklist_completion.content_pack_id': ['Job Checklist', 'Completed checklist relation', 'content_pack.id', 'Direct'],
  'checklist_completion.worker_user_id': ['From', 'Authenticated worker relation', 'app_user.id', 'Direct'],
  'checklist_completion.outcome': ['Outcome', 'Worker-selected journey outcome', 'stopped', 'Direct'],
  'checklist_completion.signal_id': ['Echo', 'Generated Echo relation when applicable', 'signal.id', 'Conditional'],
  'checklist_completion.completed_at': ['Time / Completed', 'System capture', '2026-09-01T07:42:00Z', 'Direct'],
};

const websiteGaps = [
  ['Clients', 'Client ID', 's-tenants; s-tenant-new; s-tenant', 'CLI-0007', 'No dedicated column. tenant.id is the system key; display Client ID is not stored yet.', 'Add tenant.client_ref text UNIQUE NOT NULL.'],
  ['Clients', 'Domain or general address / Domain', 's-tenant-new; s-tenant', 'hartleymarine.co.uk', 'No tenant domain column.', 'Add tenant.domain text.'],
  ['Clients', 'Status (Active/Inactive)', 's-tenant-new; s-tenant', 'Active', 'tenant has kind but no lifecycle status.', "Add tenant.status with active/inactive CHECK and optionally deactivated_at."],
  ['Clients', 'Echo records retention', 's-tenant', '7 years / 3 years / 10 years / indefinitely', 'No tenant-level Echo retention policy column.', 'Add tenant.echo_retention_days integer nullable, where null means indefinite.'],
  ['Clients', 'Media retention', 's-tenant', '2 years / 1 year / 5 years / match Echo record', 'No tenant-level media retention policy column.', 'Add tenant.media_retention_days and media_retention_matches_echo boolean, or a normalized retention_policy table.'],
  ['Sites', 'Site location', 's-site-new', 'Ashbourne, Derbyshire · 3 km²', 'site has no location/description column.', 'Add site.location text.'],
  ['Sites', 'Supervisor', 's-site-new', 'Tom Wilson', 'Representable only as user_site_membership role=supervisor, not a single site field.', 'Keep membership model; create one membership row.'],
  ['Users', 'Name (single full-name field)', 's-user-new; s-tenant-invite', 'Jordan Blake', 'Schema requires optional first_name and last_name; splitting names is ambiguous.', 'Expose separate fields or add display_name text.'],
  ['Users', 'Trade / specialism', 's-users', 'Worker · scaffolding', 'No user trade/specialism column.', 'Add app_user.specialism text or normalized skill tables.'],
  ['Content prompt', 'If it fails, ask what is missing', 's-attached', 'Isolation certificate; Lock and tag; Vent line', 'Stored per task on work_task_content_prompt.fail_missing_items.', 'No extra table — jsonb list on the task selection row.'],
  ['Content attachment', 'Task-specific Critical/Mandatory behavior', 's-attached', 'Same checklist prompt can be critical on one task and not on another', 'work_task_content_prompt holds per-task is_critical / is_mandatory; content_prompt is the shared list.', 'No extra table.'],
  ['Learn 5 prompt', 'Shown with which Job Checklist check', 's-attached', 'Is the atmosphere test in date...', 'work_task_content_prompt.tied_checklist_prompt_id points at a shared Job Checklist content_prompt.', 'No extra column on content_prompt.'],
  ['Learn 5 media', 'This row is Required / Optional', 's-attached', 'Required', 'work_task_learn5_media.row_kind is required or optional; the same asset can appear in both rows.', 'No extra group table.'],
  ['Documents', 'Expanded document kinds', 's-doc-new', 'Fire risk assessment', 'Website lists many kinds not allowed by document.doc_type CHECK.', 'Expand enum/check or introduce document_type lookup table.'],
  ['Documents', 'Reference separate from revision', 's-doc-new; s-doc', 'PTW-4471', 'document_revision.revision currently conflates reference and revision.', 'Add document.reference text; retain document_revision.revision.'],
  ['PULSE', 'Status (Completed/In progress/Abandoned)', 's-pulse', 'Completed', 'pulse has no status.', "Add pulse.status CHECK ('in_progress','completed','abandoned')."],
  ['PULSE', 'Completed at / duration', 's-pulse', 'Completed 07:41 · 29 minutes', 'pulse stores started_at only.', 'Add pulse.completed_at; duration can be derived.'],
  ['PULSE', 'PULSE participants / team', 's-pulse', 'Alex M. and 2 others', 'work_task_crew identifies task crew, not the people who actually joined one PULSE.', 'Add pulse_participant(pulse_id, user_id, joined_at).'],
  ['PULSE', 'Journey events (Pause, Shift, Uncover, Checklist, Learn 5)', 's-pulse', '9 events captured', 'Only Echoes and checklist completions are stored; generic non-Echo journey events are not.', 'Add pulse_event(pulse_id, stage, event_type, body/data, captured_at, queued_signal_id).'],
  ['Echo outcome', 'Noted / No action needed / Shared to feed', 's-echo-noaction; s-echo-noted', 'Noted · closed', 'Current signal status values cannot distinguish these outcomes.', 'Add signal.resolution_type and shared_to_space_feed_at.'],
  ['Echo hold', 'Why it was held / Waiting on / held by / held at', 's-echo-a-held', 'Waiting on Site Manager', 'worker_visible_status can be held, but hold reason, actor, target and timestamps are not stored.', 'Add signal_hold event/table or signal.held_reason, held_by, held_for_user_id, held_at, released_at.'],
  ['Echo review', 'Supervisor review note and reviewer', 's-echo-a2', 'Reviewed and confirmed by Site Manager', 'No general Echo review/event record stores the review text and reviewer.', 'Add signal_review or a generic signal_event table with actor, type, body and occurred_at.'],
  ['Echo classification', 'Category/response override note', 's-echo-*', 'Changed from AI suggestion', 'Classification history stores value/source/actor but no reason or note.', 'Add reason text to signal_classification_event or a generic signal_event record.'],
  ['Echo trends', 'Occurrence count / Raises a trend at', 's-echo-noted', '5 in 30 days', 'Not persisted by current schema; can be computed, but threshold has no configuration.', 'Add trend/rule tables only if thresholds must be configurable/auditable.'],
  ['Documents', 'Page count / document metadata', 's-doc; s-doc-new', '2 pages', 'document_revision stores MIME type and size but not page count or extracted metadata.', 'Add page_count integer and/or metadata jsonb if the API must reproduce this display without inspecting the file.'],
  ['Authentication', 'Password / Keep me signed in', 'signin', 'Password; device persistence', 'Schema supports email OTP only (no magic link, no password). First successful OTP activates invited users. Refresh uses an httpOnly cookie, not a session table.', 'Keep passwordless OTP; add password/session tables only if the prototype must keep a password sign-in.'],
  ['Attachments', 'Exactly one target matching scope_kind', 'document/content attachment screens', 'Space or Task', 'CHECK constraints require the matching FK for document_placement and content_placement.', 'No extra table.'],
  ['Tenant/site permissions', 'Back office access feature toggles', 's-user', 'Queue on; Content off', 'UI says access follows role; no per-feature permission table.', 'No change if role-based access is intentional.'],
  ['Analytics', 'Participation / median close time / trends', 's-dashboard; site/client cards', '80% participation', 'Explicitly derived aggregations, not source fields.', 'Do not import; calculate from PULSE, checklist and signal timestamps.'],
];

function mappingFor(column) {
  const key = `${column.table}.${column.column}`;
  const direct = directMappings[key];
  const [module, screen, lines] = tableScreens[column.table] ?? [
    'Not explicit in website',
    '',
    '',
  ];
  if (direct) {
    return {
      websiteField: direct[0],
      population: direct[1],
      example: direct[2],
      mappingStatus: direct[3],
      module,
      screen,
      websiteLines: lines,
    };
  }
  if (column.column === 'id') {
    return {
      websiteField: 'Record ID / relation identifier',
      population: column.generated
        ? 'Database-generated identity; do not supply on normal insert'
        : 'System identifier',
      example: '<generated>',
      mappingStatus: 'System',
      module,
      screen,
      websiteLines: lines,
    };
  }
  if (column.column === 'created_at' || column.column === 'updated_at') {
    return {
      websiteField:
        column.column === 'created_at' ? 'Created / Uploaded / Captured' : 'Last updated',
      population:
        column.column === 'created_at'
          ? 'Database default timestamp'
          : 'Database default and update trigger',
      example: '2026-09-01T09:00:00Z',
      mappingStatus: 'Audit',
      module,
      screen,
      websiteLines: lines,
    };
  }
  if (column.column === 'created_by' || column.column === 'updated_by') {
    return {
      websiteField:
        column.column === 'created_by' ? 'Created/Uploaded by' : 'Last changed by',
      population: 'Authenticated actor app_user.id; nullable for system actions',
      example: 'app_user.id',
      mappingStatus: 'Audit',
      module,
      screen,
      websiteLines: lines,
    };
  }
  return {
    websiteField: 'No explicit website field identified',
    population: column.defaultValue
      ? `Use schema default ${column.defaultValue}`
      : column.requiredForInsert === 'Yes'
        ? 'Backend/system must populate'
        : 'Leave null unless backend has a value',
    example: '',
    mappingStatus: 'Unmapped schema field',
    module,
    screen,
    websiteLines: lines,
  };
}

const allColumns = tables.flatMap((table) => table.columns);
const schemaKeys = new Set(
  allColumns.map((column) => `${column.table}.${column.column}`),
);
const unknownMappingKeys = Object.keys(directMappings).filter(
  (key) => !schemaKeys.has(key),
);
if (unknownMappingKeys.length > 0) {
  throw new Error(
    `Mapping entries do not exist in schema: ${unknownMappingKeys.join(', ')}`,
  );
}

/** Plumbing tables: no labelled controls on the website. */
const hiddenTables = new Set([
  'auth_token',
  'upload_session',
  'audio_clip',
  'transcription_job',
]);

/** Columns the website never shows as a labelled field. */
const hiddenColumns = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  's3_key',
  's3_upload_id',
  'session_token',
  'token_hash',
  'parts',
  'chunk_size',
  'chunk_count',
  'next_chunk_number',
  'thumbnail_key',
  'thumbnail_status',
  'thumbnail_attempts',
  'playback_key',
  'playback_status',
  'playback_attempts',
  'video_id',
  'job_name',
  'failure_reason',
  'email_verified_at',
  'is_current',
  'attempt_count',
  'consumed_at',
  'expires_at',
]);

function isVisibleOnWebsite(column, mapping) {
  if (hiddenTables.has(column.table)) return false;
  if (hiddenColumns.has(column.column)) return false;
  if (!Object.hasOwn(directMappings, `${column.table}.${column.column}`)) {
    return false;
  }
  return ['Direct', 'Conditional', 'Partial', 'Derived'].includes(
    mapping.mappingStatus,
  );
}

const visibleColumns = allColumns.filter((column) =>
  isVisibleOnWebsite(column, mappingFor(column)),
);

const fieldMapRows = visibleColumns.map((column) => {
  const mapping = mappingFor(column);
  return [
    mapping.module,
    mapping.screen,
    mapping.websiteField,
    column.table,
    column.column,
    column.options,
    mapping.example,
  ];
});

const enumRows = visibleColumns
  .filter((column) => column.options)
  .map((column) => [
    mappingFor(column).websiteField,
    column.options,
    mappingFor(column).module,
  ]);

const visibleTables = tables.filter((table) =>
  table.columns.some((column) => isVisibleOnWebsite(column, mappingFor(column))),
);

const summary = {
  tables: visibleTables.length,
  columns: visibleColumns.length,
  schemaColumns: allColumns.length,
};

const sheets = [
  {
    name: 'README',
    freezeRows: 1,
    widths: [30, 110],
    rows: [
      ['Website fields only', ''],
      ['Website analysed', 'docs/index.html'],
      ['Schema analysed', 'db/schema/*.sql (entry: schema.sql)'],
      [
        'What this lists',
        'Only fields a person can see or fill in on the website. Database ids, timestamps, file-storage keys, sign-in tokens and upload internals are omitted.',
      ],
      ['Website fields included', summary.columns],
      ['Schema columns not listed', summary.schemaColumns - summary.columns],
      ['Screens covered', summary.tables],
      [
        'How to use',
        'FIELD_MAP is the full list. Each named sheet is one area of the product. Row 1 is what the website calls the field; row 2 is the matching database field.',
      ],
      [
        'WEBSITE_GAPS',
        'Website fields that have no matching database field yet.',
      ],
      [
        'Not included',
        'Analytics totals, empty-state copy, and buttons. Those are calculated or are actions, not stored fields.',
      ],
    ],
  },
  {
    name: 'FIELD_MAP',
    freezeRows: 1,
    widths: [28, 32, 48, 26, 28, 52, 40],
    rows: [
      [
        'Area of the website',
        'Screen',
        'What the user sees',
        'Database table',
        'Database field',
        'Choices shown on the website',
        'Example',
      ],
      ...fieldMapRows,
    ],
  },
  {
    name: 'WEBSITE_GAPS',
    freezeRows: 1,
    widths: [24, 42, 32, 36, 68, 72],
    rows: [
      [
        'Area of the website',
        'What the user sees',
        'Screen',
        'Example',
        'Why it is missing',
        'What to do',
      ],
      ...websiteGaps,
    ],
  },
  {
    name: 'CHOICES',
    freezeRows: 1,
    widths: [48, 100, 28],
    rows: [
      ['What the user sees', 'Choices shown', 'Area of the website'],
      ...enumRows,
    ],
  },
  ...visibleTables.map((table) => {
    const columns = table.columns.filter((column) =>
      isVisibleOnWebsite(column, mappingFor(column)),
    );
    const mapped = columns.map(mappingFor);
    return {
      name: table.name,
      freezeRows: 2,
      rowStyle: (rowIndex) =>
        rowIndex === 0
          ? 'header'
          : rowIndex === 1
            ? 'subheader'
            : rowIndex === 2
              ? 'example'
              : 'body',
      widths: columns.map(() => 32),
      rows: [
        mapped.map((mapping) => mapping.websiteField),
        columns.map((column) => column.column),
        mapped.map((mapping) => mapping.example),
      ],
    };
  }),
];

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const result = writeXlsx(output, sheets);
  console.log(`Generated ${output}`);
  console.log(
    `Website fields: ${summary.columns} of ${summary.schemaColumns} schema columns; sheets: ${result.sheets}; gaps: ${websiteGaps.length}`,
  );
}
