import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeXlsx } from "./lib/xlsx.mjs";

/**
 * Builds seed SQL and a mapping workbook from docs/sample documents/.
 * Run: node scripts/generate-sample-job-pack.mjs
 */
const root = resolve(import.meta.dirname, "..");
const sqlPath = join(root, "db", "seed", "sample-job-pack.sql");
const xlsxPath = join(
  root,
  "docs",
  "sample documents",
  "SafeIn5_Sample_Documents_Seed_Map.xlsx",
);

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;

export const people = [
  {
    email: "ja.byrne@seed.safein5.local",
    first: "JA",
    last: "Byrne",
    siteRole: "site_manager",
    orgRole: "member",
    uiName: "Name",
    source: "Permit issuer; HIRA reviewer J. A Byrne",
  },
  {
    email: "jake.marshall@seed.safein5.local",
    first: "Jake",
    last: "Marshall",
    siteRole: "supervisor",
    orgRole: "member",
    uiName: "Name / Task Lead",
    source: "Contractor clearance: person raising authorisation",
  },
  {
    email: "j.abrahams@seed.safein5.local",
    first: "J",
    last: "Abrahams",
    siteRole: "supervisor",
    orgRole: "member",
    uiName: "Name",
    source: "Rescue plan completed by: Engineering Supervisor",
  },
  {
    email: "t.hamnett@seed.safein5.local",
    first: "T",
    last: "Hamnett",
    siteRole: "worker",
    orgRole: "member",
    uiName: "Name",
    source: "Permit acceptor; contractor engineer, Brington Engineering",
  },
  {
    email: "nathan.whittle@seed.safein5.local",
    first: "Nathan",
    last: "Whittle",
    siteRole: "worker",
    orgRole: "member",
    uiName: "Name",
    source: "Permit crew / worker log",
  },
];

export const documents = [
  {
    title: "Hazard Identification & Risk Assessment — Hot Bins / Chutes",
    docType: "risk_assessment",
    revision: "v1",
    paperReference: "HOTBINSRA01",
    uiType: "RAMS or HIRA",
    scope: "work_task",
    s3Key: "seed/sample-documents/RAMS/HIRA-Front-Page-1.jpeg",
    files:
      "RAMS/HIRA Front Page 1 .jpeg; RAMS/HIRA Page 2.jpeg; RAMS/HIRA Page 3.jpeg",
  },
  {
    title: "Permit to Work 098001",
    docType: "permit_to_work",
    revision: "v1",
    paperReference: "098001",
    uiType: "Permit to work",
    scope: "work_task",
    s3Key:
      "seed/sample-documents/Permit-To-Work/Permit-to-Work-Front-Page.jpeg",
    files:
      "Permit To Work/Permit to Work Front Page .jpeg; Permit To Work/Permit to Work Back Page.jpeg",
  },
  {
    title: "Confined Space Rescue Plan — Hot Aggregate Bins",
    docType: "rescue_plan",
    revision: "v1",
    paperReference: "r1 · uncontrolled copy printed 24/05/19",
    uiType: "Rescue plan",
    scope: "space",
    s3Key: "seed/sample-documents/Rescue-Plan/Rescue-Plan-Front-Page.jpeg",
    files:
      "Rescue Plan/Rescue Plan Front Page.jpeg; Rescue Plan/Confined Space Rescue Plan Back page.jpeg",
  },
  {
    title: "IMSF 100 — Confined Spaces Checklist",
    docType: "checklist",
    revision: "v1",
    paperReference: "Version 1 Revision 0 · June 2024",
    uiType: "Checklist",
    scope: "space",
    s3Key:
      "seed/sample-documents/Confined-Space-Check-List/CS-Check-List-Page-1.jpeg",
    files:
      "Confiend Space Check List/CS Check List Page 1.jpeg; CS Check List Page 2 .jpeg; CS Check List Page 3 .jpeg (page 4 not supplied)",
  },
  {
    title: "Contractors Clearance To Work Authorisation",
    docType: "other",
    revision: "v1",
    paperReference: "13.6.26–14.6.26",
    uiType: "(no matching document kind)",
    scope: "work_task",
    s3Key:
      "seed/sample-documents/Contractor-Approval/Contractor-Clearance-main-page.jpeg",
    files:
      "Contractor Approval/Contractor Clearence to work main page.jpeg; Contract Authorisation Front Page.jpeg",
  },
];

