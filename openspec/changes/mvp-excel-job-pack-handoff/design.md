## Context

See proposal.md — Why. Workbook: `docs/template/SafeIn5_MVP_Resource_Fields.xlsx` (**11 locked tabs** — `07_task_crew` removed). Extraction manifest: `scripts/generate-sample-job-pack.mjs`. Sample images: `docs/sample documents/`.

## Goals / Non-Goals

**Goals:**
- **Maximize extracted-value coverage** on phase 1 sheets (01–06, 08–09)
- Pre-fill `10_content` with 56 IMSF checklist prompts
- Keep **11 tabs and column headers frozen** via `SHEET_ORDER` (no `07_task_crew`)
- **No synthetic data** — blanks only for genuine gaps
- **5 blank rows** per phase 1 sheet

**Non-Goals:**
- `07_task_crew` sheet or workbook rows for `work_task_crew` (handled at SQL seed / DB import)
- xlsx → Postgres importer
- Populating `task_content` / `11_content_attach` until extractable mappings exist
- Echo/pulse sheets

## Decisions

### 1. Remove `07_task_crew` sheet
- **Choice:** Drop the tab from `SHEET_ORDER` and `resources`; crew members (T Hamnett, Nathan Whittle) stay on `05_person` with Worker role
- **Why:** User removed the sheet from the workbook; crew linkage is a DB concern (`work_task_crew`), not a separate MVP form in this handoff
- **Alternatives:** Keep sheet with crew names — rejected per user

### 2. Extraction source of truth: `generate-sample-job-pack.mjs`
- Unchanged — SQL seed still inserts `work_task_crew` from `people` filter

### 3. seedMap → MVP column mapping (reference pack)

| seedMap fact | MVP sheet / column |
|---|---|
| Client `Tarmac` | `01_client` · Client name |
| Site `Dolyhir` | `03_site` · Site name |
| JA Byrne (issuer) | `03_site` · Site Manager |
| J Abrahams (rescue supervisor) | `03_site` · Supervisor |
| Hot Aggregate Bins | `04_space` · Space name |
| Asphalt Plant, mixer house level 3 | `04_space` · Location on site |
| Dolyhir | `04_space` · Site |
| Confined space entry | `04_space` · Task type |
| Permit / rescue flags | `04_space` · Yes / Yes |
| People + roles (incl. crew workers) | `05_person` · Name, Site, Role on site |
| Task 098001, RAMS, permit, MS/SOP, dates, lead | `06_task` · respective columns |
| Each `documents[]` entry | `08_document` · File, Client, kind, Reference |
| Placements | `09_document_attach` · Document, Applies to, Target |
| Checklist prompts | `10_content` · Title, kind, prompt text |

### 4. Locked `SHEET_ORDER` (11 tabs)

`01_client`, `02_client_admin`, `03_site`, `04_space`, `05_person`, `06_task`, `08_document`, `09_document_attach`, `10_content`, `task_content`, `11_content_attach`

### 5. Phase 2 split
- `10_content`: fill from `checklist` array
- `task_content`, `11_content_attach`: headers + pad rows only

## Risks / Trade-offs

- [Crew not in workbook] → Teammate or SQL seed must link workers to task via `work_task_crew` using names from `05_person`
- [Tab renumbering skipped] → Keep `08_document` / `09_document_attach` numbers; only `07` removed

## Migration Plan

1. Remove `07_task_crew` from generator `resources`, `SHEET_ORDER`, `HANDOFF_CORE_SHEETS`, `sampleRows`
2. Regenerate xlsx (11 tabs)
3. Update `docs/prompts/mvp-excel-job-pack-handoff.md` fill order

## Open Questions

- Whether to add a README note in workbook that crew DB rows come from `05_person` Worker rows at import time
