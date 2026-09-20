# Prompt: maximum MVP seed from job-pack documents

Copy everything below the line into a new agent session.

**Inputs (ask if missing):**

| Input | Purpose |
|---|---|
| `{DOCUMENT_ROOT}/**` | Scanned job-pack files (JPEG/PDF). One pack = one site/space/task cluster. |
| `db/schema/schema.sql` | Columns, NOT NULL, CHECK, FKs. |
| `src/database/schema.ts` | TypeScript enums must match SQL CHECKs. |
| `docs/template/SafeIn5_Bulk_Data_Import.xlsx` | Target workbook (one sheet per table). Regenerate via `node scripts/generate-bulk-data-import.mjs`. |
| `docs/index.html` + `docs/pwa/*.txt` | **Optional** — layer B demo only (Echoes, PULSE, Learn). |

Do **not** hard-code values from one example pack. Extract from `{DOCUMENT_ROOT}`. Use `docs/sample documents/` only as a **pattern reference**.

Do not invent schema columns. Do not skip CHECKs. Label every non-paper value.

---

## Role

Seed SafeIn5 so the back-office prototype and PWA can run against Postgres.

For **each job pack** under `{DOCUMENT_ROOT}`:

1. Classify every file.
2. Build a **pack manifest** (canonical keys — lock before writing rows).
3. Write rows to `docs/template/SafeIn5_Bulk_Data_Import.xlsx` (or update `scripts/generate-bulk-data-import.mjs` and regenerate).
4. Optionally emit rerunnable SQL under `db/seed/{pack-slug}.sql`.

**Already in schema — do not duplicate:**

- `tenant` id 1 = `community` / SafeIn5 Community
- 12 `hazard_category` rows

---

## Workflow (per pack)

```
1. List files → classify doc type
2. Extract manifest (tenant, site, space, task ref, RAMS ref, people, dates)
3. Resolve OCR duplicates → one canonical spelling per entity
4. Write data rows → source row under each data row
5. Tag cell provenance (extracted / synthetic / missing required)
6. Verify linkage + CHECKs + required (*) columns
7. Record ## Gaps (missing files, schema limits, layer B needs)
```

---

## Job-pack pattern (~1000 packs, same shape, different values)

### File classification

| Pattern | `document.doc_type` | Placement | Extract |
|---|---|---|---|
| Permit to Work (front/back) | `permit_to_work` | `work_task` | Permit no., site, location, task, types, valid from/to, issuer, acceptor, crew |
| HIRA / RAMS | `risk_assessment` | `work_task` + `rams_document_id` | RA number, MS/SOP cite, site, activity, reviewers |
| Rescue plan | `rescue_plan` | `space` | Space name, permit ref, entry, equipment, completed-by |
| Job checklist (IMSF-style) | `checklist` | `space` | Form id, **prompt text** → `content_prompt` |
| Contractor clearance | `other` | `work_task` | Company, supervisor, dates, permit types |
| Method statement / SOP | `other` or `standard` | `work_task` | Reference (file or cited-only stub) |
| Other forms | `toolbox_talk` / `standard` / `other` | `space` or `work_task` | Title, scope |

Unclassified scans → `document` + `doc_type=other` + `document_revision` + best placement.

### Canonical keys (lock once per pack)

| Key | Rule | Common mistake |
|---|---|---|
| `tenant.name` / `slug` | Letterhead client; `kind=corporate` | Subsidiary brand as tenant |
| `site.name` | HIRA/PTW site field; pick one OCR spelling | Extra sites for handwriting variants |
| `space.name` | Asset on rescue plan / PTW | Duplicate “Hot Bins” / “Hot Agg Bins” |
| `work_task.reference` | **Unique task id** per tenant (WO, internal ref, display name). Used for all workbook FKs (`work_task_name`). | Using RAMS code; duplicating across tasks; using permit number when tasks need distinct ids |
| `work_task.rams_reference` | RA number on HIRA header | Same as `reference` |
| `work_task.permit_number` | Printed PTW number from the form | Assuming it must equal `reference` |
| `document.title` | Stable; include type + ref where helpful | SQL vs workbook title drift |
| `content_pack.title` | Checklist form name | Checklist doc without matching pack |

**Workbook FKs use names, not ids:**

- `work_task_name` → `work_task.reference` (not RAMS ref)
- `document_name` → `document.title`
- `user_name` → `app_user.email` (preferred)
- `space_name`, `site_name`, `tenant_name` → `.name`

### People

Papers have names, not emails.

| Paper signal | `user_site_membership.role` | Also set |
|---|---|---|
| Permit issuer / site manager | `site_manager` | `user_site_membership` |
| Supervisor / engineering supervisor | `supervisor` | `work_task.lead_user_name` if task lead |
| Acceptor / crew / worker log | `worker` | `work_task_crew` |
| Reviewer, role unstated | *(no site row)* | `user_tenant_membership.role=member` |