export const checklist = [
  [
    1,
    "Can the need to enter the confined space be avoided?",
    true,
    "NO",
    "REPAIRS CAN ONLY BE COMPLETED INSIDE",
  ],
  [
    2,
    "Can the confined space be permanently re-classified by removing the enclosed nature?",
    false,
    "NO",
    "",
  ],
  [
    3,
    "Can the confined space be permanently re-classified by removing the specified hazard(s)?",
    false,
    "NO",
    "",
  ],
  [
    4,
    "Can the confined space be temporarily re-classified by forced ventilation?",
    false,
    "YES",
    "",
  ],
  [
    5,
    "If forced ventilation fails, is there sufficient time for a safe evacuation?",
    true,
    "YES",
    "",
  ],
  [
    6,
    "Has a specific risk assessment been completed for the confined space?",
    true,
    "YES",
    "ATTACHED",
  ],
  [
    7,
    "Has the risk assessment considered all conditions of operation, including abnormal and temporary conditions?",
    true,
    "YES",
    "",
  ],
  [
    8,
    "Has the risk assessment considered the risks created by the planned work?",
    true,
    "YES",
    "",
  ],
  [
    9,
    "Has a specific safe working procedure / safe system of work been prepared?",
    true,
    "YES",
    "",
  ],
  [
    10,
    "Does the safe working procedure specify measures to take in an emergency?",
    true,
    "YES",
    "",
  ],
  [
    11,
    "Has a Confined Space Permit been raised, including control measures from this checklist?",
    true,
    "YES",
    "",
  ],
  [
    12,
    "Has a suitable warning sign been posted to identify the confined space?",
    false,
    "YES",
    "",
  ],
  [
    13,
    "Has the confined space been secured to deter unauthorised access?",
    true,
    "YES",
    "",
  ],
  [
    14,
    "Have fixed gas detectors or low oxygen monitors been provided in a suitable location?",
    true,
    "NO",
    "OWN GAS MONITORS USED",
  ],
  [
    15,
    "Are gas detectors adequately maintained and calibrated?",
    true,
    "YES",
    "",
  ],
  [
    16,
    "Can the confined space be ventilated naturally to reduce unsafe atmosphere risk?",
    true,
    "YES",
    "",
  ],
  [17, "Have fixed ventilation provisions been made?", false, "NO", ""],
  [
    18,
    "Is fixed ventilation maintained and tested periodically?",
    false,
    "N/A",
    "",
  ],
  [
    19,
    "Have cameras been fitted so persons inside the confined space can be monitored?",
    false,
    "N/A",
    "",
  ],
  [
    20,
    "Is there an adequate means of communication between persons inside and those outside?",
    true,
    "YES",
    "TOP MEN AT ALL TIMES. RADIO COMMUNICATION.",
  ],
  [21, "Is sufficient ventilation available?", true, "YES", ""],
  [
    22,
    "Is the level of lighting inside the confined space adequate?",
    false,
    "YES",
    "PORTABLE LIGHTS USED.",
  ],
  [
    23,
    "Can ambient temperature be controlled or monitored to prevent excessive heat?",
    true,
    "YES",
    "PLANT COOLED 12 HOURS BEFORE ENTRY.",
  ],
  [
    24,
    "Has adequate access been provided for safe entry into the confined space?",
    true,
    "YES",
    "",
  ],
  [
    25,
    "Are walkways and access platforms to the opening safe to use?",
    true,
    "YES",
    "",
  ],
  [
    26,
    "Is access large enough for people wearing PPE including emergency breathing apparatus?",
    true,
    "YES",
    "",
  ],
  [
    27,
    "Is sufficient access equipment available (tripod, full body harness and winch)?",
    true,
    "YES",
    "",
  ],
  [
    28,
    "Have all persons who manage or enter the confined space received specific training and been authorised?",
    true,
    "YES",
    "",
  ],
  [
    29,
    "Where the layout or task has physical constraints, are individuals of suitable build and fitness?",
    true,
    "YES",
    "",
  ],
  [
    30,
    "Has the site appointed sufficient competent persons to issue a permit and supervise the activity?",
    true,
    "YES",
    "",
  ],
  [
    31,
    "Are employees and contractors aware that a Permit to Work must be issued before entry?",
    true,
    "YES",
    "",
  ],
  [
    32,
    "Are employees and contractors aware of procedures when the task, environment or method changes?",
    true,
    "YES",
    "",
  ],
  [
    33,
    "Has the confined space been emptied of its contents, including residues where possible?",
    true,
    "YES",
    "",
  ],
  [34, "Has the inside of the confined space been cleaned?", true, "YES", ""],
  [
    35,
    "Can pipework be isolated to prevent gas, fume or vapour entering?",
    true,
    "YES",
    "",
  ],
  [
    36,
    "Can mechanical and electrical isolation prevent plant operating or discharging into the space?",
    true,
    "YES",
    "",
  ],
  [
    37,
    "Are all isolations checked before work commences as part of the Permit to Work?",
    true,
    "YES",
    "",
  ],
  [
    38,
    "Has the atmosphere been verified as safe prior to entry?",
    true,
    "YES",
    "GAS MONITORED BEFORE ENTRY",
  ],
  [
    39,
    "Are signs displayed notifying that work is being undertaken and that people are inside?",
    true,
    "YES",
    "",
  ],
  [
    40,
    "Where flammable or explosive atmospheres are possible, are ignition sources controlled?",
    true,
    "N/A",
    "",
  ],
  [
    41,
    "If appropriate, have non-sparking tools been specified and provided?",
    false,
    "N/A",
    "",
  ],
  [
    42,
    "Are suitable precautions in place to prevent electric shock inside metal tanks?",
    true,
    "YES",
    "",
  ],
  [
    43,
    "Have calibrated personal air monitoring devices been provided for all persons who will enter?",
    true,
    "YES",
    "",
  ],
  [
    44,
    "Have monitors and ELSA been checked prior to entry where required?",
    true,
    "YES",
    "",
  ],
  [
    45,
    "Has the correct type of PPE been specified for each activity, including rescue equipment?",
    true,
    "YES",
    "",
  ],
  [
    46,
    "Has suitable PPE been provided for all persons entering, and is it being used?",
    true,
    "YES",
    "",
  ],
  [
    47,
    "Is PPE in good condition and appropriate for the conditions and activities?",
    false,
    "YES",
    "",
  ],
  [
    48,
    "Has an emergency plan been prepared for this specific confined space?",
    true,
    "YES",
    "",
  ],
  [
    49,
    "Has the site identified suitable emergency arrangements before work commences?",
    true,
    "YES",
    "",
  ],
  [
    50,
    "Has a rescue procedure been defined and communicated?",
    true,
    "YES",
    "ATTACHED",
  ],
  [51, "Is there a suitable method of raising the alarm?", true, "YES", ""],
  [
    52,
    "Has the response time of emergency services been considered?",
    true,
    "YES",
    "",
  ],
  [
    53,
    "Has necessary rescue and resuscitation equipment been identified and provided?",
    true,
    "YES",
    "",
  ],
  [54, "Are first aid provisions adequate?", true, "YES", ""],
  [
    55,
    "Are persons responsible for emergency response adequately trained and practised?",
    true,
    "YES",
    "",
  ],
  [
    56,
    "If breathing apparatus is required, is the access a minimum of 575 mm square?",
    true,
    "YES",
    "",
  ],
];

