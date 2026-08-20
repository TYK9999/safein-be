---
name: raise-pr
description: Run SafeIn5 backend quality gates then open a GitHub pull request with gh. Use when the user says raise PR, open a PR, create a pull request, or submit a PR.
---

# Raise PR

## Quality gates (stop on first failure)

Run sequentially (adapt if `package.json` scripts differ):

1. `npm run lint` (or project ESLint script)
2. Format check: `npm run format:check` if present, else Prettier check on touched files
3. `npm run typecheck` or `npx tsc -p tsconfig.build.json --noEmit`
4. Unit tests: `npm test` / `npm run test:unit` (prefer the script defined in `package.json`)

## Open the PR

1. Confirm branch tracks remote; `git push -u origin HEAD` if needed.
2. Ask for base branch (default: `main`) if unclear.
3. Analyze full branch diff vs base (`git log`, `git diff base...HEAD`).
4. Create PR with `gh pr create` — summary + test plan. Note API-spec or schema deviations.
5. Return the PR URL.

## Rules

- Do not force-push to `main`/`master`
- Do not skip failing gates unless the user explicitly overrides
- Prefer GitHub MCP when authenticated; otherwise use `gh`
