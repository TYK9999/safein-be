import { join, resolve } from "node:path";

import { writeXlsx } from "./lib/xlsx.mjs";
import { checklist, documents, people } from "./generate-sample-job-pack.mjs";

/**
 * Client verification workbook for AI extraction from docs/sample documents/.
 *   node scripts/generate-ai-extraction-client-workbook.mjs
 *
 * Today: JPEG job-pack scans. Extra rows on 06_future_media for PDF / audio / video.
 */

const TAKE5_SYSTEM_PROMPT = `You extract Take 5 checks from workplace safety documents.

Take 5 checks are yes/no questions a worker ticks before starting a task. They are not lessons and not an emergency procedure.

Rules:
- Independent of any named site, plant, tank, road, or client. Do not invent radio channels, phone numbers, hatch names, or muster points.
- Prefer the document's own wording, shortened for a phone.
- Highest priority first: do not enter if avoidable; atmosphere; isolations; permit; rescue arrangements in place; specified risks; competence; remaining controls.
- Skip legislation lists, how-to-write-a-HIRA guidance, attendance registers, signatures, dates, and blank form chrome.
- Skip checks that only describe fixed plant of one asset (installed cameras, fixed detectors, measured hatch size as a named vessel).
- Return JSON only: {"checks":[{"priority":1,"prompt":"..."}]}
- priority is a dense 1-based order. prompt is one yes/no question.
- If there are no worker checks, return {"checks":[]}.`;
const root = resolve(import.meta.dirname, "..");
const output = join(
  root,
  "docs",
  "SafeIn5_AI_Extraction_Client_Verification.xlsx",
);

const TAKE5_PROMPT_PATH = "src/modules/take5/take5.ai.ts · TAKE5_SYSTEM_PROMPT";
const JOB_PACK_PROMPT_PATH =
  "docs/prompts/ai-extraction-job-pack.md · ai-extraction-job-pack";
const ECHO_CLASSIFY_RULE =
  "docs/index.html Echo detail · response type + hazard category (no sample echo media in this pack)";
const STT_RULE =
  "src/modules/stt · AWS Transcribe (audio → transcript). No sample audio in this pack.";

const COST = {
  imagePageUsd: 0.015,
  take5PackUsd: 0.045,
  sttPerMinuteUsd: 0.024,
  videoMinuteUsd: 0.08,
};

const header = (...cells) => cells.map((v) => ({ v, style: "header" }));
const title = (text) => [{ v: text, style: "title" }];
const note = (text) => [{ v: text, style: "note" }];

