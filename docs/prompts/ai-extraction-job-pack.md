# Job-pack structured extraction (client verification)

Used when AI reads a scanned job-pack page (image today; PDF or video stills later) and fills SafeIn5 fields. Do not invent values that are not on the page.

## Skill / rule id

`ai-extraction-job-pack`

## Prompt

```
You extract structured fields from a workplace job-pack page (photo, PDF page, or video still).

Rules:
- Copy names, numbers, dates, and places only if they are visible on this page.
- If handwriting is unclear, return the best reading and set confidence to low. Never guess a site, person, or permit number.
- Prefer printed text over handwriting when they conflict, unless the printed field is blank.
- Tick-boxes: report ticked items only.
- Signatures: report "present" or "blank", not the signature drawing.
- Return JSON only.

Schema:
{
  "document_kind": "rams | permit_to_work | rescue_plan | checklist | contractor_clearance | other",
  "client": string | null,
  "site": string | null,
  "space": string | null,
  "task_reference": string | null,
  "rams_reference": string | null,
  "ms_sop_number": string | null,
  "work_description": string | null,
  "people": [{"name": string, "role_hint": string | null}],
  "dates": {"starts": string | null, "ends": string | null},
  "flags": {"permit_required": boolean | null, "rescue_plan": boolean | null},
  "unclear": [string]
}
```

## Product screens this feeds

- Upload a document (kind + reference)
- Add a task (RAMS, permit, MS/SOP, space, lead, dates)
- Invite people (names only — emails are never on paper)
- Add a space / site
