/**
 * Plain-language steps the client can follow for three AI assists.
 *
 *   node scripts/generate-ai-assist-client-steps.mjs
 *
 * Output: docs/SafeIn5_AI_Assist_Client_Steps.docx
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

const OUT = join(import.meta.dirname, '..', 'docs', 'SafeIn5_AI_Assist_Client_Steps.docx');

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

function numbered(n, text) {
  return new Paragraph({
    spacing: { after: 100, line: 276 },
    children: [
      new TextRun({
        text: `${n}.  ${text}`,
        font: 'Calibri',
        size: 22,
        color: BODY,
      }),
    ],
  });
}

function caption(text) {
  return new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text,
        italics: true,
        font: 'Calibri',
        size: 20,
        color: MUTED,
      }),
    ],
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'unused',
        levels: [
          {
            level: 0,
            format: 'bullet',
            text: '•',
            alignment: AlignmentType.LEFT,
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
              text: 'AI assist — steps for the office',
              bold: true,
              color: INK,
              font: 'Calibri',
              size: 36,
            }),
          ],
        }),
        caption(
          'Plain-language steps for three Back Office features. AI drafts; a person always checks before anything is published or confirmed. Nothing on this note is a legal or safety sign-off.',
        ),

        heading('How to read this'),
        para(
          'These steps are for people using the Back Office website. You do not need to know how the software is built. In every case the pattern is the same: you provide the evidence (a file, a photo, a voice note), AI writes a draft, you read it, you edit if needed, then you confirm. AI never publishes a checklist to a phone, never assigns an owner on its own as a closed decision, and never deletes a worker’s own words.',
        ),

        heading('1. Upload content — AI generates a checklist from PDF, image or video'),
        para(
          'Use this when you already have a paper or digital checklist (for example a confined-space form, a permit checklist, or a short briefing video) and you want workers to see those questions on the phone.',
        ),
        numbered(
          1,
          'In Back Office open Content, then Upload content.',
        ),
        numbered(
          2,
          'Drop in the files. You can use PDF, photos (JPG or PNG), or a short video (MP4 or MOV). One upload can include more than one file — for example two PDF pages plus a clip of how to stage the rescue set.',
        ),
        numbered(
          3,
          'Give it a clear title so another administrator can find it later. The system may suggest a title from the file name. Change it if it is not obvious.',
        ),
        numbered(
          4,
          'Choose the kind of content. For a list of yes/no checks the worker must answer, choose Job Checklist. (Learn 5 is a short lesson, not this flow.)',
        ),
        numbered(
          5,
          'Wait while AI reads the files. It copies the real questions from the document or from what is visible in the photos and video. It does not invent site names, radio channels or extra checks that were not in what you uploaded.',
        ),
        numbered(
          6,
          'Read the draft list on the same screen. Edit any wording so it is clear on a phone. Delete a check that does not apply. Add a check the document missed. Re-order if the reading order on paper is wrong.',
        ),
        numbered(
          7,
          'Upload. The pack sits in the Job Checklist list as a draft. Nothing reaches a worker’s phone yet.',
        ),
        numbered(
          8,
          'When the wording is right, publish that revision. Then attach the pack to a space or to a work task so the next PULSE can show it.',
        ),
        para(
          'What AI does for you: turns paperwork and media into a first list of checks. What you still do: decide the title, the kind of content, the final wording, publish, and attach it to the right job.',
        ),

        heading('2. Echoes detail — AI based summary'),
        para(
          'An Echo is a report that came from a worker on the phone (a photo, video or voice note during a job or an observation). When the office opens that Echo, AI has already written a short title and a paragraph so a supervisor does not have to watch every clip from scratch.',
        ),
        numbered(
          1,
          'The worker captures what they saw (photo, video, voice). That arrives as an Echo in Back Office under Echoes.',
        ),
        numbered(
          2,
          'If they left a voice note, it is turned into written words first. You will see that as “Voice note · transcribed”. Those are the worker’s words, not the AI summary.',
        ),
        numbered(
          3,
          'AI then reads the pictures, the transcript and the job context (space, task, permit). It drafts a one-line title at the top of the page, and a short paragraph in the right-hand panel labelled “Drafted by AI — edit before you confirm”.',
        ),
        numbered(
          4,
          'Open the Echo. Look at the media yourself. Read the title and the paragraph. They should describe what happened in plain language, without inventing details that are not in the photos or voice note.',
        ),
        numbered(
          5,
          'If the title is wrong or too vague, use Edit title. If the paragraph misses something important or overstates it, use Edit on the AI panel. The original AI draft is kept in the history so you can see what changed.',
        ),
        numbered(
          6,
          'Only when you are happy, Confirm (or Confirm and assign). That is the moment the office owns the wording. Until then it is a draft for you to check.',
        ),
        para(
          'What AI does for you: writes the first title and summary so the queue is readable. What you still do: check against the photos, edit, and confirm before anyone is assigned or the worker is told it has been actioned.',
        ),

        heading('3. Echoes detail — AI based response type and edit'),
        para(
          'Response type is how serious the Echo is. It decides how high it sits in the supervisor list. There are three choices the office and the phone both use:',
        ),
        numbered(1, 'Good practice — something done well, worth sharing, no failed control.'),
        numbered(
          2,
          'Could be a risk — a weak signal or deteriorating control; work may continue with caution.',
        ),
        numbered(
          3,
          'Needs action now — something that can kill or badly injure if it is left, a missing rescue set, a permit failure, or the worker stopped the job.',
        ),
        para(
          'How it is set depends on how the Echo was raised.',
        ),
        para(
          'On a Work Task (for example a Shift voice note), the worker usually does not pick a type. AI proposes one. On the Echo page you will see “Response type · set by the AI” and a badge such as Needs action now with an AI chip. History starts with one row: proposed by the AI.',
        ),
        para(
          'On an Observation, the worker often chooses the type themselves. AI still looks at the photos and may disagree. The worker’s choice is kept. You will see “Response type · the worker’s own choice” and, if AI differs, a warning such as “AI suggests Could be a risk” with a button to record that suggestion. History keeps both: the AI recommendation and the worker’s choice. Nothing is overwritten.',
        ),
        para('What you do in the office:'),
        numbered(
          1,
          'Open the Echo. Read the media, the summary, and the history track.',
        ),
        numbered(
          2,
          'If you agree with the current type, leave it. Confirm when the rest of the Echo is ready.',
        ),
        numbered(
          3,
          'If you disagree, use Review and edit and pick Good practice, Could be a risk, or Needs action now. Or use the “Record …” button when AI has offered a different type. Your change is added as a new row in history. Earlier rows stay.',
        ),
        numbered(
          4,
          'You can also change the hazard category (for example Confined space, Working at height). AI suggests one; you pick the one that best matches why this matters.',
        ),
        numbered(
          5,
          'Needs action now should rise to the top of the list. Good practice can be thanked and shared without filling the action list in the same way.',
        ),
        para(
          'What AI does for you: proposes how serious it is and which hazard bucket it belongs in. What you still do: keep or change that type, keep the worker’s choice visible when they made one, and confirm. AI never silently replaces a worker’s own choice.',
        ),

        heading('What a person always decides'),
        para(
          'AI is an assistant. A person still: checks the checklist wording and publishes it; attaches content to a space or task; confirms or edits Echo titles and summaries; overrides response type when needed; assigns an owner; marks actioned; and writes the close-out. Until a person confirms, drafts stay drafts.',
        ),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`Wrote ${OUT}`);