const sampleFiles = [
  {
    folder: "RAMS",
    file: "HIRA Front Page 1 .jpeg",
    media: "image",
    useCase: "Job-pack fields (RAMS / HIRA)",
    skill: JOB_PACK_PROMPT_PATH,
    output: [
      "kind: risk_assessment (HIRA)",
      "client: Tarmac",
      "site: Dolyhir",
      "space/location: Asphalt plant — Hot bins / Chutes",
      "rams_reference: HOTBINSRA01",
      "ms_sop_number: HOTBINSMS01",
      "work: Asphalt plant - Repairs to Hot bins / Chutes",
      "date_created: 4/11/2025 · review: 4/11/2026",
      "hazards: plant start up; working at heights; hot works; use of power tools",
    ].join("\n"),
    accuracy: "High on printed headers (~95%). Medium on handwritten isolation owner name.",
    confidence: "High",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm site Dolyhir, RA number HOTBINSRA01, MS HOTBINSMS01.",
  },
  {
    folder: "RAMS",
    file: "HIRA Page 2.jpeg",
    media: "image",
    useCase: "Job-pack fields (RAMS continuation)",
    skill: JOB_PACK_PROMPT_PATH,
    output:
      "Continuation page of HIRA. Extra hazard/control rows if present; no new permit number. Treat as same document HOTBINSRA01.",
    accuracy: "High if printed grid; drops if page is mostly handwriting.",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm this page belongs to HOTBINSRA01 and no extra RA number exists.",
  },
  {
    folder: "RAMS",
    file: "HIRA Page 3.jpeg",
    media: "image",
    useCase: "Job-pack fields (RAMS sign-off)",
    skill: JOB_PACK_PROMPT_PATH,
    output:
      "Sign-off / review page. Extract printed names if present. Do not invent emails. HIRA reviewer may include J. A Byrne.",
    accuracy: "Medium — signatures are presence-only; printed names are usable.",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck: "Tick if reviewer names match your copy of page 3.",
  },
  {
    folder: "Permit To Work",
    file: "Permit to Work Front Page .jpeg",
    media: "image",
    useCase: "Job-pack fields (permit)",
    skill: JOB_PACK_PROMPT_PATH,
    output: [
      "kind: permit_to_work",
      "client: Tarmac",
      "task_reference / permit_number: 098001",
      "site (handwriting): read as Dolyhir (low confidence vs lookalike letters)",
      "location: Asphalt Plant Hot Agg Bins",
      "rams_ref on permit: HOTBINSRA01 (handwriting may look like HOTBINGRADI)",
      "work: Repairs in Asphalt plant hot agg bins",
      "company: Brington Engineering",
      "people: J. A Byrne (issuer), T. Hamnett (acceptor), N. Whittle (crew)",
      "permit types ticked: Hot work & grinding; Working at height; Confined space",
      "starts: 13 Jun 2026 06:00 · ends: 14 Jun 2026 18:00 (year handwriting 20 vs 26)",
      "extra instructions: TOPMAN AT ALL TIMES. FIRE EXTINGUISHER AVAILABLE. FIRE WATCHER.",
    ].join("\n"),
    accuracy:
      "Medium (~75–85%). Handwritten site and RA ref are the main error sources.",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck:
      "Confirm permit 098001, dates 13–14 Jun 2026, crew names, and site spelling Dolyhir.",
  },
  {
    folder: "Permit To Work",
    file: "Permit to Work Back Page.jpeg",
    media: "image",
    useCase: "Job-pack fields (permit back / gas tests)",
    skill: JOB_PACK_PROMPT_PATH,
    output:
      "Back page: atmospheric tests, isolations, extra signatures if filled. Front-page gas test block was blank — extract only values that are written.",
    accuracy: "High on empty vs filled; medium on handwritten readings.",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm whether any gas readings were recorded on the back.",
  },
  {
    folder: "Rescue Plan",
    file: "Rescue Plan Front Page.jpeg",
    media: "image",
    useCase: "Job-pack fields (rescue plan)",
    skill: JOB_PACK_PROMPT_PATH,
    output: [
      "kind: rescue_plan",
      "client: Tarmac",
      "space: ASPHALT PLANT HOT AGG BINS",
      "permit_reference: 098001",
      "date of entry: 13.6.26",
      "person in charge: J Byrne",
      "CS trained: YES",
      "communication: Radio (attendant to persons in CS)",
      "rescue method: LIFE LINE / ROPE · hauling: PULLEY · sked/pulley · anchorage: Beam",
      "equipment ticked: pulleys, fire extinguishers, karabiners, lanyards, harnesses, safety lines, portable gas analyser",
      "medical ticked: first aid kit, stretcher (sked), defibrillator",
      "footer: uncontrolled copy printed 24/05/19 11:03",
    ].join("\n"),
    accuracy: "High on printed title and ticks (~90%). Names in block capitals.",
    confidence: "High",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm space name Hot Agg Bins and permit 098001 on the rescue plan.",
  },
  {
    folder: "Rescue Plan",
    file: "Confined Space Rescue Plan Back page.jpeg",
    media: "image",
    useCase: "Job-pack fields (space location)",
    skill: JOB_PACK_PROMPT_PATH,
    output:
      "Back page location notes used for space.location: Asphalt Plant, mixer house level 3 (door / 300 mm side hatch if present). Supervisor J Abrahams if named.",
    accuracy: "Medium — layout sketch + handwriting.",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm mixer house level 3 and hatch notes match the paper.",
  },
  {
    folder: "Confiend Space Check List",
    file: "CS Check List Page 1.jpeg",
    media: "image",
    useCase: "Job Checklist prompts (Upload content)",
    skill: TAKE5_PROMPT_PATH,
    output:
      "IMSF 100 page 1 of 4. Extracts control-measure questions as yes/no checks (avoid entry; reclassify; forced ventilation; specific RA; permit raised; warning sign; secured; fixed gas detectors). Handwritten answers (YES/NO + comments) are stored separately for client review — Take 5 product output is the question list, not the filled YES/NO.",
    accuracy: "Very high on printed questions (~97%). High on block-cap YES/NO.",
    confidence: "High",
    cost: COST.imagePageUsd,
    clientCheck: "See sheet 03_checklist_output rows 1–14.",
  },
  {
    folder: "Confiend Space Check List",
    file: "CS Check List Page 2 .jpeg",
    media: "image",
    useCase: "Job Checklist prompts (Upload content)",
    skill: TAKE5_PROMPT_PATH,
    output:
      "IMSF 100 page 2 of 4. Continues engineered controls / atmosphere / lighting / communication questions. Same Take 5 rule: questions for the phone, skip form chrome.",
    accuracy: "Very high on printed questions.",
    confidence: "High",
    cost: COST.imagePageUsd,
    clientCheck: "See sheet 03_checklist_output middle rows.",
  },
  {
    folder: "Confiend Space Check List",
    file: "CS Check List Page 3 .jpeg",
    media: "image",
    useCase: "Job Checklist prompts (Upload content)",
    skill: TAKE5_PROMPT_PATH,
    output:
      "IMSF 100 page 3 of 4. Remaining checks through competence / PPE / rescue staging. Page 4 was not in the pack — no invented questions.",
    accuracy: "Very high on printed questions. Pack is incomplete (4th page missing).",
    confidence: "High",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm no page 4 was supplied. Do not approve invented page-4 checks.",
  },
  {
    folder: "Contractor Approval",
    file: "Contractor Clearence to work main page.jpeg",
    media: "image",
    useCase: "Job-pack fields (contractor clearance)",
    skill: JOB_PACK_PROMPT_PATH,
    output: [
      "kind: other (contractor clearance)",
      "work: REPAIRS TO HOT AGG BINS ON ASPHALT PLANT",
      "authorisation: 13.6.26–14.6.26",
      "person raising / Task Lead: Jake Marshall · Supervisor",
      "company: Brington Engineering",
      "issued to: T. Hamnett · Engineer",
      "others: N. Whittle",
      "permits required ticks: Working at heights; Confined space",
      "isolation locks: 011, 023, 018, 020",
      "site handwriting: low confidence (do not override Dolyhir from HIRA/permit without client OK)",
    ].join("\n"),
    accuracy:
      "High on names in block capitals. Low on handwritten site (conflicts with HIRA Dolyhir).",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm Jake Marshall as Task Lead and Brington Engineering crew.",
  },
  {
    folder: "Contractor Approval",
    file: "Contract Authorisation Front Page.jpeg",
    media: "image",
    useCase: "Job-pack fields (authorisation cover)",
    skill: JOB_PACK_PROMPT_PATH,
    output:
      "Cover / authorisation front. Same job window and contractor company if repeated. No new emails.",
    accuracy: "Medium — often a cover sheet with few fields.",
    confidence: "Medium",
    cost: COST.imagePageUsd,
    clientCheck: "Confirm this is the same clearance as 13.6.26–14.6.26.",
  },
];

