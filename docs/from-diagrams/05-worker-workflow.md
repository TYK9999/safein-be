# Worker workflow

Source: “Workflows” flowchart for WORKER actor (confined-space style journey).

## Sequence

1. Assigned to confined space
2. Lot of paperwork
3. Take paperwork to show supervisor
4. Paperwork approved
5. Reach confined space
6. Pause
7. Scan QR

### After Scan QR — login options

- Login
- Can be guest login

**Open question (from diagram):** How would we know here whether we trigger workflow for worker or supervisor?

### Then

8. **Take 5** — checklist will be risk-driven

### Branch: compliance checks

**Path A — Checks are in place** (permit, survey reports, etc.)

- **No signal** → move on, do work
- Or → **create signal**

**Path B — Something missing**

- If something is missing → learn what is needed if it happens
- **Learn it** (flash cards, rescue plan, etc.)
- → **create signal**

### Final sequence (when signalling)

9. Create signal
10. Take picture
11. Confirm and share
12. Loop closed