const seedMap = [
  [
    "Client",
    "Tarmac",
    "Client / Organisation",
    "Clients / New client",
    "tenant",
    "name, kind",
    "Seeded",
    "All sample packs carry the Tarmac CRH logo.",
  ],
  [
    "Site",
    "Dolyhir",
    "Site name",
    "Sites / Add a site",
    "site",
    "name",
    "Seeded",
    "HIRA: SITE NAME / DEPARTMENT = Dolyhir. Permit handwriting also looks like Dolyhir & Strinds.",
  ],
  [
    "Site contact",
    "JA Byrne",
    "Site Manager",
    "Sites / Add a site",
    "site",
    "user_site_membership.role_id (site_manager)",
    "Seeded",
    "Tarmac permit issuer. Other supervisors still listed on People.",
  ],
  [
    "Space",
    "Hot Aggregate Bins",
    "Space name",
    "Add a space",
    "space",
    "name",
    "Seeded",
    "Rescue plan: ASPHALT PLANT HOT AGG BINS.",
  ],
  [
    "Space location",
    "Asphalt Plant, mixer house level 3",
    "Location on site",
    "Add a space",
    "space",
    "location",
    "Seeded",
    "Rescue plan back: door in mixer house level 3; 300 mm side hatch.",
  ],
  [
    "Asset type",
    "Hot aggregate bins / confined space",
    "Asset type",
    "Add a space",
    "space",
    "asset_type",
    "Seeded",
    "From HIRA task and rescue-plan description.",
  ],
  [
    "Task type",
    "Confined space entry",
    "Task type",
    "Add a space",
    "space",
    "task_type",
    "Seeded",
    "Website required field; inferred from permit type.",
  ],
  [
    "Space permit",
    "Yes",
    "Permit required before work can start",
    "Add a space",
    "space",
    "permit_required",
    "Seeded",
    "Permit 098001 raised.",
  ],
  [
    "Space rescue",
    "Yes",
    "This space should carry a rescue plan",
    "Add a space",
    "space",
    "rescue_plan_required",
    "Seeded",
    "Rescue plan pack present.",
  ],
  [
    "Owner rule",
    "Supervisor, Dolyhir",
    "Content owner",
    "Add a space",
    "space",
    "owner_rule",
    "Partial",
    "No named content-owner user on the papers; rule text only.",
  ],
  [
    "Task reference",
    "098001",
    "Task reference",
    "Add a task",
    "work_task",
    "reference",
    "Seeded",
    "Printed permit number.",
  ],
  [
    "Work",
    "Repairs in Asphalt Plant Hot Agg Bins",
    "What is the work",
    "Add a task",
    "work_task",
    "work_description",
    "Seeded",
    "Permit task description. HIRA activity: Repairs to Hot bins / Chutes.",
  ],
  [
    "Permit type",
    "Confined Space; Hot Work",
    "Permit reference type",
    "Add a task",
    "work_task",
    "permit_type",
    "Seeded",
    "Permit ticks confined space and hot work. Contractor form also ticks working at height.",
  ],
  [
    "Permit number",
    "098001",
    "Permit reference number",
    "Add a task",
    "work_task",
    "permit_number",
    "Seeded",
    "",
  ],
  [
    "Permit valid to",
    "2026-06-14 15:30",
    "Permit valid to",
    "Task / Permit",
    "work_task",
    "permit_valid_until",
    "Seeded",
    "Permit closed 14-6-26 15:30.",
  ],
  [
    "RAMS document",
    "HIRA HOTBINSRA01",
    "RAMS document",
    "Add a task",
    "work_task",
    "rams_document_id",
    "Seeded",
    "",
  ],
  [
    "RAMS reference",
    "HOTBINSRA01",
    "RAMS reference number",
    "Add a task",
    "work_task",
    "rams_reference",
    "Seeded",
    "HIRA R A Number.",
  ],
  [
    "Task Lead",
    "Jake Marshall",
    "Task Lead",
    "Add a task",
    "work_task",
    "lead_user_id",
    "Seeded",
    "Person raising contractor authorisation (Supervisor).",
  ],
  [
    "Starts",
    "2026-06-13 06:00",
    "Starts",
    "Add a task",
    "work_task",
    "starts_at",
    "Seeded",
    "Permit issuer time 0600 on 13-6-26.",
  ],
  [
    "Runs for",
    "2 days, ends 2026-06-14 15:30",
    "Runs for",
    "Add a task",
    "work_task",
    "planned_days, ends_at",
    "Seeded",
    "Authorisation valid 13.6.26 to 14.6.26.",
  ],
  [
    "Crew",
    "T Hamnett, Nathan Whittle",
    "Add another user",
    "Add a task",
    "work_task_crew",
    "user_id",
    "Seeded",
    "Permit names involved; A Byrne is issuer not crew.",
  ],
  [
    "Checklist pack",
    "IMSF 100 — Confined Spaces Checklist",
    "Title / Which kind of content is this?",
    "Job Checklist",
    "content_pack",
    "title, kind=job_checklist",
    "Seeded",
    "Pages 1–3 of 4. Prompts stored; answers are not (see STILL_NEEDED).",
  ],
];

