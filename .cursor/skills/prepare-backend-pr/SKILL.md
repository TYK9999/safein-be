---
name: prepare-backend-pr
description: Run SafeIn5 backend quality gates and draft Conventional Commit / PR materials without necessarily opening the PR. Use when the user asks to prepare a PR, preflight changes, or verify readiness before raise-pr.
---

# Prepare backend PR

Preflight only. To create the GitHub PR afterward, use the `raise-pr` skill.

## Steps

1. Confirm changes are under live paths (`src/modules/`, `src/config/`, `src/database/`, `db/`, `api/`, docs) — not legacy `src/qrcode/` / `src/uploads/`.
2. Run the same gates as `raise-pr` (lint → format check → typecheck → unit tests); stop on first failure.
3. If env or schema changed, confirm `.env.example` and `db/schema/schema.sql` ↔ `src/database/schema.ts` stayed in sync.
4. Draft Conventional Commit message and PR body (summary + test plan). Note API-spec deviations.

## Checklist

- [ ] E1–E4 quality rules satisfied
- [ ] Branch follows `feature/*` or `bugfix/*` (G2)
- [ ] No secrets in diff
- [ ] Tenant filters preserved on DB queries
- [ ] Typecheck + relevant tests green
