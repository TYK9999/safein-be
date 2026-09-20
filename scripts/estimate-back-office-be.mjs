import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { readOpcZip, writeOpcZip } from "./lib/xlsx.mjs";

const HOURS_PER_DAY = 9;
const SOURCE = join(import.meta.dirname, "..", "docs", "SafeIn5 Core (2).xlsx");
const OUTPUT = join(
  import.meta.dirname,
  "..",
  "docs",
  "SafeIn5 Core (2) BE Estimation.xlsx",
);
const SHEET_NAME = "Back Office App (2)";

/**
 * Per-row BE APIs + Cursor-assisted estimate (days @ 9h).
 * Row 1 = headers, row 2 = totals (filled after summing).
 * Base map keyed for SafeIn5 Core (1) rows 3–90.
 */
const BASE_ROW_BE = {
  3: {
    apis: "POST /import/:resource/commit (no validation)",
    summary: "Save a spreadsheet of people, sites or documents into the system without checking for mistakes first.",
    days: 0.5,
  },
  4: {
    apis: "POST /import/:resource/validate (error counts) · POST /import/:resource/commit",
    summary: "Check a spreadsheet and tell you how many rows failed, then save the good rows.",
    days: 1,
  },
  5: {
    apis: "POST /import/:resource/validate (row/cell errors) · GET /import/:id/errors",
    summary: "Check a spreadsheet and point to the exact cell that is wrong, so someone can fix it and try again.",
    days: 1.25,
  },
  6: {
    apis: "— (onboarding stepper UI)",
    summary: "No extra server work — this is the on-screen step-by-step setup wizard only.",
    days: 0,
  },
  7: {
    apis: "POST /tenants · GET /tenants/:id",
    summary: "Create a new client (company) and show their details after they are added.",
    days: 0.75,
  },
  8: {
    apis: "POST /users/invite · POST /users",
    summary: "Invite one person by email so they can log in and join the client.",
    days: 0.5,
  },
  9: {
    apis: "POST /users/invite (batch body) · POST /users",
    summary: "Invite several people at once in the same form.",
    days: 0.75,
  },
  10: {
    apis: "GET /import/templates/people · POST /import/people/validate · POST /import/people/commit",
    summary: "Download a people spreadsheet template, check the filled file, then add everyone in one go.",
    days: 1.25,
  },
  11: {
    apis: "POST /documents/presign · POST /documents · GET /documents/kinds",
    summary: "Upload one safety document (PDF, Word or photo) and record what type it is (RAMS, permit, and so on).",
    days: 0.75,
  },
  12: {
    apis: "GET /import/templates/documents · POST /import/documents/validate · POST /import/documents/commit",
    summary: "Download a document list template, check it, then register many documents together.",
    days: 1.25,
  },
  13: {
    apis: "POST /content-packs/presign · POST /content-packs (onboarding step)",
    summary: "Add Job Checklist or Learn 5 training content during first-time setup.",
    days: 0.5,
  },
  14: {
    apis: "POST /sites · GET /users?role=site_manager",
    summary: "Add one site and pick who the site manager is.",
    days: 0.5,
  },
  15: {
    apis: "GET /import/templates/sites · POST /import/sites/validate · POST /import/sites/commit",
    summary: "Download a sites spreadsheet template, check it, then add many sites at once.",
    days: 1.25,
  },
  16: {
    apis: "POST /spaces · GET /spaces",
    summary: "Add a work area (space) on a site, such as a plant room or confined space.",
    days: 0.5,
  },
  17: {
    apis: "POST /work-tasks · GET /work-tasks/templates · PATCH /work-tasks/:id/crew",
    summary: "Create a job/permit, optionally from an existing job, and name who is on the crew.",
    days: 1,
  },
  18: {
    apis: "GET /onboarding/review · POST /onboarding/complete",
    summary: "Show a recap of everything entered in setup, then mark onboarding as finished.",
    days: 0.25,
  },
  19: {
    apis: "POST /tenants · GET /tenants/:id (reuse onboarding)",
    summary: "Add a client from the main Clients screen (same as the setup wizard).",
    days: 0.5,
  },
  20: {
    apis: "GET /dashboard/summary · GET /tenants/:id/stats",
    summary: "Show headline numbers for a client: live sites, this week’s echoes, and content in the library.",
    days: 0.5,
  },
  21: {
    apis: "GET /tenants?page=&limit=",
    summary: "Show a page-by-page list of all clients.",
    days: 0.5,
  },
  22: {
    apis: "GET /tenants/:id (summary strip)",
    summary: "Show the client name and key facts at the top of the client page.",
    days: 0.25,
    skipF: true,
  },
  23: {
    apis: "PATCH /tenants/:id (status active|inactive)",
    summary: "Switch a client between Active and Inactive.",
    days: 0.25,
  },
  24: {
    apis: "POST /tenants/:id/admins · POST /users/invite",
    summary: "Invite a client administrator who can manage that company in the back office.",
    days: 0.5,
  },
  25: {
    apis: "GET /tenants/:id/stats",
    summary: "Show count boxes (sites, people, documents) on the client page.",
    days: 0.25,
  },
  26: {
    apis: "GET /tenants/:id/sites · GET /tenants/:id/back-office-accounts",
    summary: "List this client’s sites and who has back-office login for them.",
    days: 0.5,
  },
  27: {
    apis: "GET /tenants/:id/retention · PATCH /tenants/:id/retention",
    summary: "View and change how long records and photos are kept for this client.",
    days: 0.5,
  },
  28: {
    apis: "POST /tenants/:id/privacy-requests",
    summary: "Raise a privacy / data request for a client so it can be handled and tracked.",
    days: 0.5,
  },
  29: {
    apis: "POST /documents/presign · POST /documents · GET /documents/kinds",
    summary: "Upload a document for this client and choose what kind of document it is.",
    days: 0.75,
  },
  30: {
    apis: "GET /import/templates/documents · POST /import/documents/validate · POST /import/documents/commit",
    summary: "Bulk-load many documents from a spreadsheet, after checking the file.",
    days: 1.25,
  },
  31: {
    apis: "GET /documents?page=&clientId=",
    summary: "Show a page-by-page list of all documents, filtered by client if needed.",
    days: 0.5,
  },
  32: {
    apis: "DELETE /documents/:id",
    summary: "Remove a document from the library.",
    days: 0.25,
  },
  33: {
    apis: "GET /documents/:id · GET /documents/:id/placements · GET /documents/:id/preview",
    summary: "Open a document, see where it is attached (site, space or job), and preview the file.",
    days: 0.5,
  },
  34: {
    apis: "POST /documents/:id/revisions · PATCH /documents/:id/publish",
    summary: "Replace the file with a new version and publish it after approval.",
    days: 0.75,
  },
  35: {
    apis: "POST /content-packs/presign · POST /content-packs · POST /take5/extract · POST /content-packs/:id/prompts",
    summary: "Upload a Job Checklist or Learn 5 file; AI reads it and turns it into checks the worker will tick.",
    days: 1.25,
  },
  36: {
    apis: "GET /content-packs/:id/prompts · PATCH /content-packs/:id/prompts · DELETE /content-packs/:id/prompts/:promptId",
    summary: "Edit, add or remove the AI-generated checklist questions before publishing.",
    days: 0.75,
  },
  37: {
    apis: "GET /content-packs?kind=job_checklist|learn5&page=",
    summary: "Show a list of Job Checklists and Learn 5 packs, with paging.",
    days: 0.5,
  },
  38: {
    apis: "DELETE /content-packs/:id",
    summary: "Delete a Job Checklist or Learn 5 pack from the library.",
    days: 0.25,
  },
  39: {
    apis: "PATCH /content-packs/:id · POST /content-packs/:id/republish",
    summary: "Change a pack and publish a new version for jobs that attach it from now on.",
    days: 0.75,
  },
  40: {
    apis: "GET /content-packs/:id · GET /content-packs/:id/assets",
    summary: "Open a pack and list the files and checks inside it.",
    days: 0.25,
  },
  41: {
    apis: "POST /sites · GET /users?role=supervisor",
    summary: "Add a site and choose a supervisor as site manager.",
    days: 0.5,
  },
  42: {
    apis: "GET /import/templates/sites · POST /import/sites/validate · POST /import/sites/commit",
    summary: "Add many sites from a spreadsheet after checking the file.",
    days: 1,
  },
  43: {
    apis: "GET /sites?page=",
    summary: "Show a page-by-page list of sites.",
    days: 0.5,
  },
  44: {
    apis: "GET /sites/:id · PATCH /sites/:id/approve",
    summary: "Open a site and approve it so it can be used for jobs.",
    days: 0.5,
  },
  45: {
    apis: "GET /sites/:id/members · GET /users?siteId=",
    summary: "Show who belongs to a site, with filters.",
    days: 0.5,
  },
  46: {
    apis: "POST /spaces",
    summary: "Add a new space (work area) on a site.",
    days: 0.5,
  },
  47: {
    apis: "GET /spaces/:id/qr",
    summary: "Create the QR code for a space so workers can scan it on site.",
    days: 0.25,
  },
  48: {
    apis: "GET /spaces/:id",
    summary: "Show the space name, location and QR summary.",
    days: 0.25,
  },
  49: {
    apis: "PATCH /spaces/:id/placements · POST /document-placements",
    summary: "Attach a document or rescue plan to this space.",
    days: 0.5,
  },
  50: {
    apis: "PATCH /spaces/:id/placements/:placementId",
    summary: "Change which document is attached to the space.",
    days: 0.25,
  },
  51: {
    apis: "GET /spaces/:id/tasks",
    summary: "List the live jobs currently using this space.",
    days: 0.25,
  },
  52: {
    apis: "POST /work-tasks · PATCH /work-tasks/:id/crew",
    summary: "Create a job/permit with RAMS, permit details, space and crew.",
    days: 1,
  },
  53: {
    apis: "POST /work-tasks/:id/duplicate · GET /work-tasks/templates",
    summary: "Start a new job by copying an existing one (template).",
    days: 0.75,
  },
  54: {
    apis: "GET /work-tasks?page=&siteId=&status=",
    summary: "Show a page-by-page list of jobs, filterable by site and status.",
    days: 0.5,
  },
  55: {
    apis: "GET /work-tasks/templates",
    summary: "Show saved job templates that can be copied.",
    days: 0.25,
  },
  56: {
    apis: "GET /work-tasks/:id/export?format=pdf|csv",
    summary: "Download a job as a PDF or spreadsheet for records or sharing.",
    days: 0.75,
  },
  57: {
    apis: "POST /work-tasks/:id/duplicate",
    summary: "Duplicate this job to create a new one.",
    days: 0.5,
  },
  58: {
    apis: "GET /work-tasks/:id",
    summary: "Show the job title and key facts under the page heading.",
    days: 0.25,
  },
  59: {
    apis: "GET /work-tasks/:id/summary",
    summary: "Show the job summary boxes (dates, space, lead, permit).",
    days: 0.25,
  },
  60: {
    apis: "PATCH /work-tasks/:id/placements · GET /work-tasks/:id/signals",
    summary: "Attach papers to the job and list echoes already raised on it.",
    days: 0.75,
  },
  61: {
    apis: "GET /work-tasks/:id · PATCH /work-tasks/:id/content-placements",
    summary: "View the job and change attached checklists, Learn 5, documents, Uncover and Shift.",
    days: 0.5,
  },
  62: {
    apis: "GET /work-tasks/:id/signals",
    summary: "List every echo raised against this job.",
    days: 0.25,
  },
  63: {
    apis: "GET /signals?kind=observation|work_task&page=",
    summary: "Show the echo queue, split into Observation echoes and Work Task echoes.",
    days: 1,
  },
  64: {
    apis: "GET /signals/:id · GET /signals/:id/history · POST /signals/:id/assign",
    summary: "Open an echo, see its history, and assign it to a supervisor.",
    days: 0.75,
  },
  65: {
    apis: "POST /signals/:id/classify · POST /take5/extract (reuse)",
    summary: "AI reads the echo and suggests whether it is good practice, a risk, or needs action now.",
    days: 1,
  },
  66: {
    apis: "Reuse work-task APIs (tenant-scoped client admin)",
    summary: "Client admin uses the same job screens, but only for their own company.",
    days: 0.25,
  },
  67: {
    apis: "Reuse site APIs (tenant-scoped client admin)",
    summary: "Client admin uses the same site screens, but only for their own company.",
    days: 0.25,
  },
  68: {
    apis: "Reuse signal APIs (tenant-scoped client admin)",
    summary: "Client admin uses the same echo screens, but only for their own company.",
    days: 0.25,
  },
  69: {
    apis: "POST /users/invite · POST /users · POST /auth/otp/request · POST /auth/otp/verify",
    summary: "Add a worker, supervisor or site manager and send them a login link.",
    days: 0.75,
  },
  70: {
    apis: "GET /users?page=&siteId=&role=",
    summary: "Show a table of all people, filterable by site and role.",
    days: 0.5,
  },
  71: {
    apis: "GET /users/:id · GET /users/:id/roles · PATCH /users/:id/back-office-access",
    summary: "Open a person and set whether they can use the back office and what they may do.",
    days: 0.75,
  },
  72: {
    apis: "Reuse document APIs (tenant-scoped client admin)",
    summary: "Client admin manages documents the same way as SafeIn5 admin, for their company only.",
    days: 0.25,
  },
  73: {
    apis: "Reuse content-pack APIs (tenant-scoped client admin)",
    summary: "Client admin manages checklists and Learn 5 the same way, for their company only.",
    days: 0.25,
  },
  74: {
    apis: "GET /signals?scope=supervisor · GET /signals/:id",
    summary: "Supervisor sees echoes they are responsible for (not the whole company unless allowed).",
    days: 0.75,
  },
  75: {
    apis: "POST /signals/:id/classify (reuse)",
    summary: "Same AI suggestion on what kind of echo it is (already built for admin).",
    days: 0.25,
  },
  76: {
    apis: "GET /signals/history",
    summary: "Show the full history of an echo: who raised it, who acknowledged it, and when.",
    days: 0.5,
  },
  77: {
    apis: "POST /signals/:id/acknowledge · POST /signals/:id/share",
    summary: "Let a supervisor acknowledge an echo and share it with others.",
    days: 0.5,
  },
  78: {
    apis: "GET /work-tasks (supervisor scope)",
    summary: "Supervisor sees the job list for sites they cover.",
    days: 0.25,
  },
  79: {
    apis: "GET /work-tasks/:id/export?format=pdf|csv (reuse)",
    summary: "Supervisor can download a job summary as PDF or spreadsheet.",
    days: 0.5,
  },
  80: {
    apis: "PATCH /work-tasks/:id/placements · PATCH /work-tasks/:id/content-placements",
    summary: "Supervisor attaches checklists, Learn 5, documents, Uncover and Shift to a job.",
    days: 0.5,
  },
  81: {
    apis: "GET /work-tasks/:id/signals",
    summary: "Supervisor sees echoes raised on that job.",
    days: 0.25,
  },
  82: {
    apis: "GET /sites (supervisor scope)",
    summary: "Supervisor sees the sites they are assigned to.",
    days: 0.25,
  },
  83: {
    apis: "GET /sites/:id/overview · GET /sites/:id/tasks · GET /sites/:id/spaces",
    summary: "Site page showing live jobs, spaces and people at a glance.",
    days: 0.5,
  },
  84: {
    apis: "GET /sites/:id/members",
    summary: "People tab: everyone assigned to this site.",
    days: 0.25,
  },
  85: {
    apis: "POST /spaces · GET /spaces · GET /spaces/:id/qr",
    summary: "Supervisor can add a space and print or show its QR code.",
    days: 0.5,
  },
  86: {
    apis: "GET /content-packs?published=true (read-only)",
    summary: "Supervisor can view published checklists and Learn 5, but cannot edit or delete them.",
    days: 0.25,
  },
  87: {
    apis: "POST /support/change-requests · SES email",
    summary: "Send a change request to SafeIn5 admin by email from the back office.",
    days: 0.5,
  },
  88: {
    apis: "GET /content-packs/:id/placements",
    summary: "Show every space and client where this checklist or Learn 5 is in use.",
    days: 0.5,
  },
  89: {
    apis: "GET /documents (read-only, no edit/delete)",
    summary: "Supervisor can browse documents but cannot change or delete them.",
    days: 0.25,
  },
  90: {
    apis: "GET /documents/:id · GET /documents/:id/placements · GET /documents/:id/preview",
    summary: "Open a document, see which sites it is attached to, and preview the file.",
    days: 0.25,
  },
};

