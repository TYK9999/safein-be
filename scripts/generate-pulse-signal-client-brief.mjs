/**
 * Client-facing brief: Back Office → PULSE → SIGNAL → next PULSE, AI, and gaps.
 *
 *   node scripts/generate-pulse-signal-client-brief.mjs
 *
 * Output: docs/SafeIn5_PULSE_SIGNAL_Client_Brief.docx
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
} from 'docx';

const OUT = join(import.meta.dirname, '..', 'docs', 'SafeIn5_PULSE_SIGNAL_Client_Brief.docx');

const INK = '17225B';
const MUTED = '5C6478';
const BODY = '1F2430';

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: INK, font: 'Calibri' })],
  });
}

function para(text, { spaceAfter = 160 } = {}) {
  return new Paragraph({
    spacing: { after: spaceAfter, line: 276 },
    children: [new TextRun({ text, font: 'Calibri', size: 22, color: BODY })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80, line: 276 },
    children: [new TextRun({ text, font: 'Calibri', size: 22, color: BODY })],
  });
}

function caption(text) {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text, italics: true, font: 'Calibri', size: 20, color: MUTED })],
  });
}

function cell(text, { header = false, width = 2340 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header
      ? { type: ShadingType.CLEAR, fill: INK }
      : { type: ShadingType.CLEAR, fill: 'FFFFFF' },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: header,
            font: 'Calibri',
            size: header ? 18 : 20,
            color: header ? 'FFFFFF' : BODY,
          }),
        ],
      }),
    ],
  });
}

function simpleTable(headers, rows) {
  const widths = [2200, 2200, 4960];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: widths[i] })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((value, i) => cell(value, { width: widths[i] })),
          }),
      ),
    ],
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: 'bullet',
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360, hanging: 180 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 850, right: 850 } },
      },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'SafeIn5',
              bold: true,
              color: INK,
              font: 'Calibri',
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'How work is packed, captured, and learned from',
              bold: true,
              color: INK,
              font: 'Calibri',
              size: 36,
            }),
          ],
        }),
        caption(
          'A plain-language brief for the client. Covers Back Office to the phone, phone to SIGNAL, learning into the next job, where AI helps, and what is still to be agreed.',
        ),

        heading('How to read this note'),
        para(
          'SafeIn5 has two apps that work together. The Back Office is the office website, used to set up a client, sites, people, paperwork and jobs. The Worker app is the phone (installed as a PWA). SIGNAL is the name for what happens after something is captured: Echoes, the supervisor queue, and later learning.',
        ),
        para(
          'Three words matter. A PULSE is one journey on the phone — either a Work Task PULSE (a permitted job) or an Observation PULSE (see something, report it). An Echo is a report that came out of that journey. A Queue item is only an Echo that still needs a person to act. Most of what happens on a Work Task PULSE is recorded as intelligence. It does not fill the supervisor list.',
        ),
        para(
          'The loop is simple. The office packs a job. The worker runs it on the phone. Anything that needs people lands as an Echo. Closed Echoes and published lessons feed the next job at the same place.',
        ),

        heading('1. Back Office to Mobile Work PULSE'),
        para(
          'Nothing useful appears on the phone until the Back Office has prepared a place and a job. The worker does not type permits, RAMS or rescue plans on the device. They receive a pack that was assembled in the office.',
        ),
        para(
          'It starts with the organisation. A platform administrator creates the client. Client administrators then invite people, give them a role (worker, supervisor, site manager or client admin), and add sites. Each site is a workplace. Under a site sit spaces — the actual assets, such as Tank 3A. Each space gets a QR code that can be printed and fixed at the entry. Name, location, asset type, and whether a permit or rescue plan is required, all live on that space.',
        ),
        para(
          'Paperwork is uploaded once into the Documents library: permits to work, RAMS or HIRA, rescue plans, confined-space checklists, isolation certificates, COSHH and similar. Those files do not reach a phone until they are attached. Documents that always belong to an asset (typically the rescue plan and space checklist) are attached to the space. Every later job at that space inherits them. Documents that belong to one job (this permit, this RAMS) are attached to the task.',
        ),
        para(
          'Content packs are written or chosen from the library: Job Checklist prompts, Learn 5 lessons (a short list or short media), Uncover checks (shown before anyone goes in), and Shift prompts (what changed before you started). These are selected onto the task. Critical Job Checklist items can carry a missing-kit list. Mandatory Learn 5 items must be completed before the checklist unlocks.',
        ),
        para(
          'The task itself is the work order. An administrator creates it, duplicates a past job, or starts from a template. Site, space, dates, lead and crew are set in the office. Permit and RAMS references come from the documents chosen, not from free typing. The task must be assigned to the crew in the Back Office. Until that happens, the worker cannot start it.',
        ),
        para(
          'How it reaches the worker. When they scan the QR at the space, the phone identifies the space and the live task, starts a Work Task PULSE, and downloads the pack. If the QR is missing, they pick an assigned task or photograph the RAMS page. The photo is checked against the RAMS attached in the office before the journey starts. The pack is cached on the phone and refreshed on the next scan, so a revised rescue plan only appears after the next QR (or next assigned start), not mid-job.',
        ),
        bullet(
          'Originates in the office: client, people and roles, site, space and QR, document library, content packs, the task and who is on it.',
        ),
        bullet(
          'Originates from paper: permits, RAMS/HIRA, rescue plans, checklists and similar — uploaded, then placed on a space or a task.',
        ),
        bullet(
          'Reaches the worker by QR scan or assigned-task / RAMS photo start — not by the worker searching a filing cabinet on the phone.',
        ),

        heading('2. Mobile PULSE to SIGNAL / Back Office'),
        para(
          'There are two journeys on the phone. They look similar at the camera, but they store different things.',
        ),

        heading('Observation PULSE', HeadingLevel.HEADING_2),
        para(
          'Anyone with access (a worker, and in community use a community user) can raise an Observation at any time. They do not need to be inside a permit. They take a photo, video and/or voice note, with location, and may add a description. They can attach it to a live job for context, or raise it during work. They choose how serious it is: Good practice, Could be a risk, or Needs action now. They may stay anonymous.',
        ),
        para(
          'That capture becomes an Echo. It appears in the Back Office under Echoes, on the Observation Echoes tab. AI drafts a title and summary from the media and words. Needs action now goes to the top of the supervisor list. Good practice is thanked automatically and may be shared without filling the action list. Lower-severity repeats can be noted and watched for a pattern. The worker sees the Echo on My Echo: Received, then Viewed, Actioned and Closed as the office works it.',
        ),

        heading('Work Task PULSE (QR flow)', HeadingLevel.HEADING_2),
        para(
          'This is the structured job started by scanning the QR at the space (or by No QR + assigned task / RAMS photo). The phone shows a top bar through Pause, Uncover, Learn, Shift and Echo. The agreed QR journey is:',
        ),
        bullet(
          '01 Pause — permit, risk, site, location and space. “Before you start” reflects Echoes the previous crew left. Worker taps “This is my job”.',
        ),
        bullet(
          '03 Uncover · Look around — YES/NO on what the previous team reported (e.g. ladder rung, cable at hatch, stretcher on site). No duplicate Echo if they only confirm an existing warning.',
        ),
        bullet(
          '03 Uncover · Compulsory lesson — e.g. “Rescue equipment setup” (REQUIRED FOR THIS TASK). The five quick checks stay locked until this lesson is done.',
        ),
        bullet(
          '03 Uncover · Five quick checks — permit, isolation, atmosphere, rescue equipment, rescue plan (from the office Job Checklist / Learn packs, shown here inside Uncover).',
        ),
        bullet(
          '03 Uncover · Rescue plan — read the space rescue plan and tap “I understand”.',
        ),
        bullet(
          '03 Uncover · Good to know — optional extras (e.g. working at height, LOTOTO). Show me or Skip.',
        ),
        bullet(
          '04 Shift — “What changed before you started?” Voice note (transcribed) or tap-one options (moved cable, brought stretcher, re-tested atmosphere).',
        ),
        bullet(
          '06 Shared — PULSE CAPTURED summary, My Echo and Done. If the worker chose “Something not right” during checks: 05 Work cannot proceed → Stop the job → JOB STOPPED → shared immediately as an Echo.',
        ),
        para(
          'One PULSE record holds the whole journey. Supervisors replay it on the Back Office Work Task PULSE screen (UX screen map: press S → Tasks — Gather → Work Task PULSE).',
        ),
        para(
          'Not every step becomes an Echo. Pause, look-around answers, the lesson, a clean five-check completion, rescue plan acknowledgement and skipped good-to-know are intelligence. They appear on the PULSE replay and in Analytics, not in the Echoes queue. A new Echo is created when the worker stops the job, shares “something not right”, or when AI classifies a Shift voice note as needing action. Those Echoes sit on the Work Task Echoes tab and under Everything raised on the task.',
        ),
        para(
          'A typical QR journey records eight events on the Work Task PULSE and one queue item (often the Shift voice note). That is the product rule: a PULSE is the journey; an Echo is a report that may need a person; a Queue item is only an Echo that still needs someone.',
        ),

        new Paragraph({ spacing: { before: 200, after: 120 } }),
        simpleTable(
          ['On the phone', 'Stored as', 'What the office sees'],
          [
            [
              'Pause, Uncover look-around/lesson/checks/rescue, good-to-know skipped',
              'Intelligence on the PULSE',
              'Work Task PULSE replay and Analytics — not the Echoes queue',
            ],
            [
              'Observation share, Shift voice, stop / change plan',
              'An Echo',
              'Echoes list (Observation or Work Task tab)',
            ],
            [
              'Needs action now (and similar policy cases)',
              'Actionable Queue item',
              'Top of Echoes — assign, act, close',
            ],
          ],
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading('3. SIGNAL to future PULSE'),
        para(
          'Closed work is not the end of the story. What was learned should meet the next crew at the same place.',
        ),
        para(
          'If an Echo is still open at a space, the next Work Task PULSE pulls it into Uncover as a warning. The next worker is asked about it before they go in. If they only acknowledge the warning, no second Echo is created. The original stays open until someone closes it.',
        ),
        para(
          'If the same asset is reported again after it was closed, the office sees a repeat. They can leave it with the owner or escalate it. Uncover keeps warning later crews while it remains open.',
        ),
        para(
          'When an Echo is closed, an authorised person can turn it into a Learn 5. AI can draft the lesson from what went wrong, the fix and the after photo. Nothing reaches a phone until a person publishes it. Once published, it is attached to the space or the next task, so the next PULSE shows it in Learn 5.',
        ),
        para(
          'Administrators can also change Uncover and Shift wording after a close-out, and publish a new revision of a rescue plan or RAMS. The next scan loads the improved pack. Good practice and anonymous close-outs can be shared to the space feed so the next crew sees the outcome without extra paperwork.',
        ),

        heading('4. AI assist — where it is used, and where a person still decides'),
        para(
          'AI is an assistant. It never sends a lesson to a phone, never assigns an owner on its own as a closed decision, and never deletes a worker’s own words. A person confirms, edits or overrides.',
        ),
        bullet(
          'Observation Echoes: AI reads photo, video and voice (transcript) and drafts a title, a short summary, a suggested severity and a hazard type. On Observation the worker often chooses the severity; AI still helps with the write-up.',
        ),
        bullet(
          'Work Task Shift (and similar captures): AI transcribes the voice note and usually proposes the severity. This is a common path into the queue.',
        ),
        bullet(
          'Queue order: Needs action now and high-energy / SIF categories are pushed up the Echoes list so supervisors do not work oldest-first when something is dangerous.',
        ),
        bullet(
          'Closed Echo to Learn 5: AI can draft a lesson. A content owner must review and publish before it appears on a future PULSE.',
        ),
        bullet(
          'Job pack / document help (office, not the live PULSE): AI can help extract checklist wording and summaries from uploaded paperwork. That is set-up assistance, not the worker journey.',
        ),
        para(
          'Automation that is not “AI thinking” still matters. Received and Viewed messages to the worker are automatic. Good practice is thanked on receipt. Live updates keep Echoes and My Echo in step while both apps are open. Offline captures keep the original capture time so a late sync is not treated as a new event.',
        ),
        para(
          'A person still: invites users, attaches packs, starts and completes a PULSE, confirms or overrides AI titles and severity, assigns an owner, marks actioned, writes the close-out, publishes learning, and prints QR codes.',
        ),

        heading('5. Gaps still to agree — so both apps stay complete'),
        para(
          'The prototypes are strong on the main loop. These points are not fully settled. They should be confirmed with the UX team before build is treated as complete for Back Office, worker PULSE, and Community Observation.',
        ),

        heading('Worker Work PULSE (QR flow)', HeadingLevel.HEADING_2),
        bullet(
          'QR flow shows lesson + five checks inside Uncover; Back Office still attaches Job Checklist and Learn 5 separately — confirm this mapping is final.',
        ),
        bullet(
          'Whether every Shift voice note becomes an Echo, or only when AI classifies it as a problem (happy-path voice may stay intelligence only).',
        ),
        bullet(
          '“Something not right — share it” during the five checks: exact list of missing items and whether Stop the job always creates Needs action now.',
        ),
        bullet(
          'Offline: how much of the journey can finish with no signal, and what the office sees until the phone syncs.',
        ),

        heading('Observation and Community', HeadingLevel.HEADING_2),
        bullet(
          'How Community Observation differs from a corporate worker Observation: login, anonymity, which office sees the Echo, and whether community users have My Echo.',
        ),
        bullet(
          'Whether community reports always use the Observation Echoes tab, or a separate community inbox.',
        ),
        bullet(
          'Minimum capture: must there be a photo, or can voice or text alone create an Echo.',
        ),
        bullet(
          'Location: what happens if GPS is denied, indoors, or poor.',
        ),
        bullet(
          'Whether an Observation raised “during work” stays on both the Observation tab and Everything raised on the linked task.',
        ),

        heading('Back Office SIGNAL', HeadingLevel.HEADING_2),
        bullet(
          'Sort order for “push to the top”: SIF first, then Needs action now, then unassigned, then age — to be confirmed.',
        ),
        bullet(
          'Whether Good practice and Noted items appear in Echoes at all, or only in Analytics and the space feed.',
        ),
        bullet(
          'One owner at a time is shown in the prototype; confirm no shared ownership.',
        ),
        bullet(
          'What the space feed is as a product: a list on the space in Back Office, something workers see on the next Uncover, or both.',
        ),
        bullet(
          'Duplicate reports on the same space within minutes: warn the supervisor, or keep them as separate Echoes.',
        ),

        heading('Learning back into the next PULSE', HeadingLevel.HEADING_2),
        bullet(
          'Who is allowed to publish a Learn 5 drafted from an Echo, and the approval step.',
        ),
        bullet(
          'Whether open Echoes are added to Uncover automatically for every new task at that space, or an administrator must tick them.',
        ),
        bullet(
          'When a document revision goes live on phones — next scan only, as currently described.',
        ),

        heading('In one page'),
        para(
          'The office packs the job: people, site, space and QR, paperwork, checklists and lessons. The worker scans the QR and runs Pause → Uncover (look around, lesson, five checks, rescue plan, good to know) → Shift → Shared. Separately they can raise an Observation PULSE from the camera. Almost everything is stored. Only some of it becomes an Echo. Only some Echoes need a person. Supervisors replay the journey on the Work Task PULSE screen in the UX prototype. AI writes and ranks; people assign and close. Open Echoes, published lessons and updated paperwork meet the next crew on the next scan. Community Observation follows the Observation path, with login, anonymity and inbox rules still to be confirmed.',
        ),
        caption('Prepared from the Back Office and Worker PWA prototypes and the agreed product rules. For client discussion, not a technical specification.'),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`Wrote ${OUT}`);