const imageCostTotal =
  Math.round(sampleFiles.reduce((sum, row) => sum + row.cost, 0) * 1000) / 1000;

const useCases = [
  [
    "UC-1",
    "Upload content — Job Checklist / Learn 5",
    "s-content-new",
    "PDF, image, video (MP4/MOV)",
    "POST /take5/extract",
    TAKE5_PROMPT_PATH,
    "Yes — IMSF 100 pages 1–3",
    "Live in backend (Cursor agent). Images need vision or OCR-then-text; current extract() is text/PDF/DOCX, not JPEG until OCR/vision is wired.",
  ],
  [
    "UC-2",
    "Upload document — kind, reference, title",
    "s-doc-new",
    "PDF, Word, image",
    "POST /documents/:id/extract (planned)",
    JOB_PACK_PROMPT_PATH,
    "Yes — all sample folders",
    "Needed. Today kind/reference are typed by the admin.",
  ],
  [
    "UC-3",
    "Job-pack onboarding — client, site, space, people, task",
    "s-setup-* / Excel handoff",
    "Image, PDF (future video stills)",
    "Bulk import + this verification pack",
    JOB_PACK_PROMPT_PATH,
    "Yes — Tarmac / Dolyhir / 098001",
    "Used for MVP Excel seed. Not a public API yet.",
  ],
  [
    "UC-4",
    "Echo title (drafted by AI)",
    "s-echo-*",
    "Photo, video, voice",
    "POST /signals (create) + classify",
    "Echo title prompt (product copy: Drafted by AI — edit before you confirm)",
    "No — pack has no Echo media",
    "Prototype only until echo create sends media to the model.",
  ],
  [
    "UC-5",
    "Echo AI summary",
    "s-echo-*",
    "Transcript from voice/video",
    "POST /take5/extract (reuse) / GET /signals/:id/summary",
    "Summarise the echo in plain language for the supervisor rail",
    "No",
    "Needs STT first for voice/video.",
  ],
  [
    "UC-6",
    "Echo response type (Good practice / Could be a risk / Needs action now)",
    "s-echo-*",
    "Photo, transcript, video still",
    "POST /signals/:id/classify",
    ECHO_CLASSIFY_RULE,
    "No",
    "Human can override; both AI and human choices are kept.",
  ],
  [
    "UC-7",
    "Echo hazard category",
    "s-echo-*",
    "Same as UC-6",
    "POST /signals/:id/classify",
    "Map wording to the 12 seeded hazard_category rows",
    "No",
    "Supervisor can change; trains the taxonomy.",
  ],
  [
    "UC-8",
    "Speech-to-text (not generative)",
    "Echo voice / PULSE",
    "Audio, video soundtrack",
    "POST /stt/jobs",
    STT_RULE,
    "No",
    "AWS Transcribe. Cost is per audio minute, not per token.",
  ],
  [
    "UC-9",
    "Uncover checks from open Echoes",
    "s-attached tab Uncover",
    "Prior Echo text at the space",
    "Derived, not file upload",
    "Turn open Echoes into yes/no Uncover prompts",
    "No files — needs live Echoes",
    "Shown in prototype as editable checks on the task.",
  ],
];

