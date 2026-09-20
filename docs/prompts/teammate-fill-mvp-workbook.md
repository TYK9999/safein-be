# Teammate prompt — fill MVP workbook from scanned job packs

Copy everything below the line into Cursor (or similar) with **`SafeIn5_MVP_Resource_Fields.xlsx`** and the scanned documents attached.

---

```
You are helping me fill SafeIn5_MVP_Resource_Fields.xlsx with data extracted ONLY from scanned job-pack documents I attach.

## Document folder layout

Scans are organised one folder per job pack:

```
documents/
  task_1/          ← first job pack (e.g. Tarmac / Dolyhir / 098001)
  task_2/          ← second job pack
  task_3/          ← third job pack
```

Each `task_N` folder contains that pack's scans (RAMS, permit, rescue plan, checklist, contractor clearance, etc.).

When filling **File** paths on `08_document` and **Files** on `10_content`, use paths relative to the repo root, e.g.:

`documents/task_2/RAMS/HIRA Front Page 1 .jpeg`

Work on **one task folder at a time**. Each task folder = one linked set of rows across the sheets.

## Hard rules (do not break these)

1. Do NOT add, remove, or rename sheets or columns. The workbook has exactly these 11 tabs in this order:
   `01_client`, `02_client_admin`, `03_site`, `04_space`, `05_person`, `06_task`, `08_document`, `09_document_attach`, `10_content`, `task_content`, `11_content_attach`

2. Do NOT invent data. Every value must come from the attached scans. If a field is not on the papers, leave it blank.

3. Do NOT overwrite existing sample rows unless I ask you to. Add NEW rows below the existing data for each new job pack (`task_2`, `task_3`, …).

4. Keep names consistent across all sheets for the same job pack (Client, Site, Space, Task reference, Document title, Person name).

5. There is NO task crew sheet. All people (including crew/workers) go on `05_person` only.

6. Leave these sheets empty (headers only, no new data rows):
   - `02_client_admin` (unless I explicitly ask for an admin)
   - `task_content`
   - `11_content_attach`

## What to leave blank (not on typical paper job packs)

- Emails, country code, phone on `05_person`
- Domain, Status, Echo retention, Media retention on `01_client`
- Site location on `03_site` (unless written on the documents)
- "Start from an existing task" on `06_task`

## Fill order (one job pack / task folder at a time)

`01_client` → `03_site` → `04_space` → `05_person` → `08_document` → `06_task` → `09_document_attach` → `10_content`

## Sheet-by-sheet instructions

### 01_client
| Column | Source |
|--------|--------|
| Client name * | Organisation name from logo/header (e.g. Tarmac) |
| Domain or general address | Only if on documents |
| Status | Only if on documents (choices: Active \| Inactive) |
| Echo records retention | Leave blank |
| Media retention | Leave blank |

### 03_site
| Column | Source |
|--------|--------|
| Site name * | Site name on HIRA, permit, or rescue plan |
| Site location | Only if on documents |
| Site Manager * | Permit issuer / site manager name |
| Supervisor | Rescue supervisor or engineering supervisor if named |

### 04_space
| Column | Source |
|--------|--------|
| Space name * | Work area name (e.g. Hot Aggregate Bins) |
| Location on site | Physical location from rescue plan or HIRA |
| Site * | Same site name as `03_site` |
| Task type | e.g. Confined space entry (from permit type) |
| Permit required before work can start | Yes or No (usually Yes if permit raised) |
| This space should carry a rescue plan | Yes or No (Yes if rescue plan exists for this space) |

### 05_person
One row per named person on the documents. Include everyone: site manager, supervisors, task lead, permit acceptor, crew/workers.

| Column | Source |
|--------|--------|
| Name * | As written on paper |
| Email * | Leave blank |
| Country code | Leave blank |
| Phone number | Leave blank |
| Site | Same as `03_site` |
| Role on site | Site Manager \| Supervisor \| Worker (match their role on the papers) |

### 08_document
One row per scanned document file group (HIRA/RAMS, Permit, Rescue plan, Checklist, Contractor clearance, etc.)

| Column | Source |
|--------|--------|
| File * | Path under the task folder, e.g. `documents/task_2/RAMS/HIRA Front Page 1 .jpeg` |
| Client | Same as `01_client` |
| What kind of document is it? * | Use EXACT dropdown label (see mapping below) |
| Reference | Paper reference number (e.g. HOTBINSRA01, permit number) |

**Document kind mapping (use exact label):**
- HIRA / RAMS → Risk assessment (HIRA / RAMS)
- Permit to work → Permit to work
- Rescue plan → Rescue plan
- Checklist → Checklist
- Contractor clearance / no standard kind → Other (contractor clearance)

### 06_task
| Column | Source |
|--------|--------|
| Start from an existing task | Leave blank |
| Task reference * | Permit number (e.g. 098001) |
| RAMS document * | Title of HIRA/RAMS from `08_document` |
| RAMS reference number * | RAMS ref from HIRA (e.g. HOTBINSRA01) |
| Permit reference type * | Permit types from front page (e.g. Confined Space; Hot Work) |
| Permit reference number * | Same as task reference |
| MS/SOP number | MS/SOP ref if on permit |
| What is the work | Work description from permit |
| Space * | Same as `04_space` name |
| Task Lead * | Person raising / leading the work |
| Starts | Start date/time from permit |
| Runs for | Duration from permit |
| Permit required before work can start | Yes or No |

### 09_document_attach
One row per document on `08_document` — links each document to Task or Space.

| Column | Source |
|--------|--------|
| Document * | Exact title from `08_document` |
| Applies to * | Task \| Space \| Client \| Site |
| Target name * | Task reference if Applies to = Task; Space name if Applies to = Space |

Typical placements:
- HIRA, Permit, Checklist, Contractor clearance → Task → task reference
- Rescue plan → Space → space name

### 10_content
One row per checklist prompt/question from the checklist scans in that task folder.

| Column | Source |
|--------|--------|
| Files * | Checklist scan path(s) on FIRST row only, e.g. `documents/task_2/Checklist/CS Check List Page 1.jpeg`; blank on subsequent rows |
| Title * | Checklist title from document (e.g. IMSF 100 — Confined Spaces Checklist) |
| Which kind of content is this? * | Job Checklist |
| Check / prompt text * | Exact prompt text from each checklist line/item |

## Reference example (existing rows — `documents/task_1`)

Use this as the pattern for structure and linking, not as data to copy into new packs:

- Client: Tarmac
- Site: Dolyhir · Manager: JA Byrne · Supervisor: J Abrahams
- Space: Hot Aggregate Bins · Asphalt Plant, mixer house level 3 · Confined space entry · Permit Yes · Rescue Yes
- People: JA Byrne (Site Manager), Jake Marshall (Supervisor), J Abrahams (Supervisor), T Hamnett (Worker), Nathan Whittle (Worker)
- Task: 098001 · RAMS HOTBINSRA01 · MS/SOP HOTBINSMS01 · lead Jake Marshall
- Documents: 5 rows (HIRA, PTW, rescue plan, checklist, contractor clearance)
- Attachments: 5 rows matching those documents
- Checklist: 56 prompt rows on `10_content`

## Your task

1. Tell me which `documents/task_N` folder you are working on.
2. Read all scans in that folder.
3. Add new rows to the workbook following the rules above.
4. Show me a summary table of what you added per sheet before saving.
5. Flag anything you could not find on the documents and left blank.

Do not change sheet structure. Do not add synthetic emails, phone numbers, retention settings, or admin invites.
```

## Quick version (if they already know the workbook)

> Add rows for `documents/task_N` to `SafeIn5_MVP_Resource_Fields.xlsx` using only facts from that folder's scans. Same 11 sheets, same columns, new rows only, no synthetic emails/retention/admin. File paths like `documents/task_N/RAMS/...`. Crew workers on `05_person` only. Follow the existing `task_1` row pattern for linking.
