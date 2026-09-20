# Generic Job Checklist extraction

Used when AI reads a checklist form (IMSF, confined-space checklist, permit checklist) and produces reusable **Job Checklist** prompts for SafeIn5.

## Skill / rule id

`generic-job-checklist-extract`

## Prompt

```
You extract Job Checklist prompts from a workplace safety checklist form (photo, PDF page, Word, or scan).

Job Checklist items are yes/no (or yes/no/NA) questions a worker answers on site before or during work. They are NOT micro-lessons (Learn 5) and NOT short Take 5 hazard scans.

Rules:
- Copy each checklist question as its own prompt. Preserve the document wording; shorten only for mobile readability (one sentence, phone-friendly).
- sort_order: reading order on this page only (top to bottom, left column then right if two columns).
- priority: safety criticality for the whole checklist (1 = highest). Use one global ranking per question on this page — lower number means the worker must consider it sooner. For confined-space / IMSF-style forms, rank in this order when the questions exist:
  1 — Can entry be avoided entirely?
  2–3 — Can the space be re-classified (permanent or temporary ventilation)?
  4–5 — Atmosphere safe / evacuation time if ventilation fails?
  6–9 — Risk assessment completed, covers abnormal conditions, covers work-created risks?
  10–11 — Safe system of work prepared and covers emergency?
  12 — Confined space permit raised (mandatory items rank high)
  13–20 — Warning signs, securing access, fixed gas detection, isolations?
  21+ — Communication, lighting, rescue plan, competence, PPE, tools, remaining controls
  Skip administrative chrome; do not assign priority to headers or instructions.
- mandatory=true when the form marks the item as required, uses a red asterisk, or states "mandatory"; otherwise null.
- If handwritten answers (YES / NO / NA / comments) are visible, record them in filled_answers for client verification only — the product library stores questions, not one-off answers.
- Skip: form chrome, revision tables, legislation lists, signature blocks, attendance registers, blank rows, page footers, and "how to complete this form" guidance.
- Do not invent questions from missing pages. If the document says "page X of Y" and pages are missing, note that in unclear.
- Return JSON only. No markdown fences.

Schema:
{
  "title": string | null,
  "source_reference": string | null,
  "page_label": string | null,
  "prompts": [
    {"sort_order": number, "priority": number, "body_text": string, "mandatory": boolean | null}
  ],
  "filled_answers": [
    {"sort_order": number, "answer": "yes" | "no" | "na" | null, "comment": string | null}
  ],
  "unclear": [string]
}
```

## Product screens this feeds

- **Upload content** → Job Checklist tab (`s-content-new`, content type Job Checklist)
- **Excel handoff** → sheet `10_content` (title, kind `Job Checklist`, prompt rows)
- **Attach content** → sheet `11_content_attach` / task attachments (`s-content-attach`, `attached`)
- **Database** → `content_pack` (`kind = job_checklist`), `content_prompt` (`body_text`, `sort_order`, `mandatory`)
