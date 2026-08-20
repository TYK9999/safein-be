# SafeIn5 MVP — Product & UX Implementation Summary

**Scope:** Phase 1 MVP. Worker PWA + Supervisor surfaces + Admin Console.
**Sources reconciled:** Dev Pack V9 (§4 behavioural rules, §6 frame map, §7 workflow, §8 QR, §13 acceptance, §14 metrics, §15 human factors), Tender Pack (WRK-001–024, ADM-001–043, SCP-001–067, QA/CQA, Success Metrics), Talentica Proposal (scope, NFRs, stack, M1–M5), Rigging & Fixtures scenario, and the in-flight Business PRD (decisions Q16–Q24).

**Binding decisions carried forward from the PRD (do not re-litigate):**
- Figma Frames 01–10 are authoritative for the Worker PWA; Admin + Supervisor are designed fresh (PRD §5.1).
- Anonymity is **account-level**, not per-signal; no individual closure notification — closure is public on the signal (PRD §5.5).
- **Guest reads, account writes** — QR/PULSE/Rescue/Learn5/Feed are unauthenticated; submitting a signal requires an account (PRD §5.6).
- PULSE is **always the full sequence**, no condensed repeat-scan variant (PRD §5.7).
- Learn5 is **natively hosted** with an external-link adapter fallback (PRD §5.8).
- Supervisor workflow for MVP is **Acknowledge + Close only**; the Dev Pack §7 five-state machine is Phase 2, but the data model must not preclude it (PRD §5.4).

---

## 1. Worker PWA — Complete Screen Inventory

### 1.1 Screens covered by the Figma frames

| ID | Screen | Frame | Requirement anchor | Purpose & must-have behaviour |
|---|---|---|---|---|
| W-04 | **Feed** ("What's being shared") | 04 | WRK-012, WRK-013, WRK-024, SCP-012/013 | Card-based (explicitly **not** reel/social — WRK-012 amendment, CQA-011). Default scope = current sub-site context. Severity-ordered. Persistent FAB → Capture. Sticky context chip showing active site/sub-site with "Scan another QR" affordance. |
| W-05 | **Capture** | 05 | WRK-008, WRK-009, WRK-019, WRK-020, SCP-008/009/019/020 | Single screen. Camera viewfinder is the screen, not a step. Photo (multi, simple), video (≤30s hard cap per Talentica NFR), voice memo, optional text. **Zero mandatory fields.** No dropdowns. |
| W-06 | **Classification** | 06 | WRK-010, CQA-005 | Exactly three full-width targets: **Good Practice / Be Aware / Needs Attention Now**. One tap finalises. Must complete in <10s (Dev Pack §1.1, §4). |
| W-07 | **Confirmation** | 07 | Dev Pack §6, §15.2 | Reinforcement copy, not a receipt. Exit routes: back to work (primary), view in feed, share another. |
| W-08/09 | **Search & Learn5 browse** | 08/09 | WRK-014, WRK-021 (basic only), SCP-014 | Keyword search over signals + Learn5 (Postgres FTS). Filter chips: classification, sub-site. Deep search is Phase 2 (WRK-021 deferred). |
| W-10 | **PULSE (Take5 → renamed PULSE)** | 10 | WRK-005, CQA-004, SCP-005 | Sequential P/U/L/S/E. Contextual content from QR. Non-blocking, skippable at every step. |

### 1.2 Screens the frames do **not** cover but the requirements demand

| ID | Screen | Requirement anchor | Why it must exist | Design notes |
|---|---|---|---|---|
| W-11 | **QR landing / context interstitial** | Dev Pack §8.1–8.3, WRK-004/015/016 | QR is a *primary* entry point. Resolving a QR must confirm context before routing, or workers cannot trust what the app thinks it knows. | Full-bleed, ≤1.5s visible. Shows Site › Sub-site › Asset › Task › Risk type as read-only chips. Auto-advances to the QR's configured destination; three large destination buttons if multi-destination (PULSE / Rescue Plan / Learn5). Must render before auth check. |
| W-12 | **Rescue Plan viewer** | Dev Pack §8.3, WRK-006, SCP-006 | Named mandatory content block: location/asset, immediate actions, roles & responsibilities, required equipment, escalation contacts, version/review date. | Emergency-optimised: no scroll to reach "Immediate actions" and "Call" buttons. `tel:` links on escalation contacts. Version + review date always visible in footer. Must render from cache if offline. |
| W-13 | **Learn5 viewer (card)** | WRK-004, WRK-007, CQA-010, PRD §5.8 | Native content type: title, short description, media, optional links to Behaviour Signals. | Max 5 points per card (the "5" is literal — WRK-004: "5 points in one page"). Fires `learn5.viewed` on open and `learn5.completed` on last-card reach/scroll-end — required for the Learn5 success metric. External adapter opens in-app browser with return affordance. |
| W-14 | **Site / Sub-site directory** | WRK-007, SCP-007 | Worker without a QR must still reach site content; sub-site list with search is explicitly specified. | Search box + list; each row → sub-site hub (Learn5 / PULSE / Rescue Plan / Feed). |
| W-15 | **My Signals (status list)** | CQA-012, Dev Pack §15.5, §17 Scenario 5 | The single most important anti-"black hole" screen. | Per-signal state: `Uploading → Shared → Seen by supervisor → Actioned/Closed`. Shows closure comment. Hidden/disabled when the account is in anonymous mode? **No** — it remains, sourced from a device-local signal-id list, so anonymity is not compromised (see §6.3). |
| W-16 | **Profile & Anonymity setting** | Dev Pack §5, §15.4, PRD §5.5 | Anonymity is an account-level setting, so it needs a home outside the capture flow. | One toggle + an honest plain-English explanation of the MVP anonymity limit (display-level + data-layer stripping; admins may retain technical correlation). Overpromising here is a larger trust risk than not offering it. |
| W-17 | **Permissions priming** | Dev Pack §5 (geolocation "where permissions allow"), WRK-008/009 | Browser permission prompts fired cold destroy the 60s budget and get denied. | Pre-prompt explains camera / microphone / location / notifications *in worker language* before the OS dialog. Camera+mic primed at first Capture entry; location primed silently (optional, never blocking); notifications primed only after the first successful share. |
| W-18 | **Install / Add-to-Home-Screen prompt** | Dev Pack §10 (explicit PWA line item) | "Add to Home Screen" is a named deliverable and is the mechanic that makes repeat usage possible. | Deferred `beforeinstallprompt`, shown after the **second** successful signal (never on first run). iOS Safari needs a manual illustrated instruction sheet — no API. |
| W-19 | **Offline / queued / failed-upload state** | WRK-011, CQA-008, SCP-011 | "Handle failed uploads gracefully and avoid data loss where practical" is the literal MVP commitment. | Three distinct visual states: *Queued* (amber, "Will send when you have signal"), *Sending* (progress), *Failed* (red, single "Retry" button + "Keep for later"). Never a raw error string. Never silently drops payload. |
| W-20 | **Empty states** (feed, search, my-signals, sub-site with no content) | UX completeness | Pilot sites start with zero content; a blank feed on day one reads as a broken app. | Feed empty = invitation to capture, not an apology. Search empty = suggested filter chips. Caught-up boundary is its own state (§5). |
| W-21 | **"You're caught up" boundary card** | WRK-013 (verbatim requirement) | Explicitly specified: *"You caught up! Further scrolling will show old observation."* | Full-width divider card, not a modal. Scroll continues past it into history. |
| W-22 | **Signal detail** | WRK-012, ADM-031 parity, CQA-012 | Feed cards must open to media, full caption/transcript, context, classification, and the acknowledgement/closure banner. | Closure banner is public — this is the mechanism by which anonymous reporters receive feedback. |
| W-23 | **Scan another QR (in-app scanner)** | WRK-015/016/017/018, SCP-015–018 | Workers move between zones mid-shift; context must update without friction. | Reachable in one tap from the feed header. On resolve → W-11 interstitial → context switches → feed re-scopes. |
| W-24 | **Auth: enter-email → OTP / magic link** | WRK-001, WRK-002, SCP-001/002 | Required only at the submit boundary. | Triggered lazily *after* capture is complete — see §3, step gate G. Never on app open. |
| W-25 | **Community feed (general)** | WRK-024, SCP-024 | Good practice from the whole user base; must not leak corporate content. | Tab or segmented control on W-04. Hard tenant boundary enforced server-side, not in the client. |
| W-26 | **Notification permission + inbox (light)** | WRK-022, SCP-022 | MUST-flagged web push for urgent hazard in zone. | Web-push VAPID. MVP = supervisor-triggered / rule-threshold only; predictive nudges are deferred (WRK-023). |

