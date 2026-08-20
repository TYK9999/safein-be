---
name: git-commit
description: Create a Conventional Commit from the current SafeIn5 backend diff, confirm with the user, then stage and commit (optionally push). Use when the user says commit, do a commit, or create a commit message.
---

# Git commit

## Steps

1. Run in parallel: `git status`, `git diff` (staged + unstaged), `git log -5 --oneline`.
2. Draft a Conventional Commits message (`feat|fix|chore|refactor|test|docs|style|perf|build|ci|revert`) focused on **why**.
3. Show the proposed message and ask: `Proceed? [Y/n/edit]`.
4. On **Y**: stage relevant files (never `.env` or secrets) → `git commit` → show `git status`.
5. Push **only** if the user explicitly asked to push. Do **not** open a PR here.

## Rules

- Never update git config, skip hooks, or force-push
- Never commit unless the user confirms (or clearly asked to commit in this turn and confirmed the message)
- Follow repo commit-message style from recent `git log`
