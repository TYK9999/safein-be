/** App + Details for Workflow rows that are still blank (Excel row 3 = step 2). */
export const APP_DETAILS_BY_ROW = {
  3: {
    app: 'Back Office App > Set up > Invite people',
    details: [
      'Invite people one by one, or download the people template and bulk import a list.',
      'Enter name, work email, and the site they belong to.',
      'Give each person a role: worker, supervisor, site manager, or client admin.',
      'The person receives a one-time code on email (not SMS) and can then open the Worker PWA and / or the Back Office.',
      'Workers run a PULSE on the phone. Supervisors and site managers also see the Echoes queue.',
      'A task must later be assigned from the Back Office before a worker can start it.',
    ].join('\r\n'),
  },
  4: {
    app: 'Back Office App > Sites > Add a site',
    details: [
      'Add a site by form, or bulk import several sites from the site template.',
      'Record the site name, location, and the listed site manager / supervisor.',
      'A new site may wait for approval before it is live.',
      'Every later space, task, PULSE and Echo sits under a site.',
      'Workers on the phone only see the sites they are assigned to.',
    ].join('\r\n'),
  },
  5: {
    app: 'Back Office App > Sites > Add a space',
    details: [
      'Add the physical place of work (for example Tank 3A) under a site.',
      'Record the space name, location, asset type, and whether a permit or rescue plan is required.',
      'The system creates a QR code for that space. Print it from Print the QR and fix it at the entry.',
      'When a worker scans that QR, the phone starts a Work Task PULSE and loads whatever is attached to this space.',
      'Copy on the space: cached on phones, refreshed on the next scan.',
    ].join('\r\n'),
  },
  6: {
    app: 'Back Office App > Documents',
    details: [
      'Upload the paperwork library: permit to work, RAMS / HIRA, rescue plan, confined-space checklist, standards, toolbox talks, isolation certificates, COSHH and similar.',
      'Each file is stored with a title, kind and revision.',
      'Bulk import is available when you have many documents.',
      'Documents do not appear on the phone until they are placed on a space or a task.',
    ].join('\r\n'),
  },
  7: {
    app: 'Back Office App > Sites > Space > What is attached to this space',
    details: [
      'Open the space and attach the documents that always belong to that asset — typically the rescue plan and the confined-space checklist.',
      'Those papers are inherited by every work task created at that space.',
      'On the phone they appear in Pause, Uncover (rescue plan) and the Documents tab.',
      'If the space paperwork changes, workers see the new revision on the next QR scan.',
    ].join('\r\n'),
  },
  8: {
    app: 'Back Office App > Content > Upload content',
    details: [
      'Create reusable content packs: Job Checklist prompts, Learn 5 lists or short videos, and Uncover / Shift shells.',
      'Packs can come from the SafeIn5 library or be written by the client.',
      'A pack is not on a phone until it is selected onto a task or space.',
      'Later, a closed Echo can be turned into a Learn 5 draft here — nothing reaches a phone until a person publishes it.',
    ].join('\r\n'),
  },
  9: {
    app: 'Back Office App > Tasks > Add a task',
    details: [
      'Create a live job (for example PTW-4471 Tank cleaning) from a blank form, by duplicating a past task, or from a saved template.',
      'Choose the site, space, dates, task lead and crew. RAMS and permit reference numbers fill from the documents you select and are not typed by hand.',
      'Duplicate copies Job Checklist, Learn 5, Uncover and Shift. Permit and RAMS are left blank on the copy so the new paperwork can be added.',
      'The task must be assigned from the Back Office. The Worker PWA home / No QR list then shows it to the crew.',
    ].join('\r\n'),
  },
  10: {
    app: 'Back Office App > Tasks > What is attached > Job Checklist',
    details: [
      'On the task, open What is attached and pick Job Checklist prompts from the content library (for example confined space entry).',
      'Tick Critical where the job cannot proceed without that check.',
      'For a failed critical check, type the missing-kit list the worker will be asked for.',
      'On the phone this becomes the Job Checklist stage. A clean completion is participation only. A stop or change of plan can create an Echo.',
    ].join('\r\n'),
  },
  11: {
    app: 'Back Office App > Tasks > What is attached > Learn 5',
    details: [
      'Attach a Learn 5 as a short list of prompts, or as visual media (photos / micro-videos).',
      'Mark which items are mandatory. Mandatory lessons unlock the Job Checklist. Optional “good to know” items can be skipped.',
      'A list item can be tied to the Job Checklist check it belongs with.',
      'The phone records who viewed which lesson and when. Completions are captured, not queued.',
    ].join('\r\n'),
  },
  12: {
    app: 'Back Office App > Tasks > What is attached > Documents',
    details: [
      'Attach this job’s permit to work and RAMS / HIRA. Rescue plan and space checklist usually arrive already inherited from the space.',
      'Add extra kinds when needed (lifting plan, COSHH for the task, isolation certificate).',
      'On the phone, Pause shows the permit and RAMS references.',
      'If the worker starts without a QR, they photograph the RAMS. The photo is checked against the attached RAMS before the PULSE starts.',
    ].join('\r\n'),
  },
  13: {
    app: 'Back Office App > Tasks > What is attached > Uncover',
    details: [
      'Uncover is shown before the worker goes in.',
      'Open Echoes still live at this space are pulled in automatically as warnings (for example “is the hatch still sticking?”).',
      'You can also add, edit or delete custom checks.',
      'The team acknowledges on the phone. Acknowledging an existing Echo does not create a duplicate.',
    ].join('\r\n'),
  },
  14: {
    app: 'Back Office App > Tasks > What is attached > Shift',
    details: [
      'Add the “what changed before you started” checks that belong to this task (moved a cable, brought the stretcher, re-tested the atmosphere).',
      'Checks can be written by hand or seeded from a previous Echo.',
      'On the phone this is the Shift stage. A voice note here is a common way a new Echo is created and sent to the queue.',
    ].join('\r\n'),
  },
  15: {
    app: 'Back Office App > Tasks > Task detail',
    details: [
      'Open the task and confirm the full pack: Job Checklist, Learn 5, permit, RAMS, inherited rescue / checklist, Uncover and Shift.',
      'This combined pack is what the phone downloads when the worker scans the QR or starts the assigned task.',
      'Once the task is live, that version of the pack stays fixed for this job.',
      'The Work PULSE is now ready to run.',
    ].join('\r\n'),
  },
  16: {
    app: 'Worker PWA App > Home camera',
    details: [
      'The worker opens the installed PWA (Safari on iPhone, Chrome on Android).',
      'Home is a live camera with two choices: start a Work Task, or raise an Observation.',
      'There is a No QR path when the code is missing or unreadable.',
      'The phone is geo-located. The content pack is not loaded until a QR, assigned task, or RAMS photo succeeds.',
    ].join('\r\n'),
  },
  17: {
    app: 'Worker PWA App > Scan QR',
    details: [
      'The worker scans the QR fixed at the space.',
      'The phone identifies the space and the live task there (for example Tank 3A · PTW-4471).',
      'A Work Task PULSE starts and the pack attached to that space / task is downloaded and cached.',
      'The worker then follows the QR flow: Pause → Uncover (look around, lesson, checks, rescue plan, good to know) → Shift → Shared.',
    ].join('\r\n'),
  },
  18: {
    app: 'Worker PWA App > No QR Work Task',
    details: [
      'Used when the QR is missing or cannot be read.',
      'The worker picks an assigned task from the list, or photographs the RAMS page.',
      'The RAMS photo is checked against the RAMS attached to that task in the Back Office. Only then can the PULSE start.',
      'From here the journey and pack are the same as the QR path.',
    ].join('\r\n'),
  },
  19: {
    app: 'Worker PWA App > 01 Pause',
    details: [
      'After QR scan the worker sees permit (e.g. PTW-4471), risk type, site, location and space.',
      '“Before you start” depends on Echoes the previous team left at this place.',
      'They tap “This is my job” to confirm. Captured as intelligence, not a queue item.',
      'Back Office Work Task PULSE screen (UX screen map) replays this step.',
    ].join('\r\n'),
  },
  20: {
    app: 'Worker PWA App > 03 Uncover · Look around',
    details: [
      '“These were reported by the previous team working here.” The worker answers YES/NO (e.g. ladder rung still damaged, cable at hatch, stretcher on site).',
      'Confirming an existing issue does not create a duplicate Echo.',
      'Captured on the PULSE journey. The original Echo stays open until the office closes it.',
    ].join('\r\n'),
  },
  21: {
    app: 'Worker PWA App > 03 Uncover · Lesson + five quick checks',
    details: [
      'A compulsory lesson (e.g. Rescue equipment setup) must be completed first — marked REQUIRED FOR THIS TASK.',
      'Only after the lesson unlocks the five quick checks: permit, isolation, atmosphere, rescue equipment, rescue plan.',
      'In the office these come from Learn 5 and Job Checklist packs; on the phone they run inside Uncover.',
      'All ticks are intelligence unless the worker chooses “Something not right — share it”.',
    ].join('\r\n'),
  },
  22: {
    app: 'Worker PWA App > 03 Uncover · Rescue plan + Good to know',
    details: [
      'The space rescue plan opens (steps such as raise the alarm, call rescue team). Worker taps “I understand”.',
      'Optional Good to know screens (e.g. working at height, LOTOTO) can be shown or skipped.',
      'Captured as viewed/acknowledged or skipped — not queued.',
    ].join('\r\n'),
  },
  23: {
    app: 'Worker PWA App > 04 Shift · 05 Work cannot proceed · 06 Shared',
    details: [
      'Shift: “What changed before you started?” — voice note (transcribed) or tap-one options (moved cable, brought stretcher, re-tested atmosphere).',
      'If something is not right during Uncover checks: pick what is missing, radio supervisor, Stop the job → JOB STOPPED → shared as an Echo.',
      'If all is well: Shared screen with PULSE CAPTURED summary. Worker opens My Echo or Done.',
      'Shift voice is often AI-classified and may become a queue item. Stop the job always shares an Echo.',
    ].join('\r\n'),
  },
  24: {
    app: 'Worker PWA App > 06 Shared\r\nBack Office App > Work Task PULSE (UX screen map)',
    details: [
      'The journey ends on SHARED (or JOB STOPPED on the stop path).',
      'One PULSE record holds every step. Any Echoes raised stay separate in Echoes / My Echo.',
      'Supervisors open the UX screen map (S) > Tasks — Gather > Work Task PULSE to replay Pause, each Uncover step, Shift and Shared.',
      'Typical QR journey: eight events captured, one queued (often the Shift voice note).',
    ].join('\r\n'),
  },
  25: {
    app: 'Worker PWA App > Observation',
    details: [
      'Anyone can raise an Observation at any time from the home camera — it is not a Work Task stage.',
      'The worker takes a photo, video or voice note. The capture is geo-located.',
      'They can optionally attach it to a live task (for example Plant A · PTW-4471) so it sits in that job’s context.',
      'It can also be raised during an existing Work PULSE as “During work”.',
    ].join('\r\n'),
  },
  26: {
    app: 'Worker PWA App > Observation — Categorise',
    details: [
      'The worker (or a community user) chooses one of: Good practice, Could be a risk, or Needs action now.',
      'They can choose to stay anonymous.',
      'On a Work Task, a Shift Echo is usually classified by AI instead of the worker.',
      'Needs action now goes to the Echoes queue. Good practice and lower-risk items may be noted without filling the supervisor list the same way.',
    ].join('\r\n'),
  },
  27: {
    app: 'Worker PWA App > Shared / My Echo',
    details: [
      'The Echo is given a reference (for example 4471-03), an AI title and summary, plus the media, place and time.',
      'The worker sees Received at once: “Got it. This is with the back office now.”',
      'The Back Office Echoes list updates live. The item may or may not need a person — that depends on the classification.',
    ].join('\r\n'),
  },
  28: {
    app: 'Back Office App > Echoes',
    details: [
      'This is the actionable queue — only Echoes that need a person.',
      'Split into Work Task Echoes and Observation Echoes. Filter by site, period, needs attention, SIF / critical, or could be a risk.',
      'Typical row: space · task, what the AI reads, response type, category, source, who raised it, how long it has been open.',
      'Most of a finished PULSE never appears here. The PULSE viewer will show “Reached the queue: 1 of 9 events”.',
    ].join('\r\n'),
  },
  29: {
    app: 'Back Office App > Work Task PULSE (UX screen map)',
    details: [
      'Open the task, then Work Task PULSE, to replay the journey the worker just finished.',
      'See every QR stage (Pause, Uncover look-around/lesson/checks/rescue/good-to-know, Shift, Shared), what was captured, and whether it was queued.',
      'Set the PULSE status to Completed, In progress or Abandoned.',
      'Use this to audit one journey end to end. Links go through to each Echo.',
    ].join('\r\n'),
  },
  30: {
    app: 'Back Office App > Echoes > Job Checklist completions today',
    details: [
      'See who completed a Job Checklist, the outcome (carried on / changed the plan / stopped), and whether an Echo was created.',
      'Completions with nothing raised are a participation count and never enter the queue.',
      'Only a completion that records a decision needs a person — those rows link to the Echo.',
    ].join('\r\n'),
  },
  31: {
    app: 'Back Office App > Tasks > Everything raised',
    details: [
      'On the task detail, open Everything raised.',
      'This lists every Echo on that permit: response type, who raised it, when, status and owner.',
      'Same records as the Echoes queue, filtered to one job.',
    ].join('\r\n'),
  },
  32: {
    app: 'Back Office App > Echoes > Echo detail',
    details: [
      'Open an Echo. Review the photos, video, voice transcript, AI title and AI summary. Edit the title or summary before you confirm — the original is kept in history.',
      'Actions: Confirm, Confirm and assign, or Acknowledge and share. Assign an owner (suggested by the site rule).',
      'You can change the response type and the hazard category. Both the AI choice and your choice are kept.',
      'As soon as you open it, the worker’s My Echo moves to Viewed — “Someone is looking at this.”',
    ].join('\r\n'),
  },
  33: {
    app: 'Back Office App > Echoes > Held Echo',
    details: [
      'A high-risk Echo on a live permit can be held for review instead of going straight to the shared feed.',
      'Record why it is held. Release it later and assign a supervisor.',
      'Held Echoes stay out of the shared feed. The worker still sees Viewed and that someone is looking — they are not left in silence.',
    ].join('\r\n'),
  },
  34: {
    app: 'Back Office App > Echoes > Echo detail',
    details: [
      'Keep the worker’s classification, or change it (for example to Needs action now).',
      'AI draft, worker choice and reviewer choice are all kept in the history.',
      'The worker’s own wording stays on their phone. This is the audit trail for how the Echo was read.',
    ].join('\r\n'),
  },
  35: {
    app: 'Back Office App > Echoes > Mark actioned',
    details: [
      'The assigned owner records that work on the fix has started.',
      'The worker’s My Echo moves to Actioned — for example “Tom Wilson is acting on it.”',
      'This is progress before the fix is finished. The Echo is not closed yet.',
    ].join('\r\n'),
  },
  36: {
    app: 'Back Office App > Echoes > Close',
    details: [
      'Write what was done (required). Optionally add an after photo. Edit the message that will go to the named reporter.',
      'Close sends the message and photo to the worker. My Echo shows Closed with that evidence.',
      'The Echo stays as history and can feed the next Uncover or a Learn 5 draft.',
    ].join('\r\n'),
  },
  37: {
    app: 'Back Office App > Echoes > Close anonymous Echo',
    details: [
      'Same close-out: what was done, optional after photo.',
      'No personal message is sent, because the reporter chose anonymity.',
      'The fix and after photo are published to the space feed (for example Tank 3A) so the person can see the outcome without being identified.',
    ].join('\r\n'),
  },
  38: {
    app: 'Back Office App > Echoes > Repeat Echo',
    details: [
      'When the same asset is reported again, the Echo shows the earlier Echo, how many days since it was closed, and that a control may not be holding.',
      'Leave it with the current owner, or Escalate to the Site Manager.',
      'While it stays open, the next worker at that space is still warned in Uncover.',
    ].join('\r\n'),
  },
  39: {
    app: 'Back Office App > Echoes > Good practice',
    details: [
      'A good-practice Echo does not need an owner or a due date.',
      'Acknowledge and share it to the space feed if it is worth repeating.',
      'The worker was already thanked automatically when it was received. It then closes quietly.',
      'It is counted in participation and trends, and does not fill the action queue.',
    ].join('\r\n'),
  },
  40: {
    app: 'Back Office App > Echoes > Closed Echo',
    details: [
      'On a closed Echo, choose to turn it into learning.',
      'AI drafts a Learn 5 from what went wrong, the fix, and the after photo.',
      'A content owner must review and publish it. Nothing reaches a phone unchecked.',
      'Once published, attach it to the space or task Learn 5 so the next PULSE shows it.',
    ].join('\r\n'),
  },
  41: {
    app: 'Back Office App > Tasks > Export this task',
    details: [
      'Export the whole job as a PDF (for sharing outside SafeIn5) or a CSV (one row per Echo).',
      'The file always includes Echoes, Job Checklist completions, the permit, attached documents, confirmed AI summaries, and acknowledgements sent to the worker.',
      'Marked internal use and written to the share log against the task.',
    ].join('\r\n'),
  },
  42: {
    app: 'Back Office App > Analytics',
    details: [
      'Overview: waiting on you and overdue, offline arrivals placed by capture time, items held for review, today’s priorities.',
      'Capture: how many Work Task and Observation PULSEs ran, and how many events were recorded versus queued.',
      'Signal: participation, SIF / critical themes, loop-closed rate and emerging repeats.',
      'Supervisors use this before the morning walk. Client admins use it for behaviour trends.',
    ].join('\r\n'),
  },
  43: {
    app: 'Back Office App > Echoes\r\nWorker PWA App > My Echo',
    details: [
      'While both apps are open, new Echoes, status changes and PULSE completions appear without a refresh.',
      'Received, Viewed, Actioned and Closed stay in step on the supervisor queue and on the worker’s My Echo.',
      'This is the live link between the phone and the Back Office after a PULSE is done.',
    ].join('\r\n'),
  },
  44: {
    app: 'Back Office App > Work Task PULSE (UX screen map)\r\nBack Office App > Analytics',
    details: [
      'Pause facts, Learn 5 completions, clean Job Checklists, Uncover acknowledgements and good-practice Echoes are all stored.',
      'None of that needs a person, so none of it fills the Echoes queue.',
      'It still appears on the PULSE journey and in Analytics as behavioural intelligence / participation.',
    ].join('\r\n'),
  },
  45: {
    app: 'Back Office App > Tasks > What is attached > Uncover\r\nWorker PWA App > Uncover',
    details: [
      'An Echo that is still open at a space is pulled into the next task’s Uncover list.',
      'The next worker who scans that QR is asked about it (for example “is the ladder rung still damaged?”).',
      'If they only acknowledge the warning, no second Echo is created.',
      'This is how today’s SIGNAL feeds tomorrow’s PULSE.',
    ].join('\r\n'),
  },
  46: {
    app: 'Back Office App > Echoes > Closed Echo\r\nBack Office App > Content',
    details: [
      'The Learn 5 drafted from a closed Echo is reviewed by an authorised content owner.',
      'After publish, attach it to the space or the next task.',
      'The next crew sees the lesson on the phone. Improvements become future Learn 5, not only a closed ticket.',
    ].join('\r\n'),
  },
  47: {
    app: 'Back Office App > Tasks > What is attached > Uncover / Shift',
    details: [
      'After a close-out, edit or add Uncover and Shift wording so the next job asks the right question (for example “Rescue set staged at entry”).',
      'The next worker at that space sees the improved check list, not only a historical Echo.',
      'Learning is encoded into the pack that the phone will load on the next scan.',
    ].join('\r\n'),
  },
};
