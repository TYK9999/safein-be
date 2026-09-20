## Purpose

Provides a fixed-layout MVP Excel workbook with maximum coverage of values extracted from scanned job-pack images so a team can complete only the remaining gaps and later seed core Postgres tables for one work task per pack. Task crew is not a separate sheet — crew members appear on `05_person` only.

## ADDED Requirements

### Requirement: Locked eleven-sheet workbook layout
The generated workbook `docs/template/SafeIn5_MVP_Resource_Fields.xlsx` MUST contain exactly these tabs in this order and MUST NOT add, remove, or rename tabs: `01_client`, `02_client_admin`, `03_site`, `04_space`, `05_person`, `06_task`, `08_document`, `09_document_attach`, `10_content`, `task_content`, `11_content_attach`. The `07_task_crew` tab MUST NOT be present. Each tab MUST keep its existing column headers (row 1 UI labels); columns MUST NOT be added or removed.

#### Scenario: Regeneration preserves tab set
- **WHEN** `node scripts/generate-mvp-resource-fields-workbook.mjs` runs
- **THEN** the output workbook has exactly eleven tabs matching `SHEET_ORDER` with unchanged headers per sheet
- **AND** `07_task_crew` is not included

### Requirement: Maximum extracted-value coverage on phase 1 sheets
For sheets `01_client` through `06_task` and `08_document` through `09_document_attach`, the generator MUST populate every MVP column that maps to a value marked **Seeded** in `seedMap` (or equivalent extraction in `people` / `documents`) for the reference pack (Tarmac · Dolyhir · permit 098001). The generator MUST NOT leave a cell blank when the corresponding fact is on the scans and mapped in the extraction manifest.

#### Scenario: Client name from letterhead
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `01_client` row 2 contains `Tarmac` and non-paper columns (domain, status, retention) remain blank

#### Scenario: Site and space fully extracted
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `03_site` contains `Dolyhir`, site manager `JA Byrne`, and supervisor `J Abrahams`
- **AND** `04_space` contains space name `Hot Aggregate Bins`, location `Asphalt Plant, mixer house level 3`, site `Dolyhir`, task type `Confined space entry`, permit required `Yes`, and rescue plan required `Yes`

#### Scenario: People with on-paper roles and site including crew
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `05_person` lists all five people named on the papers (including permit crew T Hamnett and Nathan Whittle) with site `Dolyhir` and on-paper roles where known, and leaves email and phone blank

#### Scenario: Task row complete from permit and HIRA
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `06_task` contains reference `098001`, RAMS document title, RAMS reference `HOTBINSRA01`, permit type `Confined Space; Hot Work`, permit number `098001`, MS/SOP `HOTBINSMS01`, work description, space, task lead `Jake Marshall`, start `13 Jun 2026 06:00`, runs for `2 days`, and permit required `Yes`

#### Scenario: Documents with path, client, kind, and reference
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `08_document` has five rows (HIRA, permit, rescue plan, checklist, contractor clearance) each with a scan file path, client `Tarmac`, MVP document-kind label derived from scan classification, and paper reference

#### Scenario: Document placements complete
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `09_document_attach` has five rows with document titles matching `08_document`, correct scope (Task or Space), and targets `098001` or `Hot Aggregate Bins`

### Requirement: No synthetic or invented values
The generator MUST NOT invent emails, phone numbers, client retention/status, placeholder client-admin invites, cited-only documents without a scan file, or values listed as not-on-paper in `stillNeeded`. `02_client_admin` MUST remain header-only with no pre-filled rows.

#### Scenario: No synthetic admin or emails
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `02_client_admin` has no data rows and `05_person` email columns are blank

### Requirement: Checklist content extracted on phase 2
Sheet `10_content` MUST be pre-filled with all checklist prompt rows extracted from the IMSF confined-space checklist scans (56 prompts from `checklist` in `generate-sample-job-pack.mjs`), including title `IMSF 100 — Confined Spaces Checklist`, kind `Job Checklist`, and prompt text per row. Sheets `task_content` and `11_content_attach` MUST remain header-only with blank data rows unless a future extraction pass adds extractable values.

#### Scenario: Checklist prompts populated
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `10_content` contains 56 data rows with prompt text from the checklist scans

#### Scenario: Task content attach sheets deferred
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** `task_content` and `11_content_attach` contain no data rows beyond headers

### Requirement: Teammate blank rows on phase 1 sheets
Each phase 1 sheet (`01_client` through `06_task` and `08_document` through `09_document_attach`) MUST include at least five empty rows below existing data.

#### Scenario: Blank rows after sample data
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** each phase 1 sheet has at least five trailing empty rows after populated data

### Requirement: Consistent cross-sheet naming
Linking values MUST stay consistent: task reference `098001`, site `Dolyhir`, space `Hot Aggregate Bins`, client `Tarmac`, document titles aligned between `08_document` and `09_document_attach`, and task lead name on `06_task` matching `05_person`.

#### Scenario: Cross-sheet links align
- **WHEN** the sample Tarmac pack is regenerated
- **THEN** task lead `Jake Marshall` on `06_task` matches a row on `05_person`

### Requirement: Single extraction source
All extracted facts MUST be defined in `scripts/generate-sample-job-pack.mjs` (`people`, `documents`, `checklist`, `seedMap`) and consumed by the MVP workbook generator.

#### Scenario: Shared extraction manifest
- **WHEN** extraction is updated in `generate-sample-job-pack.mjs`
- **THEN** regenerating the MVP workbook reflects the same facts without duplicating extraction logic