const stillNeeded = [
  [
    "High",
    "Paper, no schema",
    "IMSF 100 answers (Yes/No/NA) and comments",
    "Job Checklist completion",
    "content_prompt / checklist_completion",
    "YES / NO / N/A plus comments on pages 1–3",
    "Schema stores prompt text only. Completion stores a single outcome, not per-check answers.",
    "Add checklist_answer(completion_id, prompt_id, value, comment) before the website can show a filled IMSF 100.",
  ],
  [
    "High",
    "Paper, no schema",
    "HIRA hazard rows",
    "Documents / RAMS",
    "(none)",
    "Plant start up; Working at heights; Hot works; Power tools; Confined space; Heat; Dust",
    "HIRA is stored as a file. Severity, likelihood, risk rating and controls are not columns.",
    "Needed if the website should list hazards without opening the scan.",
  ],
  [
    "High",
    "Paper, no schema",
    "Document reference (separate from revision)",
    "Upload a document · Reference",
    "document.reference (missing)",
    "HOTBINSRA01, 098001, IMSF-100",
    "Website has Reference; schema has no document.reference column yet.",
    "Use work_task.rams_reference / permit_number / document.title. revision is v1, v2, v3 only.",
  ],
  [
    "High",
    "Paper, no schema",
    "Contractor / company",
    "Task people / Documents",
    "(none)",
    "Brington Engineering",
    "No contractor-company table. Contractor clearance stored as document.doc_type=other.",
    "Needed to invite a contractor firm rather than only named people.",
  ],
  [
    "High",
    "Paper, no schema",
    "Permit checklist ticks",
    "Permit to work",
    "(none)",
    "Hot work and confined-space control ticks; fire watch log; worker sign on/off",
    "Permit is a scanned document. Individual ticks and the worker log cannot be queried.",
    "Only required if the website must reproduce the paper permit as fields.",
  ],
  [
    "High",
    "Missing from folder",
    "IMSF 100 page 4 of 4",
    "Job Checklist",
    "content_prompt",
    "",
    "Form is 4 pages. Folder only has pages 1–3.",
    "Obtain page 4 before publishing the checklist.",
  ],
  [
    "High",
    "Missing from folder",
    "Method statement file HOTBINSMS01",
    "Documents · Type",
    "document",
    "HOTBINSMS01",
    "HIRA header cites MS/SOP number. No method-statement file in the folder (page 3 is emergency procedures / SSoW sign-off).",
    "Upload the method statement, or keep the reference as text only.",
  ],
  [
    "High",
    "Website field, not on paper",
    "Work email / Phone number",
    "Invite people",
    "app_user.email, app_user.phone",
    "Placeholder emails @seed.safein5.local; phones blank",
    "Papers have names and signatures only.",
    "Collect real emails or mobiles before invites will send.",
  ],
  [
    "High",
    "Website field, not on paper",
    "QR code",
    "Spaces",
    "space.qr_code",
    "",
    "No QR printed on these packs.",
    "Generate on first publish of the space.",
  ],
  [
    "High",
    "Website field, not on paper",
    "Company administrator",
    "Invite people / Client",
    "user_tenant_membership.role=tenant_admin",
    "",
    "All seeded people are members.",
    "Invite at least one Tarmac admin to use the back office.",
  ],
  [
    "Medium",
    "Website field, not on paper",
    "Site location",
    "Add a site",
    "site.location (missing)",
    "Dolyhir Quarry / Asphalt Plant",
    "Website asks for site location; schema has no site.location (only space.location).",
    "Add site.location or keep location on the space only.",
  ],
  [
    "Medium",
    "Website field, not on paper",
    "Learn 5 packs, Uncover/Shift copy, duration",
    "Learn 5 / Attach content",
    "content_pack kind=learn_5",
    "",
    "Sample folder is permits and checklists only.",
    "Author Learn 5 separately, or generate from the HIRA/rescue text.",
  ],
  [
    "Medium",
    "Website field, not on paper",
    "Content owner (named user)",
    "Add a space",
    "space.content_owner_user_id",
    "",
    "Papers name supervisors, not a content owner.",
    "Assign Jake Marshall or JA Byrne after login accounts exist.",
  ],
  [
    "Medium",
    "Website field, not on paper",
    "Category owners (Assign to)",
    "Site routing",
    "site_category_owner",
    "Confined space → ?",
    "No routing sheet in the folder.",
    "Needed before Echoes can auto-assign.",
  ],
  [
    "Medium",
    "Paper, no schema",
    "Rescue equipment and PPE ticks",
    "Rescue plan",
    "(none)",
    "Radio; lifeline/rope; pulley; sked; beam anchorage; listed PPE",
    "Stored only inside the scanned rescue plan.",
    "Needed only if rescue kit is a structured UI, not a PDF.",
  ],
  [
    "Medium",
    "Paper, no schema",
    "Contractor clearance checklists and lock numbers",
    "(no screen)",
    "(none)",
    "Locks 011, 023, 018, 020; isolation required = No",
    "No lock-out table. Section 3 and 8 checkboxes were mostly blank on the scan.",
    "",
  ],
  [
    "Medium",
    "Unclear handwriting",
    "SSoW sign-off names",
    "People",
    "app_user",
    "J.A. Bone / Byrne; Rhoda James / Rhodri Jones; Clint Run",
    "HIRA page 3 names are hard to read. Not seeded.",
    "Confirm names before adding more people.",
  ],
  [
    "Low",
    "Website field, not on paper",
    "Client domain, status, retention",
    "Clients",
    "tenant (columns missing)",
    "",
    "Prototype client fields are not in schema and not on these papers.",
    "See SafeIn5_Website_to_Schema_Field_Mapping.xlsx GAPS.",
  ],
  [
    "Low",
    "Website field, not on paper",
    "Echoes, PULSE sessions, media",
    "Queue / PULSE",
    "signal, pulse, signal_media",
    "",
    "These papers are the job pack, not live observations.",
    "Leave empty for go-live; workers create them in the field.",
  ],
  [
    "Info",
    "Document kind gap",
    "Contractor clearance type",
    "Upload a document · Type",
    "document.doc_type",
    "other",
    "CHECK allows permit_to_work, risk_assessment, rescue_plan, checklist, standard, toolbox_talk, other.",
    "Widen the enum if contractor approval should be a first-class type.",
  ],
];