**Supervisor-on-PWA (same app, role-gated — Talentica Experience Layer):**

| ID | Screen | Purpose |
|---|---|---|
| S-01 | Supervisor feed (all sub-sites in scope, unread-first, Needs-Attention-Now pinned) | Situational awareness |
| S-02 | Signal detail with action bar (Acknowledge / Close-with-comment) | The closure loop |
| S-03 | Simple trend strip ("3 similar Be Aware in 2 weeks, this sub-site") | The SafeIn5.md Step 7 manual-trend moment |

---

## 2. Admin Console — Screen Inventory mapped to ADM-xxx

Desktop web (Next.js, **not** a PWA). Designed fresh — no frame coverage.

| ID | Screen | ADM IDs | Contents |
|---|---|---|---|
| A-01 | **Admin login** | ADM-001, ADM-002 | Email + password (bcrypt) or OTP. |
| A-02 | **Forgot password** | ADM-003 | Emailed reset link. |
| A-03 | **Dashboard** | ADM-004, ADM-005, ADM-038 | KPI cards: Good Practice / Be Aware / Needs Attention Now counts (SafeIn5 labels only — ADM-004 amendment). Latest-5 signals panel (ADM-005). Category % split (ADM-038). |
| A-04 | **Global navigation shell** | ADM-007–011 | Sites · Users · Feed · Master Library · Intelligence & Analytics. |
| A-05 | **Site list** | ADM-012, ADM-013 | Name, city, worker count, observation count, QR thumbnail + download, drill-through to workers/observations. |
| A-06 | **Site detail** | ADM-013, ADM-014 | Expandable sub-site tree (nested child nodes). Shows attached PULSE prompts, Learn5, Rescue Plan. |
| A-07 | **Create site** | ADM-015, ADM-017, ADM-018 | Name, city, auto-QR generation on save. |
| A-08 | **Add / edit sub-site** | ADM-016, ADM-021 | Same fields + own auto-QR. |
| A-09 | **Assign workers to site** | ADM-019, ADM-022 | Searchable list of unassigned ("on bench") workers. |
| A-10 | **Site content editor** | ADM-020 | Text-field authoring for Learn5, PULSE prompts, Rescue Plan per site/sub-site. |
| A-11 | **Delete site** | ADM-023 | Destructive confirm; states explicitly that QR codes stop working and assigned workers return to bench. |
| A-12 | **Worker directory** | ADM-024 | Paginated table: name, email, site assignment, activity volume. |
| A-13 | **Create worker** | ADM-025, ADM-026, ADM-027 | Name + email → automated invitation email → site assignment. |
| A-14 | **Edit worker** | ADM-029, ADM-030 | Update site assignment, update email. |
| A-15 | **Block / delete worker** | ADM-028 | Blocking must not delete their signals (learning survives the person). |
| A-16 | **Feed moderation list** | ADM-031, ADM-032 | Photo, caption, site/sub-site, timestamp, worker profile (**suppressed when anonymous**). Filters: classification flag, site, sub-site, worker. |
| A-17 | **Edit observation** | ADM-033 | Update classification / caption. **Every edit written to append-only audit log and surfaced as "edited by admin" on the signal** — ADM-033's amendment requires it be "controlled and auditable". |
| A-18 | **Delete / hide observation** | ADM-034 | Soft-delete preferred; hard delete only for GDPR erasure. |
| A-19 | **QR register** | ADM-012, ADM-018, QA-004 | List of all QR codes: context mapping, destination(s), active/inactive, printable PDF, "tested/active" flag (QA-004 nice-to-have). Target capacity **30 mappings** (Dev Pack §8.6). |
| A-20 | **Learn5 library** | ADM-010, CQA-010 | CRUD for ~20–30 native Learn5 modules; media upload; map to site/sub-site/risk type; external-URL mode. |
| A-21 | **Rescue Plan library** | Dev Pack §8.3 | Structured editor with the six mandatory blocks + version/review date. |
| A-22 | **Intelligence & Analytics** | ADM-037, ADM-038, ADM-039 | Leading-indicator volume over time; category breakdown; site/crew **engagement** table — labelled engagement, never "performance" (ADM-039 amendment). |
| A-23 | **Rule-based alert config** | ADM-040 | Simple numeric threshold ("N × Needs Attention Now in a sub-site within X days"). Must be explicitly labelled rule-based, never "predictive". |
| A-24 | **GDPR / data tools** | Talentica NFR, Dev Pack §7 | Export, delete, retention policy view; audit log viewer. |
| A-25 | **Tenant/org setup** | QA-006, CQA-001 | 3 orgs × 3 sites + shared Community tenant. Logo + colour theming only. |