/** SafeIn5 Core (2) adds login rows and expands Echo / role flows (98 data rows). */
function buildCore2RowBe() {
  /** @type {Record<number, { apis: string, summary: string, days: number, skipF?: boolean }>} */
  const rowBe = {
    3: {
      apis: "POST /auth/login · POST /auth/logout",
      summary: "Sign in with email and password, and sign out securely.",
      days: 0.5,
    },
    4: {
      apis: "POST /auth/refresh · httpOnly session cookie",
      summary: "Keep the user signed in between visits without entering their password every time.",
      days: 0.25,
    },
  };

  for (const [row, spec] of Object.entries(BASE_ROW_BE)) {
    const core2Row = Number(row) + 2;
    if (core2Row <= 63) {
      rowBe[core2Row] = { ...spec };
    }
  }

  Object.assign(rowBe, {
    64: {
      apis: "GET /dashboard/echo-summary",
      summary: "Show headline echo counts on the echoes home screen.",
      days: 0.25,
    },
    65: {
      apis: "GET /signals?siteId=&kind=&status=&page=",
      summary: "Filter the echo queue by site, type and status.",
      days: 0.75,
    },
    66: {
      apis: "GET /signals?kind=work_task&page=",
      summary: "List echoes raised from work tasks.",
      days: 0.5,
    },
    67: {
      apis: "GET /signals?kind=observation&page=",
      summary: "List observation echoes raised by workers.",
      days: 0.5,
    },
    68: {
      apis: "PATCH /signals/:id · GET /hazard-categories",
      summary: "Edit an echo title and pick its hazard category.",
      days: 0.25,
    },
    69: {
      apis: "POST /take5/extract · GET /signals/:id/summary",
      summary: "AI writes a short plain-language summary of what the echo is about.",
      days: 0.75,
    },
    70: {
      apis: "POST /signals/:id/assign · POST /signals/:id/acknowledge",
      summary: "Confirm an echo and assign it to the right supervisor.",
      days: 0.75,
    },
    71: {
      apis: "GET /signals/:id/attachments · GET /media/:id/preview",
      summary: "Show photos or files attached to the echo and preview them.",
      days: 0.5,
    },
    72: {
      apis: "POST /signals/:id/classify · PATCH /signals/:id/response-type",
      summary: "AI suggests the response type; a supervisor can change it before saving.",
      days: 0.75,
    },
    73: {
      apis: "GET /signals/:id/history",
      summary: "Show the full history of who raised, acknowledged and updated the echo.",
      days: 0.5,
    },
    74: {
      apis: "Reuse onboarding APIs (tenant-scoped)",
      summary: "Client admin runs the same setup wizard, limited to their own company.",
      days: 0.25,
    },
    75: {
      apis: "POST /users/invite · POST /users",
      summary: "Add a worker, supervisor or site manager and send them a login link.",
      days: 0.75,
    },
    76: {
      apis: "GET /import/templates/people · POST /import/people/validate · POST /import/people/commit",
      summary: "Download a people spreadsheet, check it, then add many people at once.",
      days: 1.25,
    },
    77: {
      apis: "GET /users?page=&siteId=&role=",
      summary: "Show a table of all people, filterable by site and role.",
      days: 0.5,
    },
    78: {
      apis: "GET /users/:id · GET /users/:id/roles · PATCH /users/:id/back-office-access",
      summary: "Open a person and set whether they can use the back office and what they may do.",
      days: 0.75,
    },
    79: {
      apis: "PATCH /users/:id/suspend",
      summary: "Temporarily block someone from signing in without deleting their record.",
      days: 0.25,
    },
    80: {
      apis: "Reuse document APIs (tenant-scoped client admin)",
      summary: "Client admin manages documents the same way as SafeIn5 admin, for their company only.",
      days: 0.25,
    },
    81: {
      apis: "Reuse content-pack APIs (tenant-scoped client admin)",
      summary: "Client admin manages checklists and Learn 5 for their company only.",
      days: 0.25,
    },
    82: {
      apis: "Reuse work-task APIs (tenant-scoped client admin)",
      summary: "Client admin uses the same job screens, but only for their own company.",
      days: 0.25,
    },
    83: {
      apis: "Reuse site APIs (tenant-scoped client admin)",
      summary: "Client admin uses the same site screens, but only for their own company.",
      days: 0.25,
    },
    84: {
      apis: "Reuse signal APIs (tenant-scoped client admin)",
      summary: "Client admin uses the same echo screens, but only for their own company.",
      days: 0.25,
    },
    85: {
      apis: "GET /signals?scope=supervisor · POST /signals/:id/escalate · POST /signals/:id/leave",
      summary: "Supervisor handles echoes on their sites — leave a note or escalate to the site manager.",
      days: 1.5,
    },
    86: {
      apis: "GET /work-tasks (supervisor scope)",
      summary: "Supervisor sees the job list for sites they cover.",
      days: 0.25,
    },
    87: {
      apis: "GET /work-tasks/:id/export?format=pdf|csv",
      summary: "Supervisor can download a job summary as PDF or spreadsheet.",
      days: 0.5,
    },
    88: {
      apis: "PATCH /work-tasks/:id/placements · PATCH /work-tasks/:id/content-placements",
      summary: "Supervisor attaches checklists, Learn 5, documents, Uncover and Shift to a job.",
      days: 0.5,
    },
    89: {
      apis: "GET /work-tasks/:id/signals",
      summary: "Supervisor sees echoes raised on that job.",
      days: 0.25,
    },
    90: {
      apis: "GET /sites (supervisor scope)",
      summary: "Supervisor sees the sites they are assigned to.",
      days: 0.25,
    },
    91: {
      apis: "GET /sites/:id/overview · GET /sites/:id/tasks · GET /sites/:id/spaces",
      summary: "Site page showing live jobs, spaces and people at a glance.",
      days: 0.5,
    },
    92: {
      apis: "GET /sites/:id/members",
      summary: "People tab: everyone assigned to this site.",
      days: 0.25,
    },
    93: {
      apis: "POST /spaces · GET /spaces · GET /spaces/:id/qr",
      summary: "Supervisor can add a space and print or show its QR code.",
      days: 0.5,
    },
    94: {
      apis: "GET /content-packs?published=true (read-only)",
      summary: "Supervisor can view published checklists and Learn 5, but cannot edit or delete them.",
      days: 0.25,
    },
    95: {
      apis: "POST /support/change-requests · SES email",
      summary: "Send a change request to SafeIn5 admin by email from the back office.",
      days: 0.5,
    },
    96: {
      apis: "GET /content-packs/:id/placements",
      summary: "Show every space and client where this checklist or Learn 5 is in use.",
      days: 0.5,
    },
    97: {
      apis: "GET /documents (read-only, no edit/delete)",
      summary: "Supervisor can browse documents but cannot change or delete them.",
      days: 0.25,
    },
    98: {
      apis: "GET /documents/:id · GET /documents/:id/placements · GET /documents/:id/preview",
      summary: "Open a document, see which sites it is attached to, and preview the file.",
      days: 0.25,
    },
  });

  return rowBe;
}