function sqlBody() {
  const promptValues = checklist
    .map(
      ([n, text, critical]) =>
        `        (${String(n).padStart(2, " ")}, ${q(text)}, ${critical}, true)`,
    )
    .join(",\n");

  const userVars = [
    "v_byrne_id",
    "v_marshall_id",
    "v_abrahams_id",
    "v_hamnett_id",
    "v_whittle_id",
  ];
  const docVars = [
    "v_hira_id",
    "v_ptw_id",
    "v_rescue_id",
    "v_imsf_id",
    "v_clearance_id",
  ];

  const personBlocks = people
    .map(
      (person, index) => `
    INSERT INTO app_user (email, first_name, last_name, account_status)
    VALUES (${q(person.email)}, ${q(person.first)}, ${q(person.last)}, 'invited')
    ON CONFLICT (email) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name
    RETURNING id INTO ${userVars[index]};

    INSERT INTO user_tenant_membership (user_id, tenant_id, role)
    VALUES (${userVars[index]}, v_tenant_id, ${q(person.orgRole)})
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;

    INSERT INTO user_site_membership (user_id, site_id, role_id)
    SELECT ${userVars[index]}, v_site_id, r.id
    FROM role r
    WHERE r.scope = 'site' AND r.key = ${q(person.siteRole)}
    ON CONFLICT (user_id, site_id) DO UPDATE SET role_id = EXCLUDED.role_id;`,
    )
    .join("\n");

  const documentBlocks = documents
    .map(
      (doc, index) => `
    SELECT id INTO ${docVars[index]}
    FROM document
    WHERE tenant_id = v_tenant_id AND title = ${q(doc.title)}
    ORDER BY id LIMIT 1;

    IF ${docVars[index]} IS NULL THEN
        INSERT INTO document (tenant_id, title, doc_type, status)
        VALUES (v_tenant_id, ${q(doc.title)}, ${q(doc.docType)}, 'draft')
        RETURNING id INTO ${docVars[index]};

        INSERT INTO document_revision (
            document_id, revision, s3_key, mime_type, is_current
        )
        VALUES (
            ${docVars[index]}, ${q(doc.revision)},
            ${q(doc.s3Key)}, 'image/jpeg', true
        );
    END IF;`,
    )
    .join("\n");

  return `-- SafeIn5 sample-documents job-pack seed
-- Source: docs/sample documents/
-- Regenerated by: node scripts/generate-sample-job-pack.mjs
--
-- Photographed Tarmac / Dolyhir pack for Hot Aggregate Bins (permit 098001).
-- Inserts draft/unpublished rows. Safe to re-run.
--
--   psql -U postgres -d safein5 -v ON_ERROR_STOP=1 \\
--     -f db/seed/sample-job-pack.sql

BEGIN;

DO $seed$
DECLARE
    v_tenant_id   integer;
    v_site_id     integer;
    v_space_id    integer;
    v_task_id     integer;
    v_pack_id     integer;
    v_byrne_id    integer;
    v_marshall_id integer;
    v_abrahams_id integer;
    v_hamnett_id  integer;
    v_whittle_id  integer;
    v_hira_id     integer;
    v_ptw_id      integer;
    v_rescue_id   integer;
    v_imsf_id     integer;
    v_clearance_id integer;
BEGIN

    SELECT id INTO v_tenant_id
    FROM tenant
    WHERE name = 'Tarmac' AND kind = 'corporate'
    ORDER BY id
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        INSERT INTO tenant (name, kind)
        VALUES ('Tarmac', 'corporate')
        RETURNING id INTO v_tenant_id;
    END IF;

    SELECT id INTO v_site_id
    FROM site
    WHERE tenant_id = v_tenant_id AND name = 'Dolyhir'
    ORDER BY id LIMIT 1;

    IF v_site_id IS NULL THEN
        INSERT INTO site (tenant_id, name)
        VALUES (v_tenant_id, 'Dolyhir')
        RETURNING id INTO v_site_id;
    END IF;
${personBlocks}

    SELECT id INTO v_space_id
    FROM space
    WHERE tenant_id = v_tenant_id
      AND site_id = v_site_id
      AND name = 'Hot Aggregate Bins'
    ORDER BY id LIMIT 1;

    IF v_space_id IS NULL THEN
        INSERT INTO space (
            tenant_id, site_id, name, location, asset_type, task_type,
            permit_required, rescue_plan_required, owner_rule
        )
        VALUES (
            v_tenant_id, v_site_id, 'Hot Aggregate Bins',
            'Asphalt Plant, mixer house level 3',
            'Hot aggregate bins / confined space',
            'Confined space entry',
            true, true, 'Supervisor, Dolyhir'
        )
        RETURNING id INTO v_space_id;
    ELSE
        UPDATE space SET
            location = COALESCE(location, 'Asphalt Plant, mixer house level 3'),
            asset_type = COALESCE(asset_type, 'Hot aggregate bins / confined space'),
            task_type = COALESCE(task_type, 'Confined space entry'),
            permit_required = true,
            rescue_plan_required = true,
            owner_rule = COALESCE(owner_rule, 'Supervisor, Dolyhir')
        WHERE id = v_space_id;
    END IF;
${documentBlocks}

    SELECT id INTO v_task_id
    FROM work_task
    WHERE tenant_id = v_tenant_id AND reference = '098001'
    ORDER BY id LIMIT 1;

    IF v_task_id IS NULL THEN
        INSERT INTO work_task (
            tenant_id, site_id, space_id, reference, work_description, status,
            permit_required, permit_type, permit_number, permit_valid_until,
            rams_document_id, rams_reference, lead_user_id,
            starts_at, ends_at, planned_days
        )
        VALUES (
            v_tenant_id, v_site_id, v_space_id, '098001',
            'Repairs in Asphalt Plant Hot Agg Bins', 'active',
            true, 'Confined Space; Hot Work', '098001',
            timestamptz '2026-06-14 15:30:00+01',
            v_hira_id, 'HOTBINSRA01', v_marshall_id,
            timestamptz '2026-06-13 06:00:00+01',
            timestamptz '2026-06-14 15:30:00+01',
            2
        )
        RETURNING id INTO v_task_id;
    END IF;

    INSERT INTO work_task_crew (work_task_id, user_id)
    VALUES (v_task_id, v_hamnett_id), (v_task_id, v_whittle_id)
    ON CONFLICT (work_task_id, user_id) DO NOTHING;

    -- Placements: HIRA, PTW, contractor auth → task; rescue plan + IMSF 100 → space
    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_hira_id AND work_task_id = v_task_id
    ) THEN
        INSERT INTO document_placement (document_id, scope_kind, work_task_id)
        VALUES (v_hira_id, 'work_task', v_task_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_ptw_id AND work_task_id = v_task_id
    ) THEN
        INSERT INTO document_placement (document_id, scope_kind, work_task_id)
        VALUES (v_ptw_id, 'work_task', v_task_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_clearance_id AND work_task_id = v_task_id
    ) THEN
        INSERT INTO document_placement (document_id, scope_kind, work_task_id)
        VALUES (v_clearance_id, 'work_task', v_task_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_rescue_id AND space_id = v_space_id
    ) THEN
        INSERT INTO document_placement (document_id, scope_kind, space_id)
        VALUES (v_rescue_id, 'space', v_space_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_imsf_id AND space_id = v_space_id
    ) THEN
        INSERT INTO document_placement (document_id, scope_kind, space_id)
        VALUES (v_imsf_id, 'space', v_space_id);
    END IF;

    SELECT id INTO v_pack_id
    FROM content_pack
    WHERE tenant_id = v_tenant_id
      AND kind = 'job_checklist'
      AND title = 'IMSF 100 — Confined Spaces Checklist'
    ORDER BY id LIMIT 1;

    IF v_pack_id IS NULL THEN
        INSERT INTO content_pack (
            tenant_id, kind, title, category, status, revision
        )
        VALUES (
            v_tenant_id, 'job_checklist',
            'IMSF 100 — Confined Spaces Checklist',
            'Confined space', 'draft',
            'v1'
        )
        RETURNING id INTO v_pack_id;
    END IF;

    DELETE FROM content_prompt WHERE content_pack_id = v_pack_id;
    INSERT INTO content_prompt (
        content_pack_id, sort_order, body_text, is_critical, is_mandatory
    )
    SELECT v_pack_id, x.sort_order, x.body_text, x.is_critical, x.is_mandatory
    FROM (VALUES
${promptValues}
    ) AS x(sort_order, body_text, is_critical, is_mandatory);

    IF NOT EXISTS (
        SELECT 1 FROM content_placement
        WHERE content_pack_id = v_pack_id
          AND scope_kind = 'space' AND space_id = v_space_id
    ) THEN
        INSERT INTO content_placement (content_pack_id, scope_kind, space_id)
        VALUES (v_pack_id, 'space', v_space_id);
    END IF;
END
$seed$;

COMMIT;

SELECT t.name AS tenant, s.name AS site, sp.name AS space,
       wt.reference, wt.work_description, wt.status
FROM work_task wt
JOIN tenant t ON t.id = wt.tenant_id
JOIN site s ON s.id = wt.site_id
JOIN space sp ON sp.id = wt.space_id
WHERE t.name = 'Tarmac' AND wt.reference = '098001';
`;
}