**Explicitly NOT built (deferred/out):** risk heat map (ADM-006), master-library CRUD for risk options and cities (ADM-035/036), AI pattern recognition (ADM-041/042), cross-site benchmarking (ADM-043). A-04 still shows a "Master Library" nav item per ADM-010 but it contains only Learn5 + Rescue Plans in MVP.

---

## 3. The <60-Second Capture Path — Tap-by-Tap with Time Budget

**Measured boundary (for acceptance):** from `tap on FAB / "Share Observation"` to `classification committed to server-acknowledged draft`. Media upload completion is explicitly **outside** the budget (Dev Pack §4: media must be async).

### 3.1 Warm path — worker already in the app, context known

| # | Step | Screen | Interaction | Budget | Cumulative |
|---|---|---|---|---|---|
| 1 | Tap FAB | W-04 Feed | 1 tap | 1.0s | 1.0s |
| 2 | Camera live | W-05 Capture | *(none — viewfinder already warm)* | 0.5s | 1.5s |
| 3 | Frame & shoot | W-05 | 1 tap shutter | 6s | 7.5s |
| 4 | Confirm / retake | W-05 | 0–1 tap (default = keep) | 2s | 9.5s |
| 5 | Hold-to-talk voice note | W-05 | press-and-hold ~10s | 12s | 21.5s |
| 6 | Release → transcript appears optimistically | W-05 | 0 taps | 1s | 22.5s |
| 7 | Tap **Next** | W-05 | 1 tap | 1.5s | 24.0s |
| 8 | Classification | W-06 | 1 tap on one of 3 | 6s | 30.0s |
| 9 | Server ack (optimistic UI already advanced) | W-07 | 0 taps | 1.0s | 31.0s |
| 10 | Confirmation read + exit | W-07 | 1 tap | 4s | **35.0s** |

**Warm path total: ~35s. 25s of headroom against the 60s NFR.**

### 3.2 Cold path — QR scan from lock screen, first submission of the day

| # | Step | Budget | Cumulative |
|---|---|---|---|
| A | OS camera → QR detect → open URL | 4s | 4s |
| B | PWA shell paint (cached app shell, service worker) | 1.5s | 5.5s |
| C | W-11 context interstitial, auto-advance | 1.5s | 7.0s |
| D | Tap "Share Observation" (skipping PULSE) | 1.5s | 8.5s |
| E–L | Steps 2–10 above | 34s | 42.5s |
| G | **Auth gate** *(first time only — see below)* | 12s | 54.5s |

**Cold path with first-ever auth: ~55s. Still inside 60s — but only because of gate placement.**

### 3.3 The design decisions that protect the budget

**Deferred (moved out of the critical path):**
- **Authentication (gate G).** Never on app open. The account wall appears *after* classification, on the Confirmation transition, with the draft already held locally. Copy: "Nearly there — confirm your email so this signal is yours." If the worker abandons, the draft persists 7 days. This is what makes "guest reads, account writes" survivable.
- **All context capture.** Site/sub-site/asset/task/risk type arrive from the QR or the last-known context. Zero worker input. This is the single biggest budget saving versus a traditional form.
- **Geolocation.** Requested in the background, never awaited, never blocking. If the fix is not back by submit, the signal ships without it.
- **Media upload.** Kicked off at shutter-release, runs in the background via the outbox/queue. The worker reaches Confirmation while bytes are still moving.
- **Transcription.** Voice note is attached as audio immediately; the speech-to-text result is patched onto the signal asynchronously. A failed transcription degrades to a playable audio clip, never blocks.
- **Notification and install prompts.** Never on the first run.

**Pre-warmed:**
- **Camera stream** is acquired on Feed mount (`getUserMedia` held warm) so the viewfinder is live the instant Capture opens. Released on backgrounding to respect battery/privacy.
- **App shell** precached by the service worker; the Feed renders from TanStack Query cache with a background revalidate.
- **Context object** resolved and cached at QR scan; the classification screen is preloaded as a route chunk while the worker is still framing the shot.
- **Draft row** created server-side on shutter press, not on submit — so classification is a `PATCH`, not a `POST` with a payload.

**Optimistic:**
- Classification advances the UI to Confirmation *immediately*; the server ack is reconciled behind it. A failure surfaces on W-15 My Signals, not as a modal in the worker's face.
- The signal appears in the local feed instantly (own-signal optimistic insert) so "see it appear in the feed" (Dev Pack §13.1) is satisfied without a round trip.
- Transcript text renders as soon as the on-device/streamed result arrives, editable but never required.

**Hard prohibitions on this path:** no dropdown, no date picker, no free-text required field, no confirmation dialog, no multi-select, no "are you sure", no rating, no severity slider, no assignee picker, no tag input (manual tagging is explicitly out of scope per the proposal).

---

## 4. PULSE Flow Design — Five Letters Without Five Walls of Friction

**The constraint:** PULSE is a sequence (PRD §5.7, Frame 10 is authoritative) with a <5-minute budget (Dev Pack §3), and it **must not block work** (WRK-005: "fast, non-blocking… zero data input"). Five sequential screens with no escape would breach that.

**Resolution: 5 steps, 3 screens, 1 always-available exit.**

