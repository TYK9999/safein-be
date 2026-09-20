## 1. Lock workbook structure

- [x] 1.1 Confirm `SHEET_ORDER` is 11 tabs — no `07_task_crew`, no README/RESOURCES/ALL_FIELDS/echo sheets
- [x] 1.2 Ensure generator outputs only `orderedResources()` sheets
- [x] 1.3 Verify frozen UI column headers on every remaining sheet

## 2. Maximum extracted coverage — phase 1 (01–06, 08–09)

- [x] 2.1 Import `checklist` and use `seedMap` from `generate-sample-job-pack.mjs` as the column-fill guide
- [x] 2.2 `01_client`: Tarmac only; leave non-paper columns blank
- [x] 2.3 `03_site`: Dolyhir, JA Byrne, J Abrahams
- [x] 2.4 `04_space`: name, location, site, task type, permit/rescue Yes
- [x] 2.5 `05_person`: all five named people (incl. crew workers) with site and on-paper roles; emails/phones blank
- [x] 2.6 `06_task`: full task row (reference, RAMS, permit type/number, MS/SOP, description, space, lead, dates, permit required)
- [x] ~~2.7 `07_task_crew`~~ **Removed** — crew on `05_person` only; no task crew sheet
- [x] 2.8 `08_document`: five scan rows with file path, client, MVP doc-kind from `uiType`, paper reference
- [x] 2.9 `09_document_attach`: five placements aligned with `08_document` titles and scopes
- [x] 2.10 `02_client_admin`: remain empty (no synthetic admin)

## 3. Remove task crew sheet

- [x] 3.3 Remove `07_task_crew` from `resources`, `SHEET_ORDER`, `HANDOFF_CORE_SHEETS`, and `sampleRows` in generator
- [x] 3.4 Update `docs/prompts/mvp-excel-job-pack-handoff.md` fill order (no crew sheet)

## 4. Extracted checklist — phase 2 (`10_content`)

- [x] 3.1 Populate `10_content` with 56 checklist prompt rows from `checklist` array
- [x] 3.2 Leave `task_content` and `11_content_attach` empty (headers + pad rows only)

## 5. Handoff rows and regenerate

- [x] 4.1 Confirm `CORE_DATA_ROW_PAD = 5` on phase 1 sheets
- [x] 4.2 Run `node scripts/generate-mvp-resource-fields-workbook.mjs`
- [x] 4.3 Verify **11 tabs**, seedMap coverage, and 56 checklist rows on `10_content`
- [x] 4.4 Spot-check against `SafeIn5_Sample_Documents_Seed_Map.xlsx` and sample scans

## 6. Handoff documentation

- [x] 5.1 Update teammate note: crew workers on `05_person`; `work_task_crew` at DB seed only
- [x] 5.2 Confirm `generate-sample-job-pack.mjs` still runs after export changes