const mapHeader = [
  "Area",
  "Seed value",
  "Website field",
  "Website screen",
  "Database table",
  "Database field",
  "Status",
  "Source / notes",
];

const sheets = [
  {
    name: "README",
    freezeRows: 0,
    autoFilter: false,
    headerRow: -1,
    widths: [28, 110],
    rowStyle: (rowIndex) => (rowIndex === 0 ? "title" : "body"),
    rows: [
      ["Sample documents → seed → website → database", ""],
      ["", ""],
      ["Source folder", "docs/sample documents/"],
      ["SQL", "db/seed/sample-job-pack.sql"],
      [
        "This workbook",
        "docs/sample documents/SafeIn5_Sample_Documents_Seed_Map.xlsx",
      ],
      [
        "Pack",
        "Tarmac · Dolyhir · Hot Aggregate Bins · permit 098001 · 13–14 Jun 2026",
      ],
      [
        "Files",
        "HIRA (3 pages), Permit to Work (front/back), Rescue plan (front/back), IMSF 100 pages 1–3 of 4, Contractor clearance (front + filled form)",
      ],
      [
        "Import state",
        "Draft. Emails are placeholders (@seed.safein5.local). Files are JPEG scans, not uploaded PDFs.",
      ],
      ["", ""],
      [
        "SEED_MAP",
        "Every value written by the seed, with the website label and database field.",
      ],
      ["PEOPLE", "Named people from the papers and the role stored per site."],
      ["DOCUMENTS", "Each pack in the folder and how it is stored."],
      [
        "CHECKLIST",
        "IMSF 100 prompts seeded, plus Yes/No/NA answers that cannot be stored yet.",
      ],
      [
        "STILL_NEEDED",
        "Website fields still empty after this seed, or paper fields the schema cannot hold.",
      ],
    ],
  },
  {
    name: "SEED_MAP",
    freezeRows: 1,
    widths: [18, 42, 36, 24, 22, 36, 12, 72],
    rows: [mapHeader, ...seedMap],
  },
  {
    name: "PEOPLE",
    freezeRows: 1,
    widths: [22, 18, 36, 16, 18, 28, 28, 72],
    rows: [
      [
        "Name on paper",
        "Website field",
        "Database field",
        "Site role",
        "Org role",
        "Seed email",
        "Phone",
        "Source",
      ],
      ...people.map((person) => [
        `${person.first} ${person.last}`,
        person.uiName,
        "app_user.first_name + last_name; role.key via user_site_membership.role_id",
        person.siteRole,
        person.orgRole,
        person.email,
        "(not on paper)",
        person.source,
      ]),
    ],
  },
  {
    name: "DOCUMENTS",
    freezeRows: 1,
    widths: [56, 22, 28, 18, 18, 36, 22, 72],
    rows: [
      [
        "Document title (website: Document)",
        "Website type",
        "document.doc_type",
        "revision",
        "paper reference",
        "Belongs to",
        "status",
        "Files in folder",
      ],
      ...documents.map((doc) => [
        doc.title,
        doc.uiType,
        doc.docType,
        doc.revision,
        doc.paperReference ?? "",
        doc.scope === "space" ? "space · Hot Aggregate Bins" : "task · 098001",
        "draft",
        doc.files,
      ]),
    ],
  },
  {
    name: "CHECKLIST",
    freezeRows: 1,
    widths: [10, 88, 12, 12, 14, 48, 36],
    rows: [
      [
        "Check no.",
        "Website: Check text  →  content_prompt.body_text",
        "Critical",
        "Mandatory",
        "Paper answer",
        "Paper comment",
        "Stored in database?",
      ],
      ...checklist.map(([n, text, critical, answer, comment]) => [
        n,
        text,
        critical ? "Yes" : "No",
        "Yes",
        answer,
        comment,
        "Prompt only. Answer is not stored (see STILL_NEEDED).",
      ]),
    ],
  },
  {
    name: "STILL_NEEDED",
    freezeRows: 1,
    widths: [12, 26, 40, 28, 32, 48, 56, 56],
    rowStyle: (rowIndex) => {
      if (rowIndex === 0) return "header";
      const severity = stillNeeded[rowIndex - 1]?.[0];
      return severity === "High" ? "example" : "body";
    },
    rows: [
      [
        "Priority",
        "Why it is missing",
        "Website field",
        "Website screen",
        "Database field",
        "Value on paper / expected",
        "Problem",
        "What to do",
      ],
      ...stillNeeded,
    ],
  },
];

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(sqlPath, sqlBody());
  const result = writeXlsx(xlsxPath, sheets);
  console.log(`Wrote ${sqlPath}`);
  console.log(
    `Wrote ${xlsxPath} (${result.sheets} sheets; ${seedMap.length} mapped; ${stillNeeded.length} still needed; ${checklist.length} checklist prompts)`,
  );
}