| Letter | Screen | Content | Input | Exit affordance |
|---|---|---|---|---|
| **P — Pause** | PULSE-1 | Full-bleed context header (from QR) + one line: *"Stop before the lift starts."* Auto-dwell 3s with a visible progress ring, then the Next control enables. | None | ✕ "Not now" top-right, always |
| **U — Uncover** | PULSE-1 (same screen, revealed below the fold on Next) | 2–4 site-configured reflective prompts: *"What looks different today?" "What could go wrong?"* Read-only checklist styling, **no checkboxes** — checkboxes imply completion obligation. | None | ✕ |
| **L — Learn** | PULSE-2 | One contextual Learn5 card pulled by risk type from the QR context. Single card, not a library. Fires `learn5.viewed`. | None | ✕ · "More on this" → W-13 |
| **S — Shift** | PULSE-2 (footer band) | *"Make one deliberate improvement."* A single prompt, not a form. | None | — |
| **E — Echo** | PULSE-3 | *"Share this moment so others stay safe?"* Two buttons: **Share Observation** (primary, → W-05 Capture with context pre-attached) and **Done** (secondary, closes the session). | 1 tap | Both are exits |

**Rules that keep PULSE honest:**
1. **Every screen is dismissible.** ✕ closes to the sub-site feed and still records `pulse.session.started` + `pulse.abandoned_at_step`. A worker who bails at U is data, not failure.
2. **PULSE never gates capture.** Capture is reachable directly from the feed FAB and directly from the QR interstitial. A worker under crane-window pressure must never have to complete PULSE to report.
3. **PULSE never gates the Rescue Plan.** In an emergency the rescue route must be one tap from the QR interstitial, bypassing PULSE entirely.
4. **No typing anywhere in PULSE.** Zero data input is the WRK-005 requirement; the only tap that produces data is E → Share.
5. **Session record regardless.** A `PULSE Session` object is created on P and finalised on Done/Echo/abandon, carrying full context. This is what makes "engagement with PULSE" (Dev Pack §14) measurable and what links a session to its resulting Behaviour Signal.
6. **Instrument repeat-scan fatigue** (PRD §5.7 risk): log time-on-step per letter and repeat-scan frequency per QR context, so tap-through behaviour is detectable in the pilot even though no adaptive variant ships.

**Time budget:** P 5s · U 25s · L 40s · S 15s · E 10s ≈ **95 seconds** typical, well inside 5 minutes, and the Echo→Capture handoff starts the 60s capture clock fresh.

---

## 5. Feed Ranking, Scoping and Read-State — Pseudo-code

Derived from WRK-012, WRK-013, WRK-014, WRK-024, SCP-012–014.

```pseudo
CONSTANTS:
  SEVERITY_RANK = { NEEDS_ATTENTION_NOW: 0, BE_AWARE: 1, GOOD_PRACTICE: 2 }
  CAUGHT_UP_COPY = "You're caught up. Keep scrolling to see older observations."

INPUT:
  viewer            // user or guest session
  context           // { tenantId, siteId, subSiteId } from last QR scan or assignment
  filters           // { classifications[], subSiteIds[], query }
  scope             // SITE_FEED | COMMUNITY_FEED

// ---------- 1. TENANT + SCOPE GATE (server-side, RLS-enforced) ----------
function candidateSet(viewer, context, scope):
    if scope == COMMUNITY_FEED:
        return signals.where(tenant == COMMUNITY_TENANT
                             AND moderation_state == APPROVED
                             AND deleted_at IS NULL)
    // Corporate site feed
    assert viewer.tenantId == context.tenantId          // never cross tenants
    return signals.where(tenant == context.tenantId
                         AND site == context.siteId
                         AND deleted_at IS NULL
                         AND hidden_by_admin == false)

// ---------- 2. SUB-SITE SCOPING (WRK-013) ----------
function applySubSiteScope(rows, context, filters):
    if filters.subSiteIds is not empty:
        return rows.where(subSiteId IN filters.subSiteIds)
    if context.subSiteId != null:
        // Primary band = where the worker physically is.
        // Secondary band = rest of site, appended AFTER the caught-up boundary.
        primary   = rows.where(subSiteId == context.subSiteId)
        secondary = rows.where(subSiteId != context.subSiteId)
        return { primary, secondary }
    return { primary: rows, secondary: [] }

// ---------- 3. READ STATE ----------
// read_receipts(userId, signalId, readAt). Guests use device-local storage.
function isUnread(signal, viewer):
    if viewer.isGuest:  return not deviceLocalReadSet.has(signal.id)
    return not readReceipts.exists(viewer.id, signal.id)

// ---------- 4. ORDERING ----------
function rank(signal, viewer):
    return [
      isUnread(signal, viewer) ? 0 : 1,              // unread always above read
      SEVERITY_RANK[signal.classification],          // NAN > BE_AWARE > GOOD_PRACTICE
      -signal.createdAt                              // newest first within a band
    ]
    // NOTE: no engagement/popularity term. CQA-011 forbids social-media mechanics.

function orderFeed(rows, viewer):
    return rows.sortBy(r => rank(r, viewer))         // lexicographic on the tuple

// ---------- 5. CAUGHT-UP BOUNDARY (WRK-013, verbatim requirement) ----------
function assembleFeed(viewer, context, filters, scope):
    base            = candidateSet(viewer, context, scope)
    base            = applyFilters(base, filters)     // classification, query (FTS)
    { primary, secondary } = applySubSiteScope(base, context, filters)

    unreadPrimary   = orderFeed(primary.where(isUnread), viewer)
    readPrimary     = orderFeed(primary.where(not isUnread), viewer)
    secondaryAll    = orderFeed(secondary, viewer)

    feed = []
    feed.append(unreadPrimary)

    if unreadPrimary.isEmpty():
        feed.append(EMPTY_STATE_CARD("Nothing new in this area right now."))
    else:
        feed.append(CAUGHT_UP_BOUNDARY_CARD(CAUGHT_UP_COPY))

    feed.append(readPrimary)                          // history, same sub-site
    feed.append(SECTION_HEADER("Elsewhere on this site"))
    feed.append(secondaryAll)
    return paginate(feed, cursor = keyset(createdAt, id))

// ---------- 6. READ RECEIPT WRITE ----------
onCardVisible(signal, durationMs):
    if durationMs >= 1000 and viewer.isAuthenticated:
        upsert readReceipts(viewer.id, signal.id, now())   // debounced, batched
    // Read receipts are per-viewer and are NEVER exposed to the signal's author
    // or to admins as a per-person list — see §8 "must never show".

// ---------- 7. CONTEXT SWITCH ----------
onQrScanned(newContext):
    context = newContext            // WRK-015/016: no friction, no confirmation modal
    invalidateFeedCache()
    scrollToTop()
    showToast("Now showing " + newContext.subSiteName)
```