- Invent email: `{pack-slug}.{first}.{last}@seed.safein5.local` (scale-safe).
- `account_status=invited`. Never real emails/phones.
- One `tenant_admin` per tenant: `{tenant-slug}.admin@seed.safein5.local` (not on paper).

### Dates, booleans, revisions

**Dates:** `13.6.26 0600` → `2026-06-13 06:00:00+01`. Never raw `13.6.26` in timestamp columns.

**Booleans:** `true`/`false`, not Yes/No.

**Revision labels (`document_revision.revision`, `content_pack.revision`):**

- Sequential per logical document/pack: **`v1`**, **`v2`**, **`v3`**, …
- First uploaded file = `v1`; each re-upload increments.
- **Never** put paper reference numbers or form edition text in `revision`.

| Paper value | Store in |
|---|---|
| RA / HIRA number (e.g. HOTBINSRA01) | `work_task.rams_reference`, document title |
| Permit number (e.g. 098001) | `work_task.permit_number`, document title |
| Task / work-order id | `work_task.reference` (unique per tenant) |
| Form edition (“Version 1 Rev 0”) | Source-row comment until `document.reference` column exists |
| Method statement code (e.g. HOTBINSMS01) | Document title; cited-only stub if file missing |
| Paper stamp (“r1 uncontrolled copy…”) | Source-row comment only |

**Each logical document:** one `document` + one current `document_revision` (`is_current=true`, `revision=v1` initially) + `document_placement`(s).

**Checklist:** both `document` (`checklist`) **and** `content_pack` (`job_checklist`) on the **same** `space_name`, plus `content_prompt` rows (one per question).

**Missing file cited on HIRA:** `document` + `document_revision` with `revision=v1`, `s3_key=seed/missing/{REFERENCE}`.

**Missing pages:** import only pages present; list in `## Gaps`. Do not invent page 4.

`s3_key` under `seed/{pack-slug}/…`; `mime_type` from file; `size_bytes` when known.

---

## Workbook rules

### Row layout

- Row 1: column headers (`*` = required).
- Row 2: website UI label (if mapped).
- Row 3+: data row, then **source row** immediately below.

```
Source files: {paths relative to DOCUMENT_ROOT}
```
or
```
Source: synthetic prerequisite — {reason}
```
or
```
Source: derived — {from which docs}
```

### Cell colours (when editing via `generate-bulk-data-import.mjs`)

| Colour | Meaning | Examples |
|---|---|---|
| **Green** (`extracted`) | Read from scans | Names, site, permit no., checklist prompt text |
| **Amber** (`synthetic`) | Not on paper | Email, QR, tenant admin, `s3_key`, derived packs, `v1` label |
| **Red** (`missing_required`) | Column is `*` but cell empty | Fix before import |
| **Grey italic** (`note`) | Source annotation row | `Source files: …` |

Tag every non-empty cell. Empty optional cells stay uncoloured.

### Minimum rows per pack (layer A)

| Table | When |
|---|---|
| `tenant`, `site`, `space`, `work_task` | Always (one task per permit unless papers show more) |
| `app_user`, memberships | All named people + 1 tenant admin |
| `document` / `document_revision` / `document_placement` | Per classified file |
| `work_task_crew` | PTW / clearance names |
| `content_pack` / `content_prompt` / `content_placement` | Per checklist form |
| `content_asset` | Optional — one row per scan file |
| `site_category_owner` | When supervisor named for confined-space routing |

**Derived content** (amber, `Source: derived`):

- `uncover` — 3–5 checks from HIRA + permit + rescue
- `learn_5` — 3–5 prompts from rescue-plan equipment
- `shift` — 2–3 optional plan tweaks

---

## Two data layers

### A — Extracted (papers only)

Default for historic bulk import. Everything traces to a file or is an allowed synthetic prerequisite (email, QR, admin).

**Do not invent as if on paper:** missing pages, missing file bytes, real contact details, HIRA hazard rows / permit tick grids / worker logs as tables (no schema columns), `auth_token`.

### B — Demo (optional)

Only when user asks for **running** Echo / PULSE / Learn screens.

- Source: `docs/index.html`, `docs/pwa/*.txt` — **not** job-pack scans.
- Separate tenant from layer A.
- Active users, verified emails, published Learn 5, pulses, signals, `checklist_completion`.
- Mark `Source: docs/index.html` or `Source: docs/pwa`.

Layer B is **not** required for historic pack import.

---

## Tables intentionally empty (layer A)

| Table | Why empty | Fix |
|---|---|---|
| `pulse`, `pulse_event`, `pulse_checklist_response`, `pulse_content_acknowledgement` | Runtime PWA journeys | Layer B or field use |
| `signal`, `signal_*`, `signal_media` | Field Echoes | Layer B |
| `checklist_completion` | Paper answers not bulk-importable | Layer B or schema change |
| `auth_token` | OTP created at sign-up / sign-in | Never seed |
| `upload_session`, `audio_clip`, `transcription_job` | No media bytes | Real S3 keys only |
| `hazard_category` | Pre-seeded in schema | Never duplicate |