const ROW_BE = buildCore2RowBe();

function beDaysValue(spec) {
  if (spec.skipF) return undefined;
  return spec.days ?? "";
}

function beHoursValue(days) {
  if (days === "" || days === null || days === undefined) return "";
  return Math.round(days * HOURS_PER_DAY * 10) / 10;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>[\s\S]*?<\/si>/g)].map((si) =>
    [...si[0].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join(""),
  );
}

function getCellValue(cellXml, shared) {
  const t = cellXml.match(/t="([^"]+)"/)?.[1];
  const v = cellXml.match(/<v>([^<]*)<\/v>/)?.[1] ?? "";
  if (t === "s") return shared[Number(v)] ?? "";
  if (t === "inlineStr") {
    return [...cellXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join("");
  }
  return v;
}

/** Preserve any existing plain-language BE-Note (column G) as API summary fallback. */
function parseExistingSummaries(sheetXml, shared) {
  /** @type {Map<number, string>} */
  const summaries = new Map();
  for (const rowXml of sheetXml.match(/<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const row = Number(rowXml.match(/r="(\d+)"/)?.[1]);
    const gCell = rowXml.match(/<c r="G\d+"[^>]*>[\s\S]*?<\/c>/);
    if (!gCell) continue;
    const value = getCellValue(gCell[0], shared).trim();
    if (value) summaries.set(row, value);
  }
  return summaries;
}

function buildSharedStringsXml(items) {
  const sis = items
    .map((text) => `<si><t xml:space="preserve">${escapeXml(text)}</t></si>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${items.length}" uniqueCount="${items.length}">${sis}</sst>`;
}

function stringIndex(shared, value, sharedMap) {
  if (sharedMap.has(value)) return sharedMap.get(value);
  const index = shared.length;
  shared.push(value);
  sharedMap.set(value, index);
  return index;
}

function cellXml(ref, value, shared, sharedMap) {
  if (value === "" || value === null || value === undefined) {
    return `<c r="${ref}"/>`;
  }
  if (typeof value === "number") {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  const idx = stringIndex(shared, String(value), sharedMap);
  return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
}

function normalizePath(name) {
  return name.replaceAll("\\", "/");
}

/** @returns {{ totalDays: number, totalHours: number, hoursPerDay: number, rowCount: number }} */
export function computeBackOfficeBeTotals() {
  let totalDays = 0;
  for (const spec of Object.values(ROW_BE)) {
    totalDays += spec.days ?? 0;
  }
  totalDays = Math.round(totalDays * 100) / 100;
  return {
    totalDays,
    totalHours: Math.round(totalDays * HOURS_PER_DAY * 10) / 10,
    hoursPerDay: HOURS_PER_DAY,
    rowCount: Object.keys(ROW_BE).length,
  };
}

function runEstimate() {
copyFileSync(SOURCE, OUTPUT);

const entries = readOpcZip(OUTPUT);
const entryMap = new Map(entries.map((e) => [normalizePath(e.name), e]));

const wb = entryMap.get("xl/workbook.xml").data.toString("utf8");
const rels = entryMap.get("xl/_rels/workbook.xml.rels").data.toString("utf8");
const relMap = Object.fromEntries(
  [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [
    m[1],
    m[2].replaceAll("\\", "/"),
  ]),
);
const sheetMeta = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(
  (m) => ({
    name: m[1],
    path: "xl/" + relMap[m[2]].replace(/^\.\//, ""),
  }),
);
const target = sheetMeta.find((s) => s.name === SHEET_NAME);
if (!target) {
  throw new Error(`Sheet "${SHEET_NAME}" not found. Available: ${sheetMeta.map((s) => s.name).join(", ")}`);
}

let shared = parseSharedStrings(
  entryMap.get("xl/sharedStrings.xml")?.data.toString("utf8") ?? "",
);
const sharedMap = new Map(shared.map((text, index) => [text, index]));

let sheetXml = entryMap.get(target.path).data.toString("utf8");
const existingSummaries = parseExistingSummaries(sheetXml, shared);
const rowBlocks = [...sheetXml.matchAll(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g)];

let totalDays = 0;
for (const spec of Object.values(ROW_BE)) {
  totalDays += spec.days ?? 0;
}
totalDays = Math.round(totalDays * 100) / 100;
const totalHours = Math.round(totalDays * HOURS_PER_DAY * 10) / 10;

const rowValues = new Map();
rowValues.set(1, {
  g: "BE APIs needed",
  h: "API summary",
  i: "BE Estimate (days @ 9h, Cursor)",
  j: "BE Hours (@ 9h)",
});
rowValues.set(2, {
  g: "Total BE (Cursor)",
  h: "What the server does for each row, in plain language",
  i: totalDays,
  j: totalHours,
  f: totalDays,
});
for (const [row, spec] of Object.entries(ROW_BE)) {
  const rowNum = Number(row);
  rowValues.set(rowNum, {
    g: spec.apis,
    h: spec.summary || existingSummaries.get(rowNum) || "",
    i: spec.days ?? "",
    j: beHoursValue(spec.days),
    f: beDaysValue(spec),
  });
}

for (const [, rowNum, rowAttrs, body] of rowBlocks) {
  const row = Number(rowNum);
  const values = rowValues.get(row);
  if (!values) continue;

  let cleaned = body
    .replace(/<c r="G\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "")
    .replace(/<c r="H\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "")
    .replace(/<c r="I\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "")
    .replace(/<c r="J\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "");

  if (values.f !== undefined) {
    cleaned = cleaned.replace(/<c r="F\d+"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g, "");
  }

  const extra = [
    values.f !== undefined ? cellXml(`F${row}`, values.f, shared, sharedMap) : "",
    cellXml(`G${row}`, values.g, shared, sharedMap),
    cellXml(`H${row}`, values.h, shared, sharedMap),
    cellXml(`I${row}`, values.i, shared, sharedMap),
    cellXml(`J${row}`, values.j, shared, sharedMap),
  ].join("");

  const escapedAttrs = rowAttrs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  sheetXml = sheetXml.replace(
    new RegExp(`<row r="${row}"${escapedAttrs}>[\\s\\S]*?</row>`),
    `<row r="${row}"${rowAttrs}>${cleaned}${extra}</row>`,
  );
}

const maxRow = Math.max(...rowBlocks.map((m) => Number(m[1])));
if (sheetXml.includes("<dimension")) {
  sheetXml = sheetXml.replace(/<dimension ref="[^"]+"/, `<dimension ref="A1:J${maxRow}"`);
}

/**
 * The source workbook hides every column from H onward and sets defaultColWidth="0",
 * so the added columns render as invisible. Rebuild the <cols> block keeping A-F
 * untouched and making G-J visible.
 */
const NEW_COLUMN_WIDTHS = { 7: 52, 8: 64, 9: 14, 10: 12 };

sheetXml = sheetXml.replace(/<cols>([\s\S]*?)<\/cols>/, (_match, inner) => {
  const kept = [...inner.matchAll(/<col [^>]*\/>/g)]
    .map((m) => m[0])
    .filter((col) => Number(col.match(/min="(\d+)"/)[1]) <= 6);

  const added = Object.entries(NEW_COLUMN_WIDTHS).map(
    ([index, width]) =>
      `<col min="${index}" max="${index}" width="${width}" customWidth="1"/>`,
  );

  return `<cols>${kept.join("")}${added.join("")}<col min="11" max="16384" width="0" style="27" hidden="1"/></cols>`;
});

sheetXml = sheetXml.replace(
  /<sheetFormatPr[^/]*\/>/,
  '<sheetFormatPr defaultColWidth="12" defaultRowHeight="15" customHeight="1"/>',
);

entryMap.set(target.path, {
  name: target.path.replaceAll("/", "\\"),
  data: Buffer.from(sheetXml, "utf8"),
});
entryMap.set("xl/sharedStrings.xml", {
  name: "xl\\sharedStrings.xml",
  data: Buffer.from(buildSharedStringsXml(shared), "utf8"),
});

writeOpcZip(
  OUTPUT,
  [...entryMap.values()].map((e) => ({
    name: e.name.replaceAll("/", "\\"),
    data: e.data,
  })),
);

console.log(`Wrote ${OUTPUT}`);
console.log(`Sheet: ${SHEET_NAME}`);
console.log(`Columns: G = BE APIs needed · H = API summary (plain language) · I = BE days · J = BE hours`);
console.log(`Updated F (BE + DB) with Cursor days except rows marked NA`);
console.log(`Total BE: ${totalDays} days (${totalHours} hours @ ${HOURS_PER_DAY}h/day)`);
console.log(`Rows mapped: ${Object.keys(ROW_BE).length}`);
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEstimate();
}