**Ordering invariant to test:** an unread `Good Practice` outranks a read `Needs Attention Now`. This is deliberate — the read band is history. If a supervisor disagrees during UAT, change the tuple order, not the code shape.

---

## 6. Supervisor Workflow — States, Affordances, and the Closure Loop

### 6.1 MVP state machine (Acknowledge + Close only)

```
SHARED ──(Acknowledge)──> ACKNOWLEDGED ──(Close + comment)──> CLOSED
   │                            │
   └────────(Close + comment)───┘        // direct close permitted
```

Persisted with the Dev Pack §7 five-state vocabulary reserved but unused (`NEW/ASSIGNED/ACKNOWLEDGED/ACTIONED/CLOSED` enum present; MVP writes only three values). This satisfies PRD §5.4's "must not preclude Phase 2".

| State | Who sets it | UI affordance | Server effects | Worker-visible result |
|---|---|---|---|---|
| **Shared** | System, on classification | — | Signal finalised, indexed, routed to site feed | Appears in W-04 and W-15 as "Shared" |
| **Acknowledged** | Supervisor | S-02 action bar: single primary button **"Acknowledge"**. One tap. No dialog, no mandatory comment — friction here means it never happens. | `workflow_events` append-only row: actor, timestamp, from/to state. `signal.acknowledged_at` set. | Public banner on W-22: *"Seen by the site team — 14 Mar, 09:12"*. W-15 row flips to "Seen". |
| **Closed** | Supervisor | S-02 secondary button **"Close with update"** → sheet with a **required** short comment (this is the only mandatory field anywhere in the product, and it is on the supervisor, never the worker) + optional photo. | `workflow_events` row; `signal.closed_at`, `closure_comment`, `closure_media_id`. | Public green banner: *"Actioned — [comment]"*. W-15 row flips to "Actioned". |
| **Reopen** | Supervisor | Tertiary, on a closed signal | New event row; state back to ACKNOWLEDGED | Banner reverts with history preserved |

**Explicitly not in MVP:** assignment to a named individual, evidence-required-before-close configuration, due dates, SLA timers, escalation chains. All are Dev Pack §7 and all are Phase 2.

### 6.2 Supervisor entry points

1. **Push notification** on any `Needs Attention Now` in their scope (web-push VAPID, WRK-022).
2. **S-01 supervisor feed**, default sort: unacknowledged `Needs Attention Now` → unacknowledged `Be Aware` → everything else.
3. **A-03 admin dashboard** recent-activity panel (ADM-005).
4. **S-03 trend strip** — the manual pattern moment from SafeIn5.md Step 7: a passive banner reading *"3 similar Be Aware signals in this sub-site in the last 14 days"*, computed by a plain SQL count over classification × sub-site × rolling window. No AI. Tapping it filters the feed.

### 6.3 The worker-facing closure loop (defeats Dev Pack §17 Scenario 5)

Five mechanisms, deliberately redundant, because a single channel breaks under anonymity:

1. **Public banners on the signal itself.** Acknowledgement and closure render on W-22 for *every* viewer, not just the author. This is the load-bearing mechanism: it proves to the whole crew that signals get actioned, and it is the only channel that works for anonymous reporters.
2. **W-15 My Signals.** Device-local list of signal IDs the device authored (kept client-side, so it survives anonymous mode without the server holding a resolvable link). Status column mirrors the workflow state.
3. **Non-anonymous push notification.** For signals from a named account: *"Your signal about the lifting zone has been actioned."* Suppressed entirely when the account is anonymous.
4. **Feed re-surfacing.** A newly closed signal is re-marked unread for the whole sub-site for 24h, so closure appears in the feed as news, not as an archived footnote.
5. **Admin-visible response-time metric** (A-22): median time Shared→Acknowledged and Shared→Closed per site. Dev Pack §17 Scenario 5 explicitly asks for "corporate dashboard should track response and closure times". This is the number that tells SafeIn5 whether the black hole is opening.

**Anti-pattern to enforce in code review:** no signal may reach 7 days in `SHARED` without the supervisor dashboard flagging it. A silent backlog is the failure mode the whole product is built to avoid.

---

## 7. Field Ergonomics Rules

Binding rules for design QA and for the component library. These are acceptance criteria, not guidance.

