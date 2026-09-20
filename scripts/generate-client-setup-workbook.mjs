import { join, resolve } from 'node:path';

import { writeXlsx } from './lib/xlsx.mjs';

/**
 * Plain-English setup workbook for clients.
 *
 * This is the non-technical counterpart to
 * docs/SafeIn5_Website_to_Schema_Field_Mapping.xlsx. It only asks for
 * information a client actually provides, and deliberately contains no
 * database or system terminology.
 */
const root = resolve(import.meta.dirname, '..');
const output = join(root, 'docs', 'SafeIn5_Setup_Information_We_Need.xlsx');

const EXAMPLE_NOTE = 'EXAMPLE - delete this row';

/**
 * A list sheet: one row per thing (per site, per person, and so on).
 * Row 1 headers, row 2 explains each column, then shaded example rows.
 */
function listSheet({ name, intro, columns, examples }) {
  const rows = [
    columns.map((column) => column.label),
    columns.map((column) => column.help),
    ...examples,
    columns.map(() => ''),
    columns.map(() => ''),
    columns.map(() => ''),
  ];
  return {
    name,
    intro,
    widths: columns.map((column) => column.width),
    freezeRows: 2,
    rowStyle: (rowIndex) => {
      if (rowIndex === 0) return 'header';
      if (rowIndex === 1) return 'subheader';
      if (rowIndex <= examples.length + 1) return 'example';
      return 'body';
    },
    rows,
  };
}

const sheets = [];

sheets.push({
  name: 'Start here',
  autoFilter: false,
  freezeRows: 0,
  headerRow: -1,
  widths: [34, 96],
  rowStyle: (rowIndex) => (rowIndex === 0 ? 'title' : 'body'),
  rows: [
    ['SafeIn5 setup - the information we need from you', ''],
    ['', ''],
    [
      'What this is',
      'A simple list of the information we need to set up SafeIn5 for your organisation. Each tab covers one topic.',
    ],
    [
      'What to do',
      'Work through the tabs in order. Type your answers straight into the sheet. You do not need to fill everything in at once.',
    ],
    [
      'The yellow rows',
      'Every tab starts with a shaded example row so you can see the sort of answer we are looking for. Delete those rows before sending the file back.',
    ],
    [
      'If you are unsure',
      'Leave the cell blank and add a note in the last column. It is far better to leave a gap than to guess.',
    ],
    [
      'Adding more rows',
      'Add as many rows as you need. There is no limit on sites, spaces, people, tasks or documents.',
    ],
    ['', ''],
    ['The tabs', ''],
    ['1. Your organisation', 'Your company name and a few basic details.'],
    ['2. Your sites', 'Each location you operate, and who runs it.'],
    [
      '3. Your places of work',
      'The specific places within a site where work happens, such as a tank or a workshop bay. We put a QR code at each one.',
    ],
    ['4. Your people', 'Everyone who needs access, and what they can do.'],
    ['5. Your jobs and permits', 'The work your teams carry out.'],
    ['6. Your documents', 'Permits, risk assessments, rescue plans and similar paperwork.'],
    [
      '7. Your checklists',
      'The questions a worker is asked on their phone before starting a job.',
    ],
    ['8. Checklist questions', 'The individual questions inside each checklist.'],
    ['9. Decisions we need', 'A short list of choices only you can make.'],
    ['10. Word list', 'Plain-English meanings for the words used in the app.'],
    ['', ''],
    ['A note on safety reports', ''],
    [
      'You do not fill these in',
      'Safety reports - what the app calls Echoes - are created by your workers on their phones once you are live. There is nothing to prepare here.',
    ],
    ['', ''],
    ['Sending it back', ''],
    [
      'When you are ready',
      'Send the completed file back to your SafeIn5 contact. We will load it and confirm before anything goes live to your teams.',
    ],
  ],
});

sheets.push({
  name: '1. Your organisation',
  autoFilter: false,
  headerRow: 0,
  widths: [34, 62, 20, 40],
  rowStyle: (rowIndex) => (rowIndex === 0 ? 'header' : 'body'),
  rows: [
    ['What we need', 'What it means', 'Do we need it?', 'Your answer'],
    [
      'Organisation name',
      'The name of your company as you would like it shown in the app.',
      'Required',
      '',
    ],
    [
      'Website address',
      'Your main web address, such as example.co.uk. We use it to check that invitation emails look right.',
      'Helpful',
      '',
    ],
    [
      'Main contact for setup',
      'The person we should come back to with questions about this file.',
      'Required',
      '',
    ],
    [
      'Main contact email',
      'Where we send questions and the first invitation.',
      'Required',
      '',
    ],
    [
      'Your reference number',
      'We issue this and it never changes. Leave blank - we will fill it in.',
      'We provide it',
      '',
    ],
  ],
});

