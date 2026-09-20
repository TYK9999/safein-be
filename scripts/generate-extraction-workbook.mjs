import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { writeXlsx } from './lib/xlsx.mjs';

const root = resolve(import.meta.dirname, '..');
const sqlPath = join(root, 'db', 'seed', 'historic-job-pack.sql');
const output = join(
  root,
  'docs',
  'extraction',
  'SafeIn5_Historic_Job_Pack_Seed_Review.xlsx',
);

const sql = readFileSync(sqlPath, 'utf8');
const promptBlock = sql.match(
  /FROM \(VALUES\s*([\s\S]*?)\s*\) AS x\(sort_order, body_text, is_critical\)/,
)?.[1];

if (!promptBlock) {
  throw new Error('Could not find checklist prompts in seed SQL.');
}

const checklistPrompts = [];
const promptPattern = /\(\s*(\d+),\s*'((?:[^']|'')*)',\s*(true|false)\)/g;
let match;
while ((match = promptPattern.exec(promptBlock))) {
  checklistPrompts.push([
    Number(match[1]),
    match[2].replaceAll("''", "'"),
    match[3] === 'true' ? 'Yes' : 'No',
    'Yes',
    `IMSF 100 photographed pages 1-3`,
    'Draft - verify wording against source image',
  ]);
}