| # | Rule | Value | Applies to |
|---|---|---|---|
| E1 | **Minimum touch target** | **56 × 56 px** for any primary action (shutter, classification tiles, PULSE Next, FAB). **48 × 48 px** absolute floor for any interactive element anywhere. Exceeds WCAG 2.5.5 (44px) deliberately — gloved fingertips have a larger, less precise contact patch. | All |
| E2 | **Target spacing** | ≥ 12 px between adjacent targets; ≥ 24 px between targets with different consequences (e.g. Retake vs Next). | All |
| E3 | **Classification tiles** | Full screen width, ≥ 88 px tall, stacked vertically, colour + icon + label (never colour alone). Ordered **Needs Attention Now / Be Aware / Good Practice** top-to-bottom so the urgent option is under the thumb first. | W-06 |
| E4 | **One-handed reachability** | Every primary control in the **bottom 40%** of the viewport. Nothing destructive or primary in the top-right corner (unreachable one-handed on a 6.7" device). Back/close in top-left is acceptable because it is non-destructive. | All |
| E5 | **No precision gestures** | Banned: pinch-zoom-to-act, long-press-drag, swipe-to-delete, multi-finger, edge-swipe-only navigation. Swipe may *supplement* a visible button, never replace it. | All |
| E6 | **Contrast** | Body text ≥ **7:1** (AAA, not AA) against background. Primary buttons ≥ 4.5:1 for the fill against the surrounding surface. Rationale: sunlight washes out perceived contrast far below the measured lab ratio. | All |
| E7 | **Sunlight legibility** | Minimum body size **17 px**, minimum label size 15 px, font weight ≥ 500 for anything on a photographic background. No thin/light weights anywhere. No text placed over unmodified photo media without a ≥ 60% scrim. | All |
| E8 | **Colour semantics** | Needs Attention Now = red family; Be Aware = amber; Good Practice = green. **Always paired with a distinct icon and a text label** — 8% of male workers have a colour-vision deficiency and this workforce skews male. | Feed, classification, dashboard |
| E9 | **No-typing paths** | Every MVP journey must be completable with **zero keyboard events** except the one-time email entry at the auth gate. Voice memo (hold-to-talk) is the primary caption mechanism; text is a fallback. This is directly testable — see AT-07. | W-05, W-10 |
| E10 | **Hold-to-talk, not tap-to-toggle** | Press-and-hold to record, release to stop. Gloves make a second precise tap unreliable; hold-release is a gross motor action. Minimum hold zone 96 × 96 px. Visible waveform + elapsed counter. | W-05 |
| E11 | **Goggle/PPE considerations** | Assume reduced peripheral vision and a fixed focal plane: no critical information in screen corners, no tooltips, no hover states, no small badge indicators. Everything important is centre-column and full-width. | All |
| E12 | **Glare and grime tolerance** | Avoid low-contrast greys on white. Assume a scratched, dusty, wet screen: no hairline dividers, no 1px borders as the sole boundary — use spacing and surface elevation. | All |
| E13 | **Haptics + visual, never audio-only** | Confirm shutter, classification and submit with a haptic pulse and a visual state change. Quarries are loud; audio cues are useless. No flow may depend on hearing anything. | All |
| E14 | **Motion restraint** | Transitions ≤ 200 ms, no parallax, no bouncing. Respect `prefers-reduced-motion`. Fast transitions are also budget: 10 animated transitions at 400ms is 4 seconds of the 60. | All |
| E15 | **Interruption resilience** | Backgrounding the PWA (a radio call, a colleague) must never lose a draft. Draft state persists to IndexedDB on every mutation. Resuming returns to the exact step. | W-05, W-10 |
| E16 | **Landscape tolerance** | Portrait is primary, but a rugged device in a chest harness may open landscape. No screen may become unusable; the capture and classification screens must reflow. | All |

---

## 8. Trust and Psychological-Safety Design Rules (Dev Pack §15)

### 8.1 Condition-first, never person-first

| Rule | Implementation |
|---|---|
| T1 | The capture screen asks about a **situation**, never a person. There is no "who", no "reported by", no "involving" field — not optional, **absent**. |
| T2 | Placeholder and prompt copy is condition-shaped: *"What did you notice?"* — never *"What happened?"* (incident framing) or *"Who was involved?"*. |
| T3 | PULSE Uncover prompts are environmental: *"What looks different today?"*, *"What could go wrong?"* — never *"Is anyone working unsafely?"*. |
| T4 | The Dev Pack §17.1 Scenario 1 test: a worker seeing repeated missing helmets must be able to file it as a **condition** (*"PPE compliance dropping in the afternoon in the crusher area"*) with no field that invites naming a colleague. |
| T5 | Face blurring is **out of scope** (Talentica Slide 13) — so the capture screen must carry a one-line reminder before the shutter: *"Photograph the situation, not people."* This is the cheapest available mitigation and it is mandatory. |

### 8.2 No-blame language rules

**Banned vocabulary across the entire worker-facing product** (enforce as a lint rule over the copy deck):
`report` (as a noun for the worker's object) · `violation` · `breach` · `non-compliance` · `fault` · `offender` · `incident` · `failure` · `must` / `required` / `mandatory` in worker copy · `submit` (use *share*) · `score` · `ranking` · `performance` · `audit` · `investigation` · `escalate` (worker-facing).

**Preferred vocabulary:** *notice · share · signal · observation · learning · heads-up · the team · others · stay safe · what you noticed*.

### 8.3 Exact confirmation copy (Frame 07)

Copy is context-varied by classification and is reinforcement, not receipt. Approved strings:

| Classification | Headline | Sub-line |
|---|---|---|
| Good Practice | **"Thanks — that's worth copying."** | "You've shown the next crew what good looks like." |
| Be Aware | **"Thanks. You helped the next crew."** | "Your heads-up is now shared with everyone on this site." *(This is the SafeIn5.md canonical string, generalised from "You helped improve lift safety for the next crew.")* |
| Needs Attention Now | **"Thanks — the site team has been notified."** | "This has gone straight to the site team. You'll see here when it's actioned." |

Rules for all three: second person, past tense, worker as the actor, an explicit statement of who benefits, and **no** call to action other than the exits. Never *"Your report has been submitted successfully."*

### 8.4 What the app must NEVER show

Absolute prohibitions. Any of these appearing in a build is a release blocker.

| # | Never show | Reason |
|---|---|---|
| N1 | A leaderboard, points total, streak, badge or any ranking of workers by signal count | Manufactures volume, not truth; converts a safety tool into a scoreboard. Dev Pack §15.2 "avoid snitch culture". |
| N2 | Any per-worker count, comparison or "performance" figure to another worker | ADM-039 amendment: engagement, never performance surveillance. |
| N3 | The identity of an anonymous reporter — in the feed, in admin, in exports, in logs, in the URL, in an API response, in a Sentry payload | Dev Pack §7: metadata stripped at DB level. Test this at the API layer, not the UI layer. |
| N4 | Read receipts attributed to a named individual ("Dave viewed this") | Turns awareness into monitoring. Aggregate view counts only, and only to admins. |
| N5 | Any disciplinary, corrective-action, or HR-adjacent surface | The product is explicitly not a disciplinary platform (§15.1). |
| N6 | A signal's author to another worker when anonymity is on — including via avatar, initials, colour-coded identity, or consistent pseudonym across signals | A stable pseudonym is de-anonymising in a 15-person crew. |
| N7 | Faces in feed thumbnails where avoidable | No auto-blur in MVP; mitigate with T5 copy plus admin moderation (A-16). |
| N8 | Precise GPS coordinates of a signal to other workers | Location is attached for SIGNAL context, displayed only as sub-site name. Coordinates de-anonymise. |
| N9 | A red/negative visual treatment on the act of sharing | Classification colour applies to the *condition*, never to the worker's action. Confirmation screens are always positive-toned, including for Needs Attention Now. |
| N10 | An unresolvable error, a raw stack trace, or a silent failure on the capture path | A worker who loses a signal once does not come back. Every failure state has a retry and a "we kept it" message (W-19). |
| N11 | Any claim of prediction, AI, or "risk score" | ADM-040/041: rule-based thresholds must be labelled as such. Overclaiming prediction is both a trust risk and a safety risk. |
| N12 | A mandatory field on any worker screen | Dev Pack §4 is a system constraint: "failure to meet these invalidates the product model." |

### 8.5 Honesty rules

- The anonymity toggle (W-16) states the **actual** MVP guarantee plainly: metadata is stripped at the database layer and masked in audit logs, but true non-reversibility (location masking, admin non-correlation) is not in MVP. Per PRD §5.5, overpromising here is the larger risk.
- Admin edits to a worker's classification or caption (ADM-033) are shown to the worker as *"edited by the site team"*. Silent editing of someone's observation is the fastest way to lose them.
- The Learn5 and Rescue Plan viewers always show **version and review date** — stale safety content presented as current is a liability (Dev Pack §8.3).

---

## 9. Acceptance Tests — Dev Pack §13 (Definition of Acceptance) and §14 (Success Metrics)

Each item is stated as an executable check. Suite split: Playwright (E2E), Supertest+Testcontainers (API), manual field script (FLD), analytics assertion (MET).

### 9.1 §13.1 — "A user can enter the app, capture, classify, and see it in the feed"

| ID | Test | Method | Pass condition |
|---|---|---|---|
| AT-01 | Cold start from a QR URL on a mid-tier Android over throttled 3G renders an interactive context interstitial | Playwright + Lighthouse throttle | TTI ≤ 3.0s; interstitial shows correct site/sub-site/asset/task/risk |
| AT-02 | **Warm capture path completes in <60s** | Playwright, scripted with human-realistic dwell times; plus FLD with 10 pilot workers wearing gloves | p50 ≤ 40s, **p95 ≤ 60s** from FAB tap to classification ack. Field median ≤ 60s with zero coaching. |
| AT-03 | **Cold capture path (QR → shared) including first-time auth completes in <60s** | Playwright | p95 ≤ 60s |
| AT-04 | **Classification completes in <10s** | Playwright + FLD | p95 ≤ 10s from Capture-Next to classification ack |
| AT-05 | **Zero mandatory fields** — a signal can be created with a photo and nothing else; and with a voice note and nothing else; and with text and nothing else | Playwright ×3 + API | All three finalise successfully. Any 400 on a missing field = fail. |
| AT-06 | No screen in the worker flow contains a `required` attribute or a client-side required-validation rule | Static analysis over the PWA bundle | Zero occurrences on worker routes |
| AT-07 | **A complete signal is captured with zero keyboard events** (photo + hold-to-talk + classify) | Playwright with keyboard listener assertion | `keydown` count == 0 |
| AT-08 | **Media upload is asynchronous** — the worker reaches Classification while a 30s video is still uploading | Playwright with a throttled/stalled upload route | Classification screen is interactive with upload at <100%; signal finalises; media attaches on completion |
| AT-09 | Signal appears in the author's feed immediately (optimistic) and in a second user's feed after refresh | Playwright, two contexts | Author sees it <500ms; second user sees it on next fetch |
| AT-10 | Feed ordering matches §5 pseudo-code for a seeded fixture (unread NAN, unread BA, unread GP, read NAN) | API + unit | Exact order asserted |
| AT-11 | Caught-up boundary card appears exactly once, after the last unread primary-sub-site item, with the WRK-013 copy | Playwright | Present, correct position, correct string |
| AT-12 | Filter by classification and by sub-site returns the correct set and preserves ordering | API | Set equality + order |

### 9.2 §13.2 — QR functionality

| ID | Test | Method | Pass condition |
|---|---|---|---|
| AT-13 | **Confined-space end-to-end** (Dev Pack §8.3 named use case): scan → context resolved → PULSE → Rescue Plan → Learn5 → capture a signal carrying the QR context → appears in the sub-site feed | Playwright + FLD with a physically printed code | Full chain passes; the resulting signal row carries site, sub-site/asset, task type, risk type = confined space |
| AT-14 | A QR configured for a single destination routes there directly; a multi-destination QR shows three ≥56px choices | Playwright | Both variants |
| AT-15 | The **Rigging & Fixtures** scenario passes end to end as written in SafeIn5.md, steps 1–7 | FLD scripted walkthrough | Every step completes; Step 3 capture ≤ 30s as the scenario claims |
| AT-16 | **30 distinct QR context mappings** are configurable and each resolves to its correct context | API, data-driven over a 30-row fixture | 30/30 correct; no cross-contamination |
| AT-17 | Scanning a second QR mid-session updates context and re-scopes the feed with no modal and no re-auth | Playwright | Context chip and feed both change within 2s |
| AT-18 | An inactive/deleted QR shows a clear, non-alarming message and a route to the site directory — never a 404 | Playwright | Friendly state, W-14 reachable |
| AT-19 | Rescue Plan renders all six mandatory blocks plus version and review date, with "Immediate actions" above the fold at 375×667 | Playwright viewport test | All present; no scroll required for immediate actions + escalation contacts |
| AT-20 | Rescue Plan renders from service-worker cache with the network disabled after a prior visit | Playwright offline | Content displays |

### 9.3 §13.3 — System

| ID | Test | Method | Pass condition |
|---|---|---|---|
| AT-21 | All documented REST endpoints respond per contract; OpenAPI spec matches implementation | Supertest + schema diff | Zero drift |
| AT-22 | Photo, 30s video, and voice-memo upload all complete and are retrievable with generated previews | API + Testcontainers + S3 mock | All three; thumbnail generated |
| AT-23 | **Data persists across restart** — signals, PULSE sessions, workflow events, audit rows survive a container recycle | Integration | No loss |
| AT-24 | **Tenant isolation** — a user of Org A cannot read any Org B row via any endpoint, including by direct ID | API, negative tests across every read endpoint | 403/404 on all; RLS verified at the DB with the app role |
| AT-25 | **Community/Corporate segregation** — no corporate signal appears in the community feed under any filter | API | Zero leakage |
| AT-26 | **Anonymity at the DB layer** — for a signal from an anonymous account, the signal row and every API response contain no user identifier; audit log entry is masked | API + direct DB inspection | No `user_id`, no email, no device ID reachable from the signal |
| AT-27 | Failed upload is retained and retryable; killing the app mid-upload and reopening restores the queued item | Playwright + IndexedDB inspection | Item present, retry succeeds, no duplicate on retry (idempotency key honoured) |
| AT-28 | Every workflow transition writes an append-only event row with actor, timestamp, from-state, to-state | API | Rows present, immutable (update/delete denied) |
| AT-29 | Admin edit of an observation writes an audit row and surfaces "edited by the site team" to the worker | E2E | Both |
| AT-30 | GDPR: export and delete for a named user complete; deleting a user does not delete their signals but does anonymise them | API | Signals survive, attribution removed |
| AT-31 | Data residency: all storage and compute resources provision in an EU region | Infra assertion in CI | Region assertion passes |
| AT-32 | PWA installs on Android/Chrome and iOS/Safari; launches offline to a cached shell | Manual on both, per Talentica's supported-browser NFR | Installs; offline shell renders |

### 9.4 §13.4 — Delivery

| ID | Test | Pass condition |
|---|---|---|
| AT-33 | Staging environment reachable, seeded with 3 orgs × 3 sites, ~50 users, 30 QR mappings, 20–30 Learn5 modules | Environment walkthrough signed off by SafeIn5 |
| AT-34 | Source code handed over, builds from a clean checkout per the README | Clean-machine build |
| AT-35 | Documentation: architecture note, API reference, deployment runbook, QR configuration guide, Learn5 authoring guide | All five delivered |

### 9.5 §14 Success metrics — instrumented and assertable

Each metric must be provable from the platform's own data on the last day of the pilot, not from anecdote.

| ID | Metric (Dev Pack §14 / Tender Success Metrics) | Instrumentation | Testable assertion |
|---|---|---|---|
| MET-01 | **Capture under 60 seconds** | Client timer emitted as `signal.capture_duration_ms` on every finalise | Dashboard query returns p50/p95; **p95 ≤ 60,000ms** across all pilot signals |
| MET-02 | **Repeat usage — the primary measure** | `signal.created` events grouped by user (and by device for guests) | Query returns `% of active users with ≥2 signals` and `% with ≥2 signals on ≥2 distinct days`. The report must exist and return a number; the target is set post-baseline per PRD §2.4. |
| MET-03 | **Active users** | Session events, DAU/WAU per tenant | Query returns per-site actives; ≥ 80% of the ~50 invited accounts activate |
| MET-04 | **Behaviour Signal volume and category split** | `signal.created` with classification | Counts and % split across Good Practice / Be Aware / Needs Attention Now, per site and per sub-site (ADM-038) |
| MET-05 | **PULSE engagement** | `pulse.session.started`, `pulse.step_completed{letter}`, `pulse.completed`, `pulse.abandoned_at_step`, `pulse.echo_to_capture` | Completion rate, per-step drop-off, and the PULSE→signal conversion rate are all queryable. Per-step time recorded so repeat-scan tap-through is detectable (PRD §5.7 risk). |
| MET-06 | **Learn5 engagement** | `learn5.viewed`, `learn5.completed`, with originating QR context | Views and completions per module and per QR context. Non-zero for ≥ 10 distinct modules. |
| MET-07 | **QR scans / context journeys** | `qr.scanned{qrId, siteId, subSiteId}` | Scans per QR, per site, per sub-site, over time. Every one of the 30 mappings shows ≥1 scan during the pilot. |
| MET-08 | **Supervisor engagement — signals reviewed/actioned** | `workflow.acknowledged`, `workflow.closed` | % of signals acknowledged; % closed; **median time Shared→Acknowledged and Shared→Closed** per site (Dev Pack §17 Scenario 5) |
| MET-09 | **Report black hole guard** | Age-in-state query | Report of any signal in `SHARED` > 7 days. Reviewed weekly during the pilot; a non-empty list is an operational escalation, not a bug. |
| MET-10 | **Trends / repeated themes without AI** | SQL count over classification × sub-site × rolling 14 days | S-03 trend strip fires correctly on a seeded 3-similar-signals fixture (reproducing the SafeIn5.md Step 7 moment) |
| MET-11 | **Community vs Corporate architecture proof** | Tenant-tagged events | Both a Community-tenant signal and a Corporate-tenant signal exist in production data with zero cross-visibility (see AT-25) |
| MET-12 | **Anonymous usage rate** | `signal.created{anonymous:bool}` | % anonymous reported — a direct read on psychological safety; a very high or very low rate is a discovery finding for Phase 2 |
| MET-13 | **Zero-typing rate** | `signal.created{had_keyboard_input:bool}` | % of signals captured with no keyboard input — validates the voice-first bet (CQA-006) |
| MET-14 | Qualitative (QA-003) | Structured UAT interview script | Five questions answered for ≥10 workers: *was it quick / was it useful / did it interrupt work / did you trust it / did the feedback loop make you share again* |

---

## 10. What a Designer and a Developer Do on Monday

**Designer, week 1:** extract tokens and components from Frames 01–10 into the shared library with Community/Corporate theme layers (PRD §5.3 — must land in M2, not be retrofitted). Then design the 16 uncovered worker screens in §1.2, starting with W-11 QR interstitial, W-15 My Signals, W-19 offline states — these three carry the most product risk and have zero frame coverage. Apply §7 as hard constraints and §8 as a copy deck reviewed by SafeIn5 before any of it is built.

**Developer, week 1:** stand up the context object and QR resolution service first (everything downstream depends on the shape of `{tenant, site, subSite, asset, taskType, riskType}`), then the draft-on-shutter signal lifecycle with the outbox-backed async media path. Build AT-02, AT-05, AT-07 and AT-08 as failing tests on day one — the 60-second budget, zero mandatory fields, no-typing path and async upload are the four constraints that "invalidate the product model" if missed (Dev Pack §4), and they are far cheaper to hold than to recover.

**Open items to close at Discovery (M1):** guest-vs-account boundary confirmation (PRD §5.6 assumption), accessibility requirements (PRD §5.2 assumption), whether the caught-up boundary's secondary "elsewhere on this site" band is wanted at all, video length cap confirmation (30s assumed), and whether CQA-007's "video is MUST for MVP / Phase 2" contradiction resolves to MVP (the Tender Pack marks it MUST and Phase 2 in the same row).
