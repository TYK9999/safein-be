## Why

Onboarding a client job pack into SafeIn5 requires turning scanned permit/RAMS/rescue/checklist images into structured rows for core tables (`tenant`, `app_user`, `site`, `space`, `document`, `work_task`, and their link tables). A shared Excel workbook is the handoff format between extraction, a teammate who completes missing fields, and eventual database insert. The sample Tarmac / Dolyhir / permit **098001** pack in `docs/sample documents/` is the first reference implementation; the workbook layout is fixed at **11 tabs** and must not change.

## What Changes

- Regenerate `docs/template/SafeIn5_MVP_Resource_Fields.xlsx` so **every MVP column that maps to an extracted value** from the sample scans is filled — using `seedMap` in `scripts/generate-sample-job-pack.mjs` as the column guide
- Pre-fill **phase 1** sheets (`01_client` → `06_task`, `08_document` → `09_document_attach`) with all on-paper facts: names, roles, site/space/task fields, document paths, paper references, document kinds, placements, dates, permit/RAMS/MS numbers
- **Remove `07_task_crew` sheet** — permit crew (T Hamnett, Nathan Whittle) remain on `05_person` with Worker role; `work_task_crew` rows are added at DB seed time, not in this workbook
- Pre-fill **phase 2** sheet `10_content` with checklist prompt text extracted from the IMSF checklist scans (56 prompts); leave `task_content` and `11_content_attach` empty
- **No synthetic data**: still no invented emails, retention/status, placeholder admins, or cited-only documents without a scan file
- Preserve the **locked 11-sheet tab set and column headers** — no new or removed tabs beyond dropping `07_task_crew`, no column changes
- Add blank rows on phase 1 sheets so a teammate can append rows
- Single extraction source: `people`, `documents`, `checklist`, and `seedMap` from `scripts/generate-sample-job-pack.mjs`
- **xlsx → Postgres importer remains out of scope** (follow-up)

## Capabilities

### New Capabilities

- `job-pack-excel-handoff`: MVP Excel workbook with maximum extracted-value coverage from scanned job-pack images, locked 11-tab layout (no task crew sheet), teammate blank rows, and consistent naming before DB seed

### Modified Capabilities

_(none — no existing `openspec/specs/` capabilities yet)_

## Impact

- `scripts/generate-mvp-resource-fields-workbook.mjs` — remove `07_task_crew` from `SHEET_ORDER` and resources; update `HANDOFF_CORE_SHEETS`
- `docs/template/SafeIn5_MVP_Resource_Fields.xlsx` — regenerated output (11 tabs)
- `docs/prompts/mvp-excel-job-pack-handoff.md` — update fill order
- `scripts/generate-sample-job-pack.mjs` — shared extraction unchanged; SQL seed still inserts `work_task_crew`
- No NestJS API changes
