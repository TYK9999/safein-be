# MVP Excel job-pack handoff

Workbook: `docs/template/SafeIn5_MVP_Resource_Fields.xlsx`  
Source scans: `docs/sample documents/` (Tarmac · Dolyhir · permit 098001)

Regenerate:

```bash
node scripts/generate-mvp-resource-fields-workbook.mjs
```

## What is pre-filled

All values read from the scanned job pack (see `SafeIn5_Sample_Documents_Seed_Map.xlsx`):

- **01–06, 08–09**: client, site, space, people (names + roles), task, documents, placements
- **10_content**: 56 IMSF checklist prompts from the checklist scans

Crew workers (T Hamnett, Nathan Whittle) are on **`05_person`** with Worker role. There is no task crew sheet — `work_task_crew` rows are created at DB seed / import time using those person names.

## What your teammate fills in

Only gaps **not on the papers**:

- **Emails** on `05_person` (and `02_client_admin` if adding an admin)
- **Client** domain, status, retention on `01_client` (if needed for demo)
- **Site location** on `03_site` (optional — not on these scans)
- Any extra rows on sheets 01–06 and 08–09

Do **not** add columns or sheets.

## Fill order

`01_client` → `03_site` → `04_space` → `05_person` → `08_document` → `06_task` → `09_document_attach`

Keep names consistent: Task reference, Document title, Client, Site, Space.

## After handoff

Import to Postgres is not automated yet. Use `db/seed/sample-job-pack.sql` as the reference for how extracted rows map to tables (including `work_task_crew` from Worker rows on `05_person`).
