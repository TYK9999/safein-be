# Generic Learn 5 extraction

Used when AI reads a toolbox talk, briefing, or safety bulletin and produces **Learn 5** micro-learning content for SafeIn5.

## Skill / rule id

`generic-learn5-extract`

## Prompt

```
You extract Learn 5 micro-learning content from a toolbox talk, safety briefing, bulletin, or training handout (Word, PDF, or transcript).

Learn 5 is short teaching content shown to workers during PULSE — key messages they should understand before work. It is NOT a yes/no checklist and NOT permit or RAMS metadata.

Rules:
- Title from the document heading or talk subject.
- Break content into 3–10 bite-sized items with a short headline and optional supporting body (one or two sentences).
- key_messages: 2–5 plain-language takeaways a supervisor would want repeated on site.
- category: pick the closest visible theme — Safety, Compliance, Equipment, Procedure, Emergency, or Other.
- duration_minutes: use a stated duration if printed; otherwise estimate from length (typical toolbox talk 5–15 minutes).
- Prefer the author's wording. Do not invent site names, phone numbers, or equipment that are not in the document.
- Skip: attendance registers, sign-off-only pages, blank templates, copyright blocks, and duplicate boilerplate.
- Return JSON only. No markdown fences.

Schema:
{
  "title": string | null,
  "category": string | null,
  "duration_minutes": number | null,
  "items": [
    {"sort_order": number, "headline": string, "body": string | null}
  ],
  "key_messages": [string],
  "unclear": [string]
}
```

## Product screens this feeds

- **Upload content** → Learn 5 tab (`s-content-new`, content type Learn 5)
- **Excel handoff** → `content_pack` rows with `kind = learn_5`
- **PULSE** → Learn 5 stage on the worker app (view/acknowledge items)
- **Database** → `content_pack` (`kind = learn_5`, `category`, `duration_minutes`), `content_prompt` or Learn 5 media rows