sheets.push(
  listSheet({
    name: '2. Your sites',
    intro: 'One row per location.',
    columns: [
      {
        label: 'Site name',
        help: 'What your people call this location.',
        width: 26,
      },
      {
        label: 'Where it is',
        help: 'Town, county or a short description. Helps tell similar sites apart.',
        width: 40,
      },
      {
        label: 'Site manager',
        help: 'Person with the site manager role at this site. Stored as a site membership, not on the site row. Add more site managers on the People tab.',
        width: 26,
      },
      {
        label: 'Main supervisor',
        help: 'At least one supervisor for this site. Add more supervisors as extra rows on the People tab.',
        width: 26,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 40,
      },
    ],
    examples: [
      [
        'North Quarry',
        'Ashbourne, Derbyshire',
        'Priya Shah',
        'Tom Wilson',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push(
  listSheet({
    name: '3. Your places of work',
    intro: 'One row per place. Each gets its own QR code.',
    columns: [
      {
        label: 'Place name',
        help: 'The specific place work happens, such as Tank 3A or Workshop bay.',
        width: 26,
      },
      {
        label: 'Which site',
        help: 'Must match a site name from the previous tab.',
        width: 22,
      },
      {
        label: 'Where on site',
        help: 'Where to find it, such as North tank farm, bund 2.',
        width: 34,
      },
      {
        label: 'What it is',
        help: 'The kind of place it is, such as storage tank or bench grinder.',
        width: 30,
      },
      {
        label: 'Type of work done here',
        help: 'Such as confined space entry, grinding, access route or vehicle marshalling.',
        width: 30,
      },
      {
        label: 'Permit needed before work?',
        help: 'Yes or No. Yes means work must not start without a permit.',
        width: 22,
      },
      {
        label: 'Rescue plan needed?',
        help: 'Yes or No.',
        width: 20,
      },
      {
        label: 'Who looks after this place',
        help: 'The person responsible for the checklists and documents here.',
        width: 28,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 36,
      },
    ],
    examples: [
      [
        'Tank 3A',
        'North Quarry',
        'North tank farm, bund 2',
        'Storage tank, confined space',
        'Confined space entry',
        'Yes',
        'Yes',
        'Tom Wilson',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push(
  listSheet({
    name: '4. Your people',
    intro: 'One row per person who needs access.',
    columns: [
      { label: 'First name', help: 'As they would like to be addressed.', width: 20 },
      { label: 'Last name', help: 'Family name.', width: 20 },
      {
        label: 'Email',
        help: 'Their work email. This is how they receive their invitation.',
        width: 34,
      },
      {
        label: 'Mobile number',
        help: 'Include the country code, such as +44 7700 900411. Optional.',
        width: 24,
      },
      {
        label: 'Which site',
        help: 'The site they work at. If they work at more than one site, add one row per site (roles can differ). Write All sites only for company administrators.',
        width: 22,
      },
      {
        label: 'What they do',
        help: 'On this site only. Choose Worker, Supervisor, or Site manager. The same person can be a supervisor at one site and a worker at another. Company administrators are invited separately and can cover all sites.',
        width: 26,
      },
      {
        label: 'Job title or trade',
        help: 'Such as scaffolder or electrician. Optional, but useful.',
        width: 24,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 34,
      },
    ],
    examples: [
      [
        'Jordan',
        'Blake',
        'jordan.blake@example.co.uk',
        '+44 7700 900411',
        'North Quarry',
        'Supervisor',
        'Scaffolder',
        EXAMPLE_NOTE,
      ],
      [
        'Jordan',
        'Blake',
        'jordan.blake@example.co.uk',
        '+44 7700 900411',
        'Silo Rd',
        'Worker',
        'Scaffolder',
        EXAMPLE_NOTE,
      ],
      [
        'Priya',
        'Shah',
        'priya.shah@example.co.uk',
        '+44 7700 900522',
        'All sites',
        'Site manager',
        '',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push(
  listSheet({
    name: '5. Your jobs and permits',
    intro: 'One row per job. Safety reports are grouped under these.',
    columns: [
      {
        label: 'Job reference',
        help: 'Your own number for the work, such as PTW-4471 or WO-2318.',
        width: 22,
      },
      {
        label: 'What the work is',
        help: 'A short plain description, such as Tank cleaning.',
        width: 34,
      },
      {
        label: 'Where it happens',
        help: 'Must match a place name from tab 3.',
        width: 24,
      },
      {
        label: 'Who is leading it',
        help: 'The person in charge of this job. Full name.',
        width: 24,
      },
      {
        label: 'Others on the job',
        help: 'Other people working on it. Separate names with a semicolon.',
        width: 34,
      },
      { label: 'Start date and time', help: 'When the work begins.', width: 22 },
      { label: 'How many days', help: 'Roughly how long it runs for.', width: 16 },
      {
        label: 'Permit needed?',
        help: 'Yes or No.',
        width: 16,
      },
      {
        label: 'Type of permit',
        help: 'Such as confined space or hot work. Leave blank if none.',
        width: 26,
      },
      {
        label: 'Permit number',
        help: 'Your reference for the permit itself.',
        width: 20,
      },
      {
        label: 'Risk assessment reference',
        help: 'The reference on the risk assessment or method statement for this job.',
        width: 26,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 32,
      },
    ],
    examples: [
      [
        'PTW-4471',
        'Tank cleaning',
        'Tank 3A',
        'Tom Wilson',
        'Alex Murray; Sam Okafor',
        '1 Sep 2026, 07:00',
        3,
        'Yes',
        'Confined space',
        'PTW-4471',
        'RAMS-4471-B',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push(
  listSheet({
    name: '6. Your documents',
    intro: 'One row per document. Send the files alongside this workbook.',
    columns: [
      {
        label: 'Document name',
        help: 'The title as it appears on the paperwork.',
        width: 38,
      },
      {
        label: 'What kind of document',
        help: 'Such as permit to work, risk assessment, rescue plan, checklist, guidance or toolbox talk.',
        width: 28,
      },
      {
        label: 'Its reference',
        help: 'Any reference or document number printed on it.',
        width: 22,
      },
      {
        label: 'Version',
        help: 'Such as r4, or the revision date.',
        width: 18,
      },
      {
        label: 'What it applies to',
        help: 'Write the site, place or job name it belongs to. Write Everyone if it applies across the company.',
        width: 30,
      },
      {
        label: 'Is it approved?',
        help: 'Yes or No. Only approved documents are shown to workers.',
        width: 18,
      },
      {
        label: 'File name',
        help: 'The name of the file you are sending us.',
        width: 34,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 32,
      },
    ],
    examples: [
      [
        'Confined Space Rescue Plan',
        'Rescue plan',
        'RP-0031',
        'r4',
        'Tank 3A',
        'Yes',
        'confined-space-rescue-plan.pdf',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push(
  listSheet({
    name: '7. Your checklists',
    intro: 'One row per checklist. The questions go on the next tab.',
    columns: [
      {
        label: 'Checklist name',
        help: 'What this set of questions is called.',
        width: 42,
      },
      {
        label: 'What it is for',
        help: 'Job checklist means questions before work starts. Learning means short reminders and lessons.',
        width: 26,
      },
      {
        label: 'Subject',
        help: 'Such as confined space or working at height.',
        width: 24,
      },
      {
        label: 'How long it takes',
        help: 'Roughly, in minutes.',
        width: 18,
      },
      {
        label: 'Where it should appear',
        help: 'The place or job it applies to, from tabs 3 and 5.',
        width: 30,
      },
      {
        label: 'Ready to go live?',
        help: 'Yes or Not yet. Nothing reaches a phone until you say yes.',
        width: 20,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 34,
      },
    ],
    examples: [
      [
        'Confined space entry - before you go in',
        'Job checklist',
        'Confined space',
        5,
        'Tank 3A',
        'Not yet',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push(
  listSheet({
    name: '8. Checklist questions',
    intro: 'One row per question.',
    columns: [
      {
        label: 'Which checklist',
        help: 'Must match a checklist name from the previous tab.',
        width: 38,
      },
      {
        label: 'Order',
        help: 'The order the worker sees them in: 1, 2, 3 and so on.',
        width: 12,
      },
      {
        label: 'The question',
        help: 'Write it exactly as the worker should read it on their phone.',
        width: 62,
      },
      {
        label: 'Must be answered?',
        help: 'Yes or No. Yes means they cannot move on without answering.',
        width: 20,
      },
      {
        label: 'Stops the job if it fails?',
        help: 'Yes or No. Yes means work must not start if the answer is no.',
        width: 24,
      },
      {
        label: 'What to ask for if it fails',
        help: 'What the worker should be asked to report, such as isolation certificate or gas detector. Separate with a semicolon.',
        width: 44,
      },
      {
        label: 'Notes',
        help: 'Anything we should know, or anything you are unsure about.',
        width: 30,
      },
    ],
    examples: [
      [
        'Confined space entry - before you go in',
        1,
        'Has the space been isolated, drained and vented?',
        'Yes',
        'Yes',
        'Isolation certificate; Lock and tag; Vent line',
        EXAMPLE_NOTE,
      ],
      [
        'Confined space entry - before you go in',
        2,
        'Is the attendant in position and able to see you?',
        'Yes',
        'No',
        '',
        EXAMPLE_NOTE,
      ],
    ],
  }),
);

sheets.push({
  name: '9. Decisions we need',
  autoFilter: false,
  headerRow: 0,
  widths: [30, 58, 40, 26],
  rowStyle: (rowIndex) => (rowIndex === 0 ? 'header' : 'body'),
  rows: [
    ['Decision', 'Why we are asking', 'The usual choice', 'Your answer'],
    [
      'How long to keep safety reports',
      'Reports are kept for this long before being removed. Your industry or insurer may set this for you.',
      '7 years',
      '',
    ],
    [
      'How long to keep photos and videos',
      'Media takes up far more space than text, so it is often kept for a shorter time than the report itself.',
      '2 years',
      '',
    ],
    [
      'Can workers report anonymously?',
      'Anonymous reporting tends to increase how much people report, but you cannot follow up with the person directly.',
      'Yes, allowed',
      '',
    ],
    [
      'Who reviews serious reports first',
      'Serious reports can go straight to the supervisor, or be checked by a site manager first.',
      'Site manager checks first',
      '',
    ],
    [
      'How people sign in',
      'A link sent to their email each time is simpler and safer than passwords. Tell us if you need passwords instead.',
      'Emailed sign-in link',
      '',
    ],
    [
      'Your list of permit types',
      'We will use your own wording in the app. List the permit types you use.',
      'Confined space, hot work, working at height',
      '',
    ],
    [
      'Your list of document types',
      'Same again - we will match the names your teams already use.',
      'Permit, risk assessment, rescue plan, checklist',
      '',
    ],
    [
      'When a repeat issue becomes a trend',
      'If the same kind of issue keeps happening at one place, the app can flag it as a pattern. Tell us how many times, over how long.',
      '5 times in 30 days',
      '',
    ],
  ],
});

sheets.push({
  name: '10. Word list',
  headerRow: 0,
  widths: [26, 84],
  rows: [
    ['Word used in the app', 'What it means'],
    [
      'Echo',
      'A safety report raised by a worker on their phone. It might be a hazard, something done well, or something that needs fixing.',
    ],
    [
      'PULSE',
      'One worker\u2019s journey through a job on their phone, from scanning the QR code to finishing.',
    ],
    [
      'Space',
      'A specific place where work happens, such as a tank or a workshop bay. Each one has its own QR code.',
    ],
    ['Site', 'One of your locations, such as a quarry or a depot.'],
    [
      'Job checklist',
      'The questions a worker answers before starting work.',
    ],
    [
      'Learn 5',
      'Five short reminders or lessons shown to a worker, often after something has gone wrong before.',
    ],
    [
      'Uncover',
      'A warning shown before work starts, based on issues still open at that place.',
    ],
    [
      'Shift',
      'A prompt at the start of a shift asking what someone has changed, fixed or checked.',
    ],
    [
      'Critical',
      'A question so important that work must not start if the answer is no.',
    ],
    [
      'Worker',
      'Uses the phone app only. Raises reports and completes checklists.',
    ],
    [
      'Supervisor',
      'Receives reports for that site and is responsible for acting on them. The same person can be a supervisor at one site and a worker at another.',
    ],
    [
      'Site manager',
      'Oversees a site, and reviews the most serious reports before they are shared.',
    ],
    [
      'Company administrator',
      'Manages your whole organisation in SafeIn5: people, sites, documents and checklists. A client can have more than one administrator.',
    ],
    [
      'Draft',
      'Saved but not yet live. Workers never see anything in draft.',
    ],
    ['Published', 'Live and visible to workers on their phones.'],
    [
      'Open',
      'A report that still needs someone to look at it or act on it.',
    ],
    ['Closed', 'A report that has been dealt with and finished.'],
  ],
});

const result = writeXlsx(output, sheets);

const dataRows = sheets.reduce((total, sheet) => total + sheet.rows.length, 0);
console.log(`Generated ${output}`);
console.log(`Tabs: ${result.sheets}; rows: ${dataRows}`);