const sheets = [
  {
    name: 'README',
    rows: [
      ['SafeIn5 historic job-pack seed review'],
      ['Generated from', 'docs/extraction/'],
      ['SQL counterpart', 'db/seed/historic-job-pack.sql'],
      ['Import state', 'Draft / unpublished'],
      [
        'Important',
        'Only IMSF 100 pages 1-3 of 4 were supplied. No page-4 checks were invented.',
      ],
      [
        'Important',
        'HIRA, method statement, permit and rescue values came from the attached proposal; verify against original source documents before approval.',
      ],
      [
        'How to review',
        'Check each sheet, especially REVIEW_FLAGS and CHECKLIST_PROMPTS, then amend the SQL before importing if required.',
      ],
    ],
    widths: [24, 100],
  },
  {
    name: 'JOB_TASKS',
    rows: [
      [
        'job_task_id',
        'tenant',
        'site',
        'area',
        'asset_id',
        'job_task',
        'job_activity',
        'hira_reference',
        'method_statement_reference',
        'permit_required',
        'permit_types',
        'rescue_required',
        'checklist_reference',
        'database_status',
        'source',
        'review_status',
      ],
      [
        'HIST-HOTBINS-001',
        'Tarmac',
        'Dolyhir',
        'Asphalt Plant',
        'HOT-AGGREGATE-BINS',
        'Repairs to Hot Bins / Chutes',
        'Repair / maintenance within Hot Aggregate Bins',
        'HOTBINSRA01',
        'HOTBINSMS01',
        'Yes',
        'Confined Space; Hot Work; Working at Height',
        'Yes',
        'IMSF 100',
        'archived (used as reusable template)',
        'Extraction proposal',
        'Draft - admin approval required',
      ],
    ],
    widths: [22, 14, 14, 20, 24, 34, 48, 20, 28, 18, 44, 18, 20, 32, 24, 32],
  },
  {
    name: 'ASSETS_SPACES',
    rows: [
      [
        'asset_id',
        'tenant',
        'site',
        'area',
        'asset_space_name',
        'normalised_name',
        'asset_type',
        'task_type',
        'confined_space',
        'permit_required',
        'rescue_plan_required',
        'owner_rule',
        'source',
        'review_status',
      ],
      [
        'HOT-AGGREGATE-BINS',
        'Tarmac',
        'Dolyhir',
        'Asphalt Plant',
        'Hot Aggregate Bins / Hot Bins',
        'Hot Aggregate Bins',
        'Hot aggregate bins / confined space',
        'Repair / maintenance within Hot Aggregate Bins',
        'Yes',
        'Yes',
        'Yes',
        'Supervisor, Dolyhir',
        'Extraction proposal',
        'Draft - confirm normalised asset name',
      ],
    ],
    widths: [24, 14, 14, 20, 34, 28, 38, 48, 18, 18, 22, 28, 24, 38],
  },
  {
    name: 'JOB_CONTROLS',
    rows: [
      [
        'job_task_id',
        'control_type',
        'hazard_or_requirement',
        'critical_control',
        'source',
        'reusable',
        'review_status',
      ],
      ...[
        ['hazard', 'Plant start-up', 'Isolation and try/test required', 'HIRA', 'Yes'],
        ['hazard', 'Working at height', 'Working-at-height permit and controls', 'HIRA / permit', 'Yes'],
        ['hazard', 'Hot works', 'Hot-work permit and fire controls', 'HIRA / permit', 'Yes'],
        ['hazard', 'Power tools / HAVS', 'Tool and exposure controls', 'HIRA', 'Yes'],
        ['hazard', 'Confined space', 'Confined-space permit and entry controls', 'HIRA / permit / checklist', 'Yes'],
        ['hazard', 'Heat', 'Plant cooled before entry; proposal states 12 hours', 'HIRA / rescue plan / checklist', 'Yes'],
        ['hazard', 'Dust', 'Atmospheric controls and PPE', 'HIRA', 'Yes'],
        ['control', 'Atmospheric monitoring', 'Required before entry / gas monitoring', 'Permit / checklist', 'Yes'],
        ['control', 'Top man / attendant', 'Required at all times', 'HIRA / rescue plan / checklist', 'Yes'],
        ['control', 'Communication', 'Radio / attendant communication', 'Rescue plan / checklist', 'Yes'],
        ['control', 'Rescue method', 'Lifeline/rope; pulley; skid/pulley', 'Rescue plan', 'Yes'],
        ['equipment', 'Rescue equipment', 'Pulleys; karabiners; harnesses; safety lines; gas analyser', 'Rescue plan', 'Yes'],
        ['requirement', 'Contractor requirements', 'Competence, RAMS, isolation, permit and induction', 'Contractor clearance', 'Yes'],
      ].map(([type, hazard, control, source, reusable]) => [
        'HIST-HOTBINS-001',
        type,
        hazard,
        control,
        source,
        reusable,
        'Draft - verify against original source document',
      ]),
    ],
    widths: [22, 18, 34, 62, 38, 14, 42],
  },
  {
    name: 'PULSE_CHECKS',
    rows: [
      [
        'job_task_id',
        'check_number',
        'check_text',
        'mandatory',
        'critical',
        'source_document',
        'confidence',
        'review_status',
      ],
      [
        'HIST-HOTBINS-001',
        1,
        'RAMS / permit verified and understood?',
        'Yes',
        'Yes',
        'HIRA / Permit',
        'Proposal-derived',
        'Draft',
      ],
      [
        'HIST-HOTBINS-001',
        2,
        'Plant isolated and try/test completed?',
        'Yes',
        'Yes',
        'HIRA / Checklist',
        'Proposal-derived',
        'Draft',
      ],
      [
        'HIST-HOTBINS-001',
        3,
        'Atmosphere tested and safe for entry?',
        'Yes',
        'Yes',
        'Permit / Checklist',
        'Proposal-derived',
        'Draft',
      ],
      [
        'HIST-HOTBINS-001',
        4,
        'Required PPE and rescue equipment available and checked?',
        'Yes',
        'Yes',
        'Rescue Plan / Checklist',
        'Proposal-derived',
        'Draft',
      ],
      [
        'HIST-HOTBINS-001',
        5,
        'Top man, communications and rescue arrangements confirmed?',
        'Yes',
        'Yes',
        'HIRA / Rescue Plan / Checklist',
        'Proposal-derived',
        'Draft',
      ],
    ],
    widths: [22, 16, 64, 14, 12, 38, 22, 18],
  },
  {
    name: 'DOCUMENT_LINKS',
    rows: [
      [
        'job_task_id',
        'document_title',
        'document_type',
        'document_reference_revision',
        'date',
        'source_file_or_key',
        'physical_source_attached',
        'database_status',
        'review_status',
      ],
      [
        'HIST-HOTBINS-001',
        'Hot Bins HIRA / RAMS',
        'risk_assessment',
        'HOTBINSRA01',
        '',
        'seed/pending-verification/HOTBINSRA01',
        'No',
        'draft',
        'Verify source document',
      ],
      [
        'HIST-HOTBINS-001',
        'Hot Bins Method Statement',
        'other',
        'HOTBINSMS01',
        '',
        'seed/pending-verification/HOTBINSMS01',
        'No',
        'draft',
        'Verify source document',
      ],
      [
        'HIST-HOTBINS-001',
        'IMSF 100 - Confined Spaces Checklist',
        'checklist',
        'Version 1 Revision 0',
        'June 2024',
        'docs/extraction/CS Check List Page 1.jpeg; Page 2 .jpeg; Page 3 .jpeg',
        'Partial (pages 1-3 of 4)',
        'draft',
        'Obtain page 4 and verify OCR',
      ],
    ],
    widths: [22, 42, 22, 32, 16, 78, 28, 18, 34],
  },
  {
    name: 'CHECKLIST_PROMPTS',
    rows: [
      [
        'sort_order',
        'check_text',
        'critical',
        'mandatory',
        'source',
        'review_status',
      ],
      ...checklistPrompts,
    ],
    widths: [14, 90, 12, 14, 38, 42],
  },
  {
    name: 'REVIEW_FLAGS',
    rows: [
      ['severity', 'area', 'issue', 'required_action'],
      [
        'High',
        'IMSF 100',
        'Page 4 of 4 is missing.',
        'Obtain page 4 before approving/publishing the checklist.',
      ],
      [
        'High',
        'Source documents',
        'HIRA, method statement, permit, contractor clearance and rescue-plan files are not in docs/extraction.',
        'Verify proposal-derived values against original documents.',
      ],
      [
        'Medium',
        'OCR',
        'Photographs are angled and contain handwriting; wording was normalised for checklist prompts.',
        'Compare all 52 prompts with the images before import approval.',
      ],
      [
        'Medium',
        'Asset name',
        'Hot Bins and Hot Aggregate Bins may refer to the same asset.',
        'Administrator confirms canonical name: Hot Aggregate Bins.',
      ],
      [
        'Medium',
        'Task template',
        'Current schema has no dedicated reusable job-template table.',
        'Seed uses archived work_task HIST-HOTBINS-001 as a template record.',
      ],
      [
        'Low',
        'Permit types',
        'Multiple permit types are stored in one work_task.permit_type text field.',
        'Normalise to a join table if permit filtering/reporting is needed.',
      ],
      [
        'Info',
        'Historic occurrence data',
        'Names, signatures, attendance, permit times and fire-watch logs were intentionally excluded.',
        'Retain only in source/audit storage if later supplied.',
      ],
    ],
    widths: [14, 26, 90, 76],
  },
];

const result = writeXlsx(output, sheets);

console.log(`Generated ${output}`);
console.log(
  `Sheets: ${result.sheets}; checklist prompts: ${checklistPrompts.length}`,
);
