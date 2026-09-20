# Prompt: fill SafeIn5 bulk import workbook from your job-pack files

Give this prompt to an AI assistant together with your files.

**Attach these three items:**

1. `db/schema/schema.sql` — defines what each column means and allowed values.
2. `docs/template/SafeIn5_Bulk_Data_Import.xlsx` — the workbook to fill in (one sheet per database table).
3. **Your job-pack folder** — scanned permits, RAMS/HIRA, rescue plans, checklists, etc. (JPEG/PDF).

**Use as a worked example only (do not copy its values):** `docs/sample documents/` — one Tarmac/Dolyhir pack showing the expected shape.

---

## Your task

Read every file in **your** job-pack folder. Add **new rows** to `SafeIn5_Bulk_Data_Import.xlsx` so the data describes that job accurately.

- **Do not delete** the README sheet or column headers (rows 1–2 on each sheet).
- **Do not change** column names on row 1.
- **Add** new data rows below any existing example rows (or replace example rows if this workbook is only for your packs).
- Every **data row** must be followed immediately by a **source row** (see below).
- Columns marked **\*** on row 1 are mandatory — they must not be left empty.

Return the updated workbook (or a clear table of rows to paste per sheet).

---

## How the workbook is laid out

| Row | Content |
|---|---|
| **1** | Database column name. `*_name` columns are links to other sheets (e.g. `tenant_name`, `work_task_name`). `*` = required. |
| **2** | Website field label (if mapped). |
| **3+** | Your data — one row per record, then a grey **source** row underneath. |

**Link columns use names, not numbers:**

| Column | Must match exactly |
|---|---|
| `tenant_name` | `tenant.name` on the **tenant** sheet |
| `site_name` | `site.name` on the **site** sheet |
| `space_name` | `space.name` on the **space** sheet |
| `work_task_name` | `work_task.reference` on the **work_task** sheet |
| `document_name` | `document.title` on the **document** sheet |
| `content_pack_name` | `content_pack.title` on the **content_pack** sheet |
| `user_name` / `manager_user_name` / `lead_user_name` | Person’s **email** on the **app_user** sheet (preferred) |

---

## Step-by-step (repeat for each job pack)

### Step 1 — Group your files into one pack

A **pack** = one piece of work at one site/space (usually one permit).

Group files that share the same permit number, site, and dates.  
Do not mix unrelated jobs into one tenant/site/task.

### Step 2 — Classify each file

| If the file looks like… | `document.doc_type` | Attach to |
|---|---|---|
| Permit to Work | `permit_to_work` | **work_task** |
| HIRA / RAMS / risk assessment | `risk_assessment` | **work_task** |
| Rescue plan | `rescue_plan` | **space** |
| Job checklist (e.g. IMSF) | `checklist` | **space** |
| Contractor clearance | `other` | **work_task** |
| Method statement / SOP | `other` or `standard` | **work_task** |
| Anything else | `other` | Best matching space or task |

### Step 3 — Write a pack manifest (before filling sheets)

Lock these values once and use the **same spelling** on every sheet:

| Item | Where to read it on the paper | Example (sample only) |
|---|---|---|
| Client / tenant | Letterhead logo | Tarmac |
| Site | HIRA or PTW site field | Dolyhir |
| Space | Rescue plan or PTW location | Hot Aggregate Bins |
| Task reference | Your **unique task id** (work order, WO, etc.) | May equal permit no. if only one task |
| Permit number | Printed on PTW | 098001 |
| RAMS / RA number | HIRA header | HOTBINSRA01 |
| People | Signatures, crew lists, issuer/acceptor | JA Byrne, Jake Marshall, … |

**Important:**

- `work_task.reference` = **unique per task** within a client. Used everywhere as `work_task_name`.
- `work_task.permit_number` = **printed permit number**. Several tasks **may share** the same permit number but must have **different** `reference` values.
- `work_task.rams_reference` = HIRA/RA number — **not** the task reference.
- Do **not** use the RAMS code (e.g. HOTBINSRA01) as `work_task_name` in document placements.

### Step 4 — Fill sheets in this order

Fill sheets top to bottom so links resolve:

| Order | Sheet | What to add |
|---|---|---|
| 1 | **app_user** | Everyone named on the papers + one client admin (see Step 5) |
| 2 | **tenant** | Client name, slug, `corporate` |
| 3 | **user_tenant_membership** | Each person → tenant; one row as `tenant_admin` |
| 4 | **site** | Site name; site manager / supervisor via `user_site_membership` |
| 5 | **user_site_membership** | Each person’s role at that site |
| 6 | **space** | Asset/location, permit/rescue flags, QR if known |
| 7 | **document** | One row per file type (PTW, HIRA, rescue, checklist, …) |
| 8 | **document_revision** | One row per document — `revision` = **v1** (first file); v2, v3 for re-uploads |
| 9 | **work_task** | Task reference, dates, permit fields, RAMS link |
| 10 | **work_task_crew** | Crew names from PTW |
| 11 | **document_placement** | Link each document to **space** or **work_task** |
| 12 | **content_pack** | Checklist pack (`job_checklist`) if you have a checklist form |
| 13 | **content_prompt** | One row per checklist question (text from the form) |
| 14 | **content_placement** | Where the checklist pack applies (usually same **space**) |
| 15 | **site_category_owner** | Optional — supervisor for confined space routing |

**Also fill for checklists:** add a **document** row (`checklist`) **and** a **content_pack** row (`job_checklist`) with the **same title**, both on the same space.

### Step 5 — Fields not on the paper (you must still fill some)

Papers have **names**, not emails. You must invent placeholders:

| Field | What to enter | Example pattern |
|---|---|---|
| `app_user.email` | Placeholder email, unique per person | `j.smith@yourclient.seed.local` |
| `account_status` | `invited` | |
| One `tenant_admin` | Client admin email | `admin@yourclient.seed.local` |
| `space.qr_code` | Unique code if not on paper | `SIS-QR-{SITE}-{SPACE}` |

Mark these in a source row as:  
`Source: synthetic prerequisite — not on paper (placeholder email / QR / admin)`

**Do not invent:** missing pages, missing files, real personal emails, or checklist answers (Yes/No) unless asked separately.

### Step 6 — Source row after every data row

Immediately under each data row, add one row starting with:

```
Source files: Folder/Subfolder/filename.jpeg, Folder/other file.jpeg
```

Paths are relative to **your** job-pack folder.

If a value is invented (email, QR, admin):

```
Source: synthetic prerequisite — placeholder email; not on paper
```

If a file is cited on HIRA but not in the folder:

```
Source: RAMS/HIRA Page 1.jpeg cites MS-12345; method-statement file not supplied
```

### Step 7 — Colour coding (if you colour cells)

| Colour | Meaning |
|---|---|
| **Green** | Read directly from your scanned files |
| **Amber** | Generated (email, QR, admin, storage path, `v1` label) |
| **Red** | Required column (`*`) left empty — must fix |
| **Grey italic** | Source annotation row |

---

## Rules that prevent import errors

### Revisions

- `document_revision.revision` and `content_pack.revision` = **`v1`**, **`v2`**, **`v3`** only (sequential per document/pack).
- Put permit numbers, RA numbers, and form edition text in the **correct columns** — not in `revision`.

| Paper value | Put it in |
|---|---|
| Permit number | `work_task.permit_number`, document title |
| RA / HIRA number | `work_task.rams_reference`, document title |
| Task / WO id | `work_task.reference` |
| Form “Version 1 Rev 0” | Source row comment only |

### Dates and yes/no

- Dates: `2026-06-13 06:00:00+01` (not `13.6.26`).
- Booleans: `true` / `false` (not Yes/No).
- Checklist **questions** go in `content_prompt.body_text`. Filled Yes/No answers on paper are **not** imported on this workbook unless your SafeIn5 contact asks for a separate pulse export.

### Allowed values (must match exactly)

| Column | Allowed values |
|---|---|
| `tenant.kind` | `corporate` |
| `user_site_membership.role` | `worker`, `supervisor`, `site_manager` |
| `user_tenant_membership.role` | `member`, `tenant_admin` |
| `document.doc_type` | `permit_to_work`, `risk_assessment`, `rescue_plan`, `checklist`, `standard`, `toolbox_talk`, `other` |
| `document_placement.scope_kind` | `tenant`, `site`, `space`, `work_task` |
| `work_task.status` | `active`, `archived` |
| `content_pack.kind` | `job_checklist`, `learn_5`, `uncover`, `shift` |

Contractor clearance → always `doc_type` = `other`.

### Linking documents to tasks

On **document_placement**:

- PTW, HIRA, contractor clearance → `scope_kind` = `work_task`, `work_task_name` = your task **`reference`**
- Rescue plan, checklist → `scope_kind` = `space`, `space_name` = your space name

On **work_task**:

- `rams_document_name` = exact **HIRA document title** from the document sheet
- `rams_reference` = RA number from HIRA header
- `lead_user_name` = task lead email from app_user sheet

---

## Sheets you can leave empty

These are **not** filled from paper job packs:

- `auth_token` (login creates codes automatically)
- `hazard_category` (already in the database)
- `pulse`, `pulse_event`, `signal`, `signal_media`, `checklist_completion`, `upload_session`, `audio_clip`, `transcription_job`

Leave them blank unless SafeIn5 asks you to add demo data separately.

---

## Cited file missing from folder

If HIRA mentions a method statement but you do not have the file:

1. Add a **document** row (title mentions “cited only”, `doc_type` = `other`).
2. Add **document_revision** with `revision` = `v1`, `s3_key` = `seed/missing/{REFERENCE}`.
3. Add **document_placement** to the work task.
4. Note in the source row that the file was not supplied.

Do **not** invent missing pages of a multi-page form.

---

## Handoff checklist

Before returning the workbook, confirm:

- [ ] Every data row has a source row underneath.
- [ ] Every `*` column is filled on rows you added.
- [ ] `tenant_name`, `site_name`, `space_name`, `work_task_name`, `document_name` spellings match across sheets.
- [ ] `work_task_name` in placements = `work_task.reference` (not RAMS code, not permit number unless they are intentionally the same).
- [ ] Each checklist has **document** + **content_pack** + **content_prompt** rows on the same space.
- [ ] All `revision` values are `v1` / `v2` / `v3` only.
- [ ] List of **gaps** at the top of your reply: missing files, unclear handwriting, pages not supplied.

---

## Example pack structure (reference only)

`docs/sample documents/` contains:

- RAMS/HIRA (3 pages), Permit to Work (front/back), Rescue plan (2 pages), Checklist pages 1–3, Contractor clearance (2 pages)
- One tenant, one site, one space, one task
- Page 4 of checklist and one cited method statement **not** in the folder

Study the **existing example rows** in the template workbook to see how one pack is wired. Copy the **pattern**, not the Tarmac/Dolyhir/098001 values.

---

## What to return

1. Updated `SafeIn5_Bulk_Data_Import.xlsx` (or paste-ready row blocks per sheet).
2. Short **Gaps** list: missing files, invented fields, OCR uncertainties.
3. **Pack manifest** table: tenant, site, space, task reference, permit number, RAMS ref, file list.

If anything in `schema.sql` does not have a column for data on your forms (hazard table, contractor company, filled checklist answers), **leave it on the document scan** and note it in Gaps — do not add columns.