---

## Known gaps (not prompt failures)

| Gap | Cause | Action |
|---|---|---|
| IMSF page 4 / cited MS file missing | **Missing file** | Add scan to folder |
| Emails, QR, tenant admin | **Not on paper** | Invent (amber); collect real emails before invites |
| IMSF Yes/No/N/A answers on paper | **Schema** — no per-answer import table | `pulse_checklist_response` at runtime or new table |
| HIRA hazard grid, permit ticks, worker log | **Schema** — document scan only | Open file in UI or add tables |
| Contractor company name | **Schema** — no contractor table | `document` only or add table |
| `document.reference` | **Schema** — column missing | Use title + `rams_reference`; add column later |
| PULSE / Echo empty sheets | **Not in job pack** | Layer B when demo needed |

---

## Scale (~1000 packs)

1. Group files by permit number, folder, or site + date.
2. Finish one pack manifest before starting the next.
3. Prefix emails and `qr_code` with pack slug to avoid collisions.
4. SQL: idempotent `ON CONFLICT` on `tenant.slug`, `app_user.email`, task `reference`, `document.title`.
5. Workbook: append packs as blocks, or one file per pack then merge.
6. Never merge unrelated packs into one site/task.

---

## Insert order (FK-safe)

`app_user` → `tenant` → `user_tenant_membership` → `site` → `user_site_membership` → `space` → `document` + `document_revision` → `work_task` (+ `rams_document_id`) → `work_task_crew` → placements / content → `site_category_owner` → pulse* → signal* → `checklist_completion`

Skip: `auth_token`, `hazard_category`, `upload_session` (unless real files).

---

## CHECK values (never UI labels)

| Column | Allowed |
|---|---|
| `tenant.kind` | `community` \| `corporate` |
| `user_tenant_membership.role` | `member` \| `tenant_admin` |
| `user_site_membership.role` | `worker` \| `supervisor` \| `site_manager` |
| `document.doc_type` | `permit_to_work` \| `risk_assessment` \| `rescue_plan` \| `checklist` \| `standard` \| `toolbox_talk` \| `other` |
| `content_pack.kind` | `job_checklist` \| `learn_5` \| `uncover` \| `shift` |
| `work_task.status` | `active` \| `archived` |
| `pulse_checklist_response.answer` | `yes` \| `no` \| `not_applicable` \| `unchecked` |
| `signal.classification` | `good_practice` \| `be_aware` \| `needs_attention_now` |
| `checklist_completion.outcome` | `carried_on` \| `changed_plan` \| `stopped` |

Contractor clearance → `doc_type=other`.

---

## Linkage (verify every pack)

- `document_placement.work_task_name` → **`work_task.reference`** (not `permit_number`, not RAMS code).
- **Multiple tasks may share the same `permit_number`** — each task still needs a **unique `reference`** within the tenant.
- HIRA placement `work_task_name` = that task’s **`reference`**, not RAMS code.
- Checklist = `document` + `content_pack` + prompts on same space.
- `rams_document_name` = HIRA title; `rams_reference` = RA number from form.
- One person, many sites → many `user_site_membership`, one `app_user`.
- Signal/Echo FKs agree with parent pulse/task/space/site/tenant.

---

## Deliverables

1. `docs/template/SafeIn5_Bulk_Data_Import.xlsx` — coloured cells, source row per data row.
2. Optional `db/seed/{pack-slug}.sql` — rerunnable, `## Gaps` header.
3. Optional pack manifest — file → type → placement → keys.
4. Smoke counts per pack.

## Done when

- [ ] Every data row has a source row.
- [ ] Green = paper; amber = invented/derived; no red on populated rows.
- [ ] All `revision` values are `v1`…`vN` only.
- Task `reference` unique per tenant; `reference` ≠ `rams_reference`; `permit_number` may repeat across tasks.
- [ ] Checklist has document + content_pack + prompts.
- [ ] No CHECK/FK violations.
- [ ] `## Gaps` lists missing files and schema limits honestly.
- [ ] Layer B separate tenant (if requested).

---

## Reference pack (pattern only — do not copy values)

`docs/sample documents/` = one Tarmac/Dolyhir confined-space pack:

- PTW + HIRA + rescue plan + IMSF checklist (pages 1–3) + contractor clearance
- Sample uses `reference` = `permit_number` = `098001` (single task on the permit) — valid but not required for all packs
- RAMS ref on `work_task.rams_reference` only
- Page 4 and method-statement file missing
- All `document_revision.revision` = `v1` for first upload

Re-run classification for every new `{DOCUMENT_ROOT}`.