const futureRows = [
  [
    "PDF-01",
    "(drop PDF here)",
    "pdf",
    "UC-1 or UC-2",
    TAKE5_PROMPT_PATH,
    "",
    "",
    "",
    "Pending",
    "",
  ],
  [
    "AUD-01",
    "(drop audio here)",
    "audio",
    "UC-8 then UC-5",
    STT_RULE,
    "",
    "",
    String(COST.sttPerMinuteUsd),
    "Pending",
    "Cost = duration_minutes × $0.024 (Transcribe typical).",
  ],
  [
    "VID-01",
    "(drop video here)",
    "video",
    "UC-1 Learn 5 reel / UC-4 Echo",
    `${TAKE5_PROMPT_PATH} + ${STT_RULE}`,
    "",
    "",
    String(COST.videoMinuteUsd),
    "Pending",
    "Sample stills + audio track. Cost ≈ stills × $0.015 + audio minutes × $0.024, or ~$0.08/min bundled.",
  ],
];

const sheets = [
  {
    name: "00_README",
    headerRow: 0,
    autoFilter: false,
    freezeRows: 0,
    widths: [28, 90],
    rows: [
      title("SafeIn5 — AI extraction client verification"),
      [],
      ["Pack", "docs/sample documents/ · Tarmac · Dolyhir · permit 098001"],
      ["Purpose", "Show every place SafeIn5 uses AI to read a file, what came out of this sample pack, and let you mark each row Correct / Wrong / Partial."],
      ["How to review", "1) Read 01_AI_use_cases. 2) Work through 02_extraction_log and 04_structured_fields. 3) Tick Client verdict. 4) Use 03_checklist_output for the 56 IMSF questions. 5) Cost/accuracy is on 05_cost_accuracy."],
      ["Do not invent", "Emails, phone numbers, and IMSF page 4 were not on the papers and must stay blank."],
      ["Today's media", "JPEG photographs only. Add PDF / audio / video on sheet 06_future_media — same columns."],
      ["Regenerate", "node scripts/generate-ai-extraction-client-workbook.mjs"],
      [],
      note("Yellow cells on other sheets are for your verdict. Green = extracted from the scan. Red = known gap or conflict."),
    ],
  },
  {
    name: "01_AI_use_cases",
    freezeRows: 1,
    widths: [10, 42, 22, 28, 36, 48, 28, 56],
    rows: [
      header(
        "ID",
        "Where AI is used",
        "MVP screen",
        "Input types",
        "API / pipeline",
        "Prompt / skill / rule",
        "In this sample pack?",
        "Status vs product",
      ),
      ...useCases,
    ],
  },
  {
    name: "02_extraction_log",
    freezeRows: 1,
    widths: [8, 22, 28, 42, 12, 36, 40, 56, 12, 12, 14, 40, 16, 36],
    rows: [
      header(
        "Run",
        "Folder",
        "File name",
        "Use case",
        "Media",
        "Skill / rule",
        "Prompt id",
        "AI output (for your check)",
        "Est. accuracy",
        "Est. USD",
        "Confidence",
        "What we need you to confirm",
        "Client verdict (Yes / No / Partial)",
        "Client comments",
      ),
      ...sampleFiles.map((row, index) => [
        `R${String(index + 1).padStart(2, "0")}`,
        row.folder,
        row.file,
        row.useCase,
        row.media,
        row.skill,
        row.skill.includes("take5") ? "TAKE5_SYSTEM_PROMPT" : "ai-extraction-job-pack",
        { v: row.output, style: "extracted" },
        row.accuracy,
        row.cost,
        row.confidence,
        row.clientCheck,
        { v: "", style: "example" },
        { v: "", style: "example" },
      ]),
    ],
  },
  {
    name: "03_checklist_output",
    freezeRows: 1,
    widths: [8, 28, 72, 14, 28, 16, 36],
    rows: [
      header(
        "#",
        "Source file(s)",
        "Extracted check (worker prompt)",
        "Critical on paper?",
        "Handwritten Yes/No/NA on scan",
        "Client verdict",
        "Client comments",
      ),
      ...checklist.map((row, index) => {
        const page =
          index < 14
            ? "CS Check List Page 1.jpeg"
            : index < 35
              ? "CS Check List Page 2 .jpeg"
              : "CS Check List Page 3 .jpeg";
        return [
          row[0],
          page,
          { v: row[1], style: "extracted" },
          row[2] ? "Yes" : "No",
          { v: [row[3], row[4]].filter(Boolean).join(" — "), style: "extracted" },
          { v: "", style: "example" },
          { v: "", style: "example" },
        ];
      }),
      [
        "",
        "(not supplied)",
        { v: "IMSF 100 page 4 of 4 — not in pack. No checks invented.", style: "missing_required" },
        "",
        "",
        { v: "", style: "example" },
        { v: "", style: "example" },
      ],
    ],
  },
  {
    name: "04_structured_fields",
    freezeRows: 1,
    widths: [22, 28, 36, 28, 22, 16, 36],
    rows: [
      header(
        "SafeIn5 field",
        "Value extracted",
        "Source file",
        "Conflicts / notes",
        "Expected accuracy",
        "Client verdict",
        "Client comments",
      ),
      [
        "Client name",
        { v: "Tarmac", style: "extracted" },
        "All scans (logo)",
        "None",
        "Very high",
        { v: "", style: "example" },
        "",
      ],
      [
        "Site name",
        { v: "Dolyhir", style: "extracted" },
        "HIRA Front Page 1 .jpeg",
        "Permit handwriting may look like another spelling; contractor form site is unclear. HIRA print is the source of truth unless you say otherwise.",
        "High (printed) / Low (other pages)",
        { v: "", style: "example" },
        "",
      ],
      [
        "Space name",
        { v: "Hot Aggregate Bins", style: "extracted" },
        "Rescue Plan Front Page.jpeg",
        "Permit says Asphalt Plant Hot Agg Bins — same place.",
        "High",
        { v: "", style: "example" },
        "",
      ],
      [
        "Space location",
        { v: "Asphalt Plant, mixer house level 3", style: "extracted" },
        "Confined Space Rescue Plan Back page.jpeg",
        "Confirm hatch / door wording.",
        "Medium",
        { v: "", style: "example" },
        "",
      ],
      [
        "Task / permit number",
        { v: "098001", style: "extracted" },
        "Permit to Work Front Page .jpeg · Rescue Plan",
        "Printed in red on permit. High confidence.",
        "Very high",
        { v: "", style: "example" },
        "",
      ],
      [
        "RAMS reference",
        { v: "HOTBINSRA01", style: "extracted" },
        "HIRA Front Page 1 .jpeg",
        "Permit handwriting of RA ref is weaker — prefer HIRA print.",
        "High",
        { v: "", style: "example" },
        "",
      ],
      [
        "MS/SOP number",
        { v: "HOTBINSMS01", style: "extracted" },
        "HIRA Front Page 1 .jpeg",
        "None",
        "High",
        { v: "", style: "example" },
        "",
      ],
      [
        "What is the work",
        { v: "Repairs in Asphalt Plant Hot Agg Bins", style: "extracted" },
        "Permit front · Contractor clearance",
        "HIRA wording: Repairs to Hot bins / Chutes. Same job.",
        "High",
        { v: "", style: "example" },
        "",
      ],
      [
        "Starts / runs",
        { v: "13 Jun 2026 06:00 · 2 days (to 14 Jun 18:00)", style: "extracted" },
        "Permit front · Contractor clearance",
        "Year digits 20 vs 26 on permit. Clearance shows 13.6.26–14.6.26.",
        "Medium",
        { v: "", style: "example" },
        "",
      ],
      [
        "Task Lead",
        { v: "Jake Marshall", style: "extracted" },
        "Contractor Clearence to work main page.jpeg",
        "Person raising authorisation / Supervisor.",
        "High",
        { v: "", style: "example" },
        "",
      ],
      ...people.map((person) => [
        "Person",
        {
          v: `${person.first} ${person.last} · ${person.siteRole.replaceAll("_", " ")}`,
          style: "extracted",
        },
        person.source,
        "Email blank on purpose — not on paper.",
        "High on printed/block-cap names",
        { v: "", style: "example" },
        "",
      ]),
      ...documents.map((doc) => [
        "Document",
        {
          v: `${doc.title} · ${doc.paperReference}`,
          style: "extracted",
        },
        doc.files.split(";")[0].trim(),
        doc.uiType,
        "High on titles; medium on handwritten refs",
        { v: "", style: "example" },
        "",
      ]),
    ],
  },
  {
    name: "05_cost_accuracy",
    freezeRows: 1,
    autoFilter: false,
    widths: [36, 22, 56],
    rows: [
      title("Cost and accuracy for this sample pack"),
      [],
      header("Item", "Figure", "How we estimated it"),
      [
        "Pages in this pack (JPEG)",
        sampleFiles.length,
        "Each photographed page is one vision call.",
      ],
      [
        "Est. cost — vision read (this pack)",
        `$${imageCostTotal.toFixed(3)}`,
        `≈ $${COST.imagePageUsd} per page using a GPT-4o-class vision model (high-detail still). Gemini Flash-class can be 5–10× cheaper.`,
      ],
      [
        "Est. cost — Take 5 JSON on IMSF 100",
        `$${COST.take5PackUsd.toFixed(3)}`,
        "Text tokens after OCR, TAKE5_SYSTEM_PROMPT, ~56 checks out.",
      ],
      [
        "Est. total this pack",
        `$${(imageCostTotal + COST.take5PackUsd).toFixed(3)}`,
        "One verification pass. Re-runs cost the same again.",
      ],
      [
        "Audio (when you send it)",
        `$${COST.sttPerMinuteUsd}/minute`,
        "AWS Transcribe typical list price. Then a small LLM call for summary/classify.",
      ],
      [
        "Video (when you send it)",
        `≈ $${COST.videoMinuteUsd}/minute`,
        "Sample 1 still every 3–5s for Learn 5 / Echo photo-path, plus soundtrack STT.",
      ],
      [],
      header("Accuracy band", "When", "What to expect"),
      [
        "Very high (95%+)",
        "Printed IMSF questions, printed HIRA headers, red permit number",
        "Approve unless a word is truncated at the photo edge.",
      ],
      [
        "High (85–95%)",
        "Block-capital names (Hamnett, Whittle, Marshall)",
        "Spot-check spelling against the paper.",
      ],
      [
        "Medium (70–85%)",
        "Permit handwriting (site, RA ref, year 20/26)",
        "Must be confirmed. We prefer HIRA print when they disagree.",
      ],
      [
        "Low / do not use",
        "Emails, phones, IMSF page 4, contractor site scribble vs Dolyhir",
        "Left blank or flagged. Do not load to SafeIn5 until you edit.",
      ],
      [],
      note(
        "Accuracy here is an engineering estimate from this pack, not a lab score. Your Yes/No/Partial ticks on sheets 02–04 are the official result.",
      ),
    ],
  },
  {
    name: "06_future_media",
    freezeRows: 1,
    widths: [12, 36, 12, 22, 40, 48, 14, 12, 14, 40],
    rows: [
      header(
        "ID",
        "File name",
        "Media",
        "Use case",
        "Skill / rule",
        "AI output",
        "Est. USD",
        "Accuracy",
        "Client verdict",
        "Client comments",
      ),
      ...futureRows.map((row) => [
        row[0],
        { v: row[1], style: "example" },
        row[2],
        row[3],
        row[4],
        { v: row[5], style: "example" },
        row[6],
        row[7],
        { v: row[8], style: "example" },
        { v: row[9], style: "note" },
      ]),
    ],
  },
  {
    name: "07_prompts",
    freezeRows: 1,
    autoFilter: false,
    widths: [28, 100],
    rows: [
      title("Prompts / skills used in this pack"),
      [],
      ["Id", "TAKE5_SYSTEM_PROMPT"],
      ["File", TAKE5_PROMPT_PATH],
      ["Used for", "UC-1 Upload content — Job Checklist / Learn 5"],
      ["Prompt", TAKE5_SYSTEM_PROMPT],
      [],
      ["Id", "ai-extraction-job-pack"],
      ["File", JOB_PACK_PROMPT_PATH],
      ["Used for", "UC-2 document metadata · UC-3 job-pack fields"],
      [
        "Prompt",
        "See docs/prompts/ai-extraction-job-pack.md — extract only visible fields; JSON schema for client, site, space, permit, people, dates; never invent emails.",
      ],
      [],
      ["Id", "echo-classify"],
      ["File", ECHO_CLASSIFY_RULE],
      ["Used for", "UC-4 to UC-7"],
      [
        "Prompt",
        "Not run on this pack (no Echo photo/voice/video). When media arrives: draft title, 2-sentence summary, one of good_practice | be_aware | needs_attention_now, and one of the 12 hazard categories. Keep the worker's choice if they disagree.",
      ],
      [],
      ["Id", "stt-transcribe"],
      ["File", STT_RULE],
      ["Used for", "UC-8"],
      ["Prompt", "Not an LLM prompt. Speech-to-text job on the audio track; transcript then feeds UC-5/UC-6."],
    ],
  },
];

writeXlsx(output, sheets);
console.log(`Wrote ${output}`);
console.log(`Extraction rows: ${sampleFiles.length}`);
console.log(`Checklist prompts: ${checklist.length}`);
console.log(`Est. pack cost: $${(imageCostTotal + COST.take5PackUsd).toFixed(3)}`);
