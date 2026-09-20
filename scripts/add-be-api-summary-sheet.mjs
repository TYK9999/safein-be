import { join } from "node:path";
import { readOpcZip, writeOpcZip } from "./lib/xlsx.mjs";

const INPUT = join(import.meta.dirname, "..", "docs", "SafeIn5 Core.xlsx");
const SHEET_NAME = "BE API Summary";

/** Canonical back-office API inventory grouped by resource. */
const API_INVENTORY = [
  {
    resource: "Health",
    apis: [
      { method: "GET", path: "/health", description: "Liveness probe", status: "Exists" },
    ],
  },
  {
    resource: "Auth & session",
    apis: [
      { method: "POST", path: "/auth/register", description: "Community self-register", status: "Exists" },
      { method: "POST", path: "/auth/otp/request", description: "Request OTP", status: "Exists" },
      { method: "POST", path: "/auth/otp/verify", description: "Verify OTP, activate if first use, issue tokens", status: "Exists" },
      { method: "POST", path: "/auth/refresh", description: "Refresh access token", status: "Exists" },
      { method: "POST", path: "/auth/logout", description: "Clear refresh cookie", status: "Exists" },
      { method: "GET", path: "/me", description: "Current user profile", status: "Exists" },
      { method: "PATCH", path: "/me", description: "Update current user profile", status: "Needed" },
    ],
  },
  {
    resource: "Users & invites",
    apis: [
      { method: "POST", path: "/users", description: "Create user record", status: "Needed" },
      { method: "POST", path: "/users/invite", description: "Invite worker/supervisor/site manager", status: "Needed" },
      { method: "GET", path: "/users", description: "List users (tenant scope)", status: "Needed" },
      { method: "GET", path: "/users/:id", description: "User detail", status: "Needed" },
      { method: "PATCH", path: "/users/:id", description: "Update user", status: "Needed" },
      { method: "GET", path: "/users/:id/roles", description: "Roles and site scope", status: "Needed" },
      { method: "PATCH", path: "/users/:id/back-office-access", description: "Back-office permissions", status: "Needed" },
      { method: "POST", path: "/users/:id/extract-profile", description: "AI profile extraction from docs", status: "Needed" },
    ],
  },
  {
    resource: "Clients (tenants)",
    apis: [
      { method: "POST", path: "/tenants", description: "Onboard client", status: "Needed" },
      { method: "GET", path: "/tenants", description: "List clients", status: "Needed" },
      { method: "GET", path: "/tenants/:id", description: "Client detail", status: "Needed" },
      { method: "PATCH", path: "/tenants/:id", description: "Update client (active/inactive)", status: "Needed" },
      { method: "PATCH", path: "/tenants/:id/retention", description: "Retention & privacy settings", status: "Needed" },
      { method: "POST", path: "/tenants/:id/privacy-requests", description: "Raise privacy request", status: "Needed" },
      { method: "GET", path: "/tenants/:id/sites", description: "Client site listing", status: "Needed" },
      { method: "GET", path: "/tenants/:id/admins", description: "Client admin listing", status: "Needed" },
      { method: "GET", path: "/tenants/:id/stats", description: "Client summary stats", status: "Needed" },
    ],
  },
  {
    resource: "Dashboard",
    apis: [
      { method: "GET", path: "/dashboard/summary", description: "Live clients, echoes of week, content library", status: "Needed" },
      { method: "GET", path: "/home/summary", description: "PWA home: tasks, echoes, learn5 counts", status: "Needed" },
    ],
  },
  {
    resource: "Documents",
    apis: [
      { method: "POST", path: "/documents/presign", description: "Presign document upload", status: "Needed" },
      { method: "POST", path: "/documents", description: "Create document metadata + revision", status: "Needed" },
      { method: "GET", path: "/documents", description: "List documents (tenant/site scope)", status: "Needed" },
      { method: "GET", path: "/documents/kinds", description: "MVP document kind dropdown", status: "Needed" },
      { method: "GET", path: "/documents/:id", description: "Document detail", status: "Needed" },
      { method: "DELETE", path: "/documents/:id", description: "Delete document", status: "Needed" },
      { method: "GET", path: "/documents/:id/placements", description: "Attached spaces/tasks", status: "Needed" },
      { method: "GET", path: "/documents/:id/preview", description: "Preview URL / metadata", status: "Needed" },
      { method: "POST", path: "/documents/:id/revisions", description: "Republish new file revision", status: "Needed" },
      { method: "PATCH", path: "/documents/:id/publish", description: "Publish revision", status: "Needed" },
      { method: "POST", path: "/documents/:id/extract", description: "AI extract fields from document", status: "Needed" },
      { method: "POST", path: "/documents/bulk-import", description: "Bulk document import", status: "Needed" },
    ],
  },
  {
    resource: "Content packs",
    apis: [
      { method: "POST", path: "/content-packs/presign", description: "Presign checklist/learn5 upload", status: "Needed" },
      { method: "POST", path: "/content-packs", description: "Create Job Checklist / Learn 5 pack", status: "Needed" },
      { method: "GET", path: "/content-packs", description: "List content packs", status: "Needed" },
      { method: "PATCH", path: "/content-packs/:id/publish", description: "Publish pack", status: "Needed" },
      { method: "DELETE", path: "/content-packs/:id", description: "Delete pack", status: "Needed" },
      { method: "POST", path: "/content-packs/:id/prompts", description: "Add checklist prompts", status: "Needed" },
      { method: "POST", path: "/content-packs/:id/republish", description: "Republish with new checks", status: "Needed" },
      { method: "GET", path: "/content-packs/:id/learn5", description: "Learn 5 module for task", status: "Needed" },
    ],
  },
  {
    resource: "Sites",
    apis: [
      { method: "POST", path: "/sites", description: "Add site", status: "Needed" },
      { method: "GET", path: "/sites", description: "List sites", status: "Needed" },
      { method: "GET", path: "/sites/:id", description: "Site detail", status: "Needed" },
      { method: "PATCH", path: "/sites/:id", description: "Update site", status: "Needed" },
      { method: "POST", path: "/sites/bulk-import", description: "Bulk site import", status: "Needed" },
      { method: "GET", path: "/sites/:id/members", description: "People on site", status: "Needed" },
      { method: "GET", path: "/sites/:id/tasks", description: "Active tasks on site", status: "Needed" },
      { method: "GET", path: "/sites/:id/spaces", description: "Spaces on site", status: "Needed" },
      { method: "GET", path: "/sites/:id/overview", description: "Site dashboard: tasks, spaces, people", status: "Needed" },
    ],
  },
  {
    resource: "Spaces & QR",
    apis: [
      { method: "POST", path: "/spaces", description: "Add space", status: "Needed" },
      { method: "GET", path: "/spaces", description: "List spaces", status: "Needed" },
      { method: "GET", path: "/spaces/:id", description: "Space detail", status: "Needed" },
      { method: "PATCH", path: "/spaces/:id", description: "Update space / attachments", status: "Needed" },
      { method: "GET", path: "/spaces/:id/qr", description: "QR code payload for space", status: "Needed" },
      { method: "GET", path: "/spaces/by-qr/:code", description: "Resolve QR to space/task routing", status: "Needed" },
    ],
  },
  {
    resource: "Work tasks (permits)",
    apis: [
      { method: "POST", path: "/work-tasks", description: "Create task / permit", status: "Needed" },
      { method: "GET", path: "/work-tasks", description: "Task list (filters)", status: "Needed" },
      { method: "GET", path: "/work-tasks/active", description: "Active task for worker", status: "Needed" },
      { method: "GET", path: "/work-tasks/:id", description: "Task detail", status: "Needed" },
      { method: "PATCH", path: "/work-tasks/:id", description: "Update task", status: "Needed" },
      { method: "POST", path: "/work-tasks/:id/duplicate", description: "Duplicate as template", status: "Needed" },
      { method: "GET", path: "/work-tasks/templates", description: "List template tasks", status: "Needed" },
      { method: "GET", path: "/work-tasks/:id/export", description: "Export PDF/CSV", status: "Needed" },
      { method: "GET", path: "/work-tasks/:id/summary", description: "Task summary card", status: "Needed" },
      { method: "GET", path: "/work-tasks/:id/permit", description: "Permit details for PWA", status: "Needed" },
      { method: "GET", path: "/work-tasks/:id/signals", description: "Echoes raised on task", status: "Needed" },
      { method: "PATCH", path: "/work-tasks/:id/placements", description: "Attach documents to task", status: "Needed" },
      { method: "PATCH", path: "/work-tasks/:id/content-placements", description: "Attach checklist/learn5/uncover/shift", status: "Needed" },
    ],
  },
  {
    resource: "Signals (echoes)",
    apis: [
      { method: "POST", path: "/signals", description: "Create observation/work echo", status: "Exists" },
      { method: "GET", path: "/signals/mine", description: "My echoes", status: "Exists" },
      { method: "GET", path: "/feed", description: "Tenant echo feed", status: "Exists" },
      { method: "GET", path: "/signals/:id", description: "Echo detail", status: "Exists" },
      { method: "POST", path: "/signals/:id/acknowledge", description: "Supervisor acknowledge", status: "Exists" },
      { method: "POST", path: "/signals/:id/close", description: "Close echo", status: "Exists" },
      { method: "GET", path: "/signals", description: "Admin/supervisor echo list", status: "Needed" },
      { method: "PATCH", path: "/signals/:id", description: "Update classification / description", status: "Needed" },
      { method: "POST", path: "/signals/:id/assign", description: "Assign to supervisor", status: "Needed" },
      { method: "POST", path: "/signals/:id/share", description: "Share echo", status: "Needed" },
      { method: "POST", path: "/signals/:id/submit", description: "Submit observation", status: "Needed" },
      { method: "GET", path: "/signals/history", description: "Echo history (all entries)", status: "Needed" },
      { method: "POST", path: "/signals/:id/classify", description: "AI classify echo", status: "Needed" },
    ],
  },
  {
    resource: "Media & STT",
    apis: [
      { method: "POST", path: "/uploads/next", description: "Multipart video upload", status: "Exists" },
      { method: "GET", path: "/uploads/:token/thumbnail", description: "Video thumbnail URL", status: "Exists" },
      { method: "GET", path: "/uploads/:token/playback", description: "Video playback URL", status: "Exists" },
      { method: "POST", path: "/audio-clips/presign", description: "Presign audio upload", status: "Exists" },
      { method: "POST", path: "/audio-clips/confirm", description: "Confirm audio upload", status: "Exists" },
      { method: "GET", path: "/audio-clips", description: "List audio clips", status: "Exists" },
      { method: "POST", path: "/stt/presign", description: "Presign STT upload", status: "Exists" },
      { method: "POST", path: "/stt/jobs", description: "Start transcribe job", status: "Exists" },
      { method: "GET", path: "/stt/jobs", description: "List STT jobs", status: "Exists" },
      { method: "GET", path: "/stt/jobs/:jobId", description: "Poll STT job status", status: "Exists" },
    ],
  },
  {
    resource: "AI extraction",
    apis: [
      { method: "POST", path: "/take5/extract", description: "Extract checks from documents (stateless)", status: "Exists" },
      { method: "POST", path: "/pulse/ai-extract", description: "PULSE flow AI extraction", status: "Needed" },
    ],
  },
  {
    resource: "PULSE (work task flow)",
    apis: [
      { method: "GET", path: "/pulse/work-list", description: "Work list + mandatory Learn 5", status: "Needed" },
      { method: "POST", path: "/checklist-completions", description: "Submit checklist ticks", status: "Needed" },
      { method: "GET", path: "/pulse/uncover/echoes", description: "Uncover echo feed", status: "Needed" },
      { method: "POST", path: "/pulse/sessions/:id/pause", description: "Pause work session", status: "Needed" },
      { method: "GET", path: "/pulse/shift", description: "Shift screen data", status: "Needed" },
      { method: "POST", path: "/pulse/shift/notes", description: "Shift notes (audio transcript)", status: "Needed" },
      { method: "POST", path: "/learn5-completions", description: "Mark Learn 5 complete", status: "Needed" },
    ],
  },
  {
    resource: "Bulk import",
    apis: [
      { method: "GET", path: "/import/templates/:resource", description: "Download import template", status: "Needed" },
      { method: "POST", path: "/import/:resource/validate", description: "Validate import file", status: "Needed" },
      { method: "POST", path: "/import/:resource/commit", description: "Commit validated import", status: "Needed" },
    ],
  },
  {
    resource: "Analytics",
    apis: [
      { method: "GET", path: "/analytics/overview", description: "Overview dashboard", status: "Needed" },
      { method: "GET", path: "/analytics/capture", description: "Capture metrics", status: "Needed" },
      { method: "GET", path: "/analytics/signals", description: "Signal/echo metrics", status: "Needed" },
    ],
  },
  {
    resource: "Notifications & realtime",
    apis: [
      { method: "GET", path: "/notifications", description: "User notifications", status: "Needed" },
      { method: "PATCH", path: "/notifications/:id/read", description: "Mark notification read", status: "Needed" },
      { method: "WS", path: "/realtime", description: "WebSocket: echo queue, pulse, notifications", status: "Partial" },
    ],
  },
  {
    resource: "Support",
    apis: [
      { method: "POST", path: "/support/change-requests", description: "Contact SafeIn5 admin / change request", status: "Needed" },
    ],
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function colName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    n -= 1;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}

function inlineCell(ref, value, style = 0) {
  if (value === "" || value === null || value === undefined) {
    return `<c r="${ref}" s="${style}"/>`;
  }
  if (typeof value === "number") {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function buildSummaryRows() {
  const rows = [
    ["Resource", "Method", "Endpoint", "Description", "Status", "Base path"],
  ];

  let exists = 0;
  let partial = 0;
  let needed = 0;

  for (const group of API_INVENTORY) {
    for (const api of group.apis) {
      rows.push([
        group.resource,
        api.method,
        api.path,
        api.description,
        api.status,
        "/api/v1",
      ]);
      if (api.status === "Exists") exists += 1;
      else if (api.status === "Partial") partial += 1;
      else needed += 1;
    }
  }

  rows.push([]);
  rows.push(["Summary", "", "", "", "", ""]);
  rows.push(["Total endpoints", rows.length - 3, "", "", "", ""]);
  rows.push(["Exists today", exists, "", "", "", ""]);
  rows.push(["Partial", partial, "", "", "", ""]);
  rows.push(["Needed (new)", needed, "", "", "", ""]);
  rows.push(["Back Office BE estimate", "", "", "47.25 days @ 9h/day (Cursor)", "See Back Office App col H", ""]);

  return rows;
}

function buildWorksheetXml(rows) {
  const maxCol = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const lastCol = colName(maxCol - 1);
  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNum = rowIndex + 1;
      const style = rowIndex === 0 ? 1 : 0;
      const cells = Array.from({ length: maxCol }, (_, colIndex) =>
        inlineCell(colName(colIndex) + rowNum, row[colIndex] ?? "", style),
      ).join("");
      return `<row r="${rowNum}">${cells}</row>`;
    })
    .join("");

  const widths = [22, 10, 42, 48, 12, 12]
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${rows.length}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${widths}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastCol}${rows.length - 6}"/>
</worksheet>`;
}

function normalizePath(name) {
  return name.replaceAll("\\", "/");
}

const entries = readOpcZip(INPUT);
const entryMap = new Map(entries.map((e) => [normalizePath(e.name), e]));

const wbPath = "xl/workbook.xml";
const relsPath = "xl/_rels/workbook.xml.rels";
const ctPath = "[Content_Types].xml";

let wb = entryMap.get(wbPath).data.toString("utf8");
const rels = entryMap.get(relsPath).data.toString("utf8");

if (wb.includes(`name="${SHEET_NAME}"`)) {
  console.log(`Sheet "${SHEET_NAME}" already exists — replacing worksheet.`);
  const existing = [...wb.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)];
  const target = existing.find((m) => m[1] === SHEET_NAME);
  const relMap = Object.fromEntries(
    [...rels.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  const sheetPath = normalizePath("xl/" + relMap[target[2]].replace(/^\.\//, ""));
  entryMap.set(sheetPath, {
    name: sheetPath.replaceAll("/", "\\"),
    data: Buffer.from(buildWorksheetXml(buildSummaryRows()), "utf8"),
  });
} else {
  const sheetEntries = [...entryMap.keys()].filter((k) =>
    /xl\/worksheets\/sheet\d+\.xml$/.test(k),
  );
  const nextSheetNum =
    Math.max(...sheetEntries.map((k) => Number(k.match(/sheet(\d+)/)[1]))) + 1;
  const sheetFile = `xl/worksheets/sheet${nextSheetNum}.xml`;
  const nextRelId = `rId${[...rels.matchAll(/Id="rId(\d+)"/g)].length + 1}`;
  const nextSheetId =
    Math.max(
      ...[...wb.matchAll(/sheetId="(\d+)"/g)].map((m) => Number(m[1])),
    ) + 1;

  entryMap.set(sheetFile, {
    name: sheetFile.replaceAll("/", "\\"),
    data: Buffer.from(buildWorksheetXml(buildSummaryRows()), "utf8"),
  });

  wb = wb.replace(
    "</sheets>",
    `<sheet name="${SHEET_NAME}" sheetId="${nextSheetId}" r:id="${nextRelId}"/></sheets>`,
  );
  entryMap.set(wbPath, { name: wbPath.replaceAll("/", "\\"), data: Buffer.from(wb, "utf8") });

  const newRels = rels.replace(
    "</Relationships>",
    `<Relationship Id="${nextRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${nextSheetNum}.xml"/></Relationships>`,
  );
  entryMap.set(relsPath, {
    name: relsPath.replaceAll("/", "\\"),
    data: Buffer.from(newRels, "utf8"),
  });

  let ct = entryMap.get(ctPath).data.toString("utf8");
  if (!ct.includes(`/xl/worksheets/sheet${nextSheetNum}.xml`)) {
    ct = ct.replace(
      "</Types>",
      `<Override PartName="/xl/worksheets/sheet${nextSheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    );
    entryMap.set(ctPath, { name: ctPath, data: Buffer.from(ct, "utf8") });
  }
}

writeOpcZip(
  INPUT,
  [...entryMap.values()].map((e) => ({
    name: e.name.replaceAll("/", "\\"),
    data: e.data,
  })),
);

const total = API_INVENTORY.reduce((sum, g) => sum + g.apis.length, 0);
const exists = API_INVENTORY.flatMap((g) => g.apis).filter((a) => a.status === "Exists").length;
const needed = API_INVENTORY.flatMap((g) => g.apis).filter((a) => a.status === "Needed").length;
const partial = API_INVENTORY.flatMap((g) => g.apis).filter((a) => a.status === "Partial").length;

console.log(`Added sheet "${SHEET_NAME}" to ${INPUT}`);
console.log(`Total endpoints: ${total} | Exists: ${exists} | Partial: ${partial} | Needed: ${needed}`);
console.log(`Resource groups: ${API_INVENTORY.length}`);
