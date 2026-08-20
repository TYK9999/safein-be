# SafeIn5 MVP — Consolidated Design Decision Register

**Prepared for:** SafeIn5 (client decision) · **Prepared by:** Product / Talentica discovery
**Source basis:** Dev Pack V9 · MVP Requirements & Tender Pack v1.0 · SafeIn5.md (rigging scenario) · Talentica Proposal (28 slides) · Working PRD (decisions already taken are excluded)

**How to use this document.** Each item is a single numbered question with numbered options. Answer with the decision number and option number (e.g. "12 → 1"). Items marked **⚠ COMMERCIAL** are where the Tender Pack and the Talentica proposal imply different build sizes and therefore carry risk against the fixed £45,000 price — these are summarised again in the final section.

Tiers:
- **Tier 1 — decide before Milestone 1 (UX design).** Design cannot start, or will have to be redone, without an answer.
- **Tier 2 — decide before Milestone 2 (architecture/build).** Data-model or permission decisions that are expensive to retrofit.
- **Tier 3 — can wait** (before Milestone 4 / pilot start).

---

# TIER 1 — Must be settled before Milestone 1 (UX design)

## 1. What exactly does "under 60 seconds" measure?
**Kind:** ambiguity

**What is open:** No document defines where the 60-second clock starts and stops — capture screen only, or the whole QR → PULSE → capture → classify → confirm journey — nor whether authentication and media upload completion count, nor how it is measured at UAT.

**Evidence**
- Dev Pack §4 (MANDATORY): "Capture must be completable in under 60 seconds." and "Classification must take <10 seconds."
- Dev Pack §3: "PULSE supports safer decisions at the point of work in under five minutes."
- Tender Pack QA-001: "Workers can complete the core PULSE / behaviour signal flow in under 60 seconds."
- Dev Pack §13 Definition of Acceptance: "A user can: • Enter the app • Capture a Behaviour Signal in under 60 seconds • Classify it • See it appear in the feed"
- SafeIn5.md Step 3: "Capture takes under 30 seconds."
- Talentica Slide 11: "Frictionless capture in <60s."

**Options**
1. Clock = first tap on capture → classification confirmed. Excludes PULSE, excludes authentication, excludes upload completion. Measured on a mid-range Android throttled to a 3G profile, with a **separate** stated budget for QR-scan-to-PULSE-render on a cold load.
2. Clock = whole QR-to-confirmation journey including the PULSE sequence (per QA-001's wording), forcing PULSE to fit inside 60 seconds.
3. Clock = first tap on "Share Observation" → signal queued locally; separate targets published for PULSE and for returning-user sign-in.
4. Drop the number as a pass/fail gate; instrument median time-to-submit as an observed metric only.

**Recommendation — Option 1.** Dev Pack §4 lists capture and classification as separate constraints and §3 gives PULSE its own five-minute budget, so the two are distinct activities; QA-001 is loose summary language, not a third budget. An unthrottled measurement would pass in an office and fail at a quarry gate. Write the protocol into the Definition of Acceptance, because §13 lists "Enter the app" and "Capture … in under 60 seconds" as adjacent bullets without saying whether the first is inside the second.

**Decide by:** before Milestone 1.

---

## 2. Is video capture in the MVP, and for whom? ⚠ COMMERCIAL
**Kind:** conflict

**What is open:** Video is MUST/MVP in the requirement rows, Phase 2 in the Consolidated Q&A, and "Could have" for Community — three answers in one workbook, and the tenderer question that would have settled it was never answered.

**Evidence**
- Tender Pack WRK-019 / SCP-019: Priority "MUST", Phase "MVP", Decision "Approved" — "Photo and video capture is approved as a core MVP feature."
- Tender Pack CQA-007: Priority "MUST", Phase "**Phase 2**" — "Video is required for MVP and should be treated as MUST." Tenderer column: "Confirm whether video is included, optional, or excluded." (**left blank**)
- WRK-019 Community Requirement: "Video capture for community needs to be considered as a Could have"
- SCP-019 carries the photo-only text: "Photo capture is approved as a core MVP feature."
- Talentica Slide 12: "Behaviour Signal capture – photo, video, text, voice"; Slide 14: "Maximum video duration of 30 seconds per clip".

**Options**
1. Video IN for MVP for both Community and Corporate; treat CQA-007's "Phase 2" cell and SCP-019's photo-only text as transcription errors.
2. Video IN for Corporate workers only; Community capture stays photo + voice + text (honours WRK-019's "Could have").
3. Video OUT of MVP entirely; photo + voice + text only, with the media model built so video can be added without schema change.
4. Video IN as a per-tenant configuration flag, defaulted off for the pilot.

**Recommendation — Option 1.** Two of the three conflicting cells say MUST (WRK-019 and CQA-007's own priority column), the Dev Pack lists video in the Community Layer scope, and Talentica has already priced and constrained it. Option 2 is the fallback if payload cost proves unacceptable for unmanaged Community users. **CQA-007's blank tenderer column must be filled in writing** — this is the one place the pack explicitly asked for confirmation and never received it.

**Decide by:** before Milestone 1. **Commercial note:** video changes the capture screen, media pipeline (thumbnails, poster frames), feed playback and offline queue profile. Talentica's stack lists "sharp (thumbnails)" — an image library — and no video processing component.

---

## 3. What is the minimum and maximum content of one Behaviour Signal? ⚠ COMMERCIAL
**Kind:** ambiguity

**What is open:** Whether a signal must carry at least one media item or caption to be submittable, how many photos are allowed, whether photo and video can be mixed, whether gallery import is permitted, and whether images are downscaled on the device before queueing.

**Evidence**
- Dev Pack §4: "Zero mandatory fields at capture."; §2 Key fields: "text - optional free-form input." / "media - optional photo/video upload."
- Tender Pack WRK-008: "Multiple images can be given in one observation"; Decision: "Multiple images may be allowed if simple, but MVP should not require complex galleries or editing."
- WRK-019: "…attach short videos to their safety reports **alongside** standard photos or instead of photos"
- SafeIn5.md Step 3: "He takes: - 1 photo of the rigging arrangement"
- Talentica Slide 19: "Media processing | sharp (thumbnails), qrcode (QR generation)" — **no client-side resize/compress step is named anywhere**; Slide 6: "Has intermittent WiFi or Cellular Connectivity".

**Options**
1. Exactly one media item per signal (photo **or** video), captured live, mandatory; caption optional.
2. Media optional but at least one of {media, caption} required; up to **3 photos or 1 video** (mutually exclusive types), camera-only, delete-and-retake but no reordering or editing, **client-side downscale to ~1600px / ≤500KB per image**.
3. Fully optional as written — a classification alone is a valid signal; the feed renders a classification-coloured card with no image.
4. Up to 5 mixed media items with a thumbnail strip and gallery import, compression handled server-side.

**Recommendation — Option 2.** It honours "zero mandatory fields" in spirit (no single field is required, the worker is never forced to type) while preventing content-free cards that make the feed and moderation tools useless. A three-slot strip satisfies "multiple images … if simple" without being a gallery. **Client-side downscale must be a hard requirement, not a tuning detail** — nothing in the current stack prevents full-resolution originals being queued, which would break the capture-first-sync-later model at exactly the connectivity described for the pilot sites. Camera-only keeps context and timestamps trustworthy given QR context is auto-attached (Dev Pack §8.2).

**Decide by:** before Milestone 1.

---

## 4. Is the voice note stored and playable, and when does transcription happen? ⚠ COMMERCIAL
**Kind:** ambiguity / gap

**What is open:** Whether a voice note is a first-class media artifact playable in the feed or purely an input method whose only output is text; and whether transcription is on-device and synchronous (reviewable before submit) or server-side and asynchronous (arrives after the worker has left the screen).

**Evidence**
- Tender Pack WRK-020 (MUST/MVP): "Automatically transcribes spoken voice notes into clean, typed text **within the message box** using cloud processing." Assumption: "Integrates with native mobile device speech engines **or** a cloud transcription API."
- Tender Pack WRK-009: "In form of text/audio"; CQA-006: "Voice memo should be treated as the preferred capture method for frontline workers."
- Dev Pack §2 Key fields lists "text" and "media - optional photo/video upload" — **no audio field**.
- Talentica Slide 19: "Background work | In-process workers — outbox flusher, rule-based alert evaluator, **transcription dispatch**" — i.e. server-side and asynchronous, incompatible with "within the message box" at capture time.
- Talentica Slide 18: "Anonymity is enforced at the data layer for MVP purposes and masked in audit logs." — data-layer stripping does not cover voice identifiability.

**Options**
1. **Input-only:** on-device speech recognition, transcript appears live and is editable before submit, raw audio discarded after transcription. No audio anywhere in the feed.
2. **Retained artifact:** audio stored and playable on the signal, plus asynchronous server-side transcription that populates an editable caption; if transcription fails the audio stands alone.
3. **Hybrid:** on-device live transcript shown for review at capture, server-side re-transcription only where no device engine exists; audio discarded once a transcript is accepted.
4. Retained and playable for attributed signals only; discarded for anonymous signals.

**Recommendation — Option 3, defaulting to Option 1 behaviour.** The 60-second budget and the "no mandatory typing" accessibility rule both require the worker to see and correct the transcript **in** the flow — a wrong caption published to their crew is worse than no caption, and in a noisy quarry with regional accents bad transcripts are the norm. Device engine support (Safari iOS, Chrome Android) is exactly Talentica's supported-browser set (Slide 14). Discarding audio also removes the hardest anonymity edge case cheaply: a recorded voice identifies the speaker to their own crew regardless of what the database strips. Specify the fallback explicitly — if no engine is available, disable the record affordance and fall through to the text field rather than silently dropping the note.
*If SafeIn5 judges tone-of-voice worth preserving, choose Option 2 and accept that anonymity becomes a warning label; Dev Pack §2's media field definition and the feed card must then both gain an audio affordance.*

**Decide by:** before Milestone 1. **Commercial note:** Option 3 removes the "transcription dispatch" background worker and the third-party STT provider from the priced stack; Option 2 keeps both plus an audio player and audio storage.

---

## 5. Is classification mandatory to publish a signal?
**Kind:** conflict

**What is open:** Whether the classification step can be skipped, and what happens if the worker abandons the app on the classification screen after media has already uploaded.

**Evidence**
- Dev Pack §4 (MANDATORY): "Zero mandatory fields at capture."
- Dev Pack §1.1: "Behavioural Signal Draft: An incomplete signal captured during the "Capture" phase before a user has applied a classification."; §2: "Behaviour Signal - finalised after classification and context capture."
- SafeIn5.md Step 4: "Dave selects: "Something to be aware of" That is the only required action. The signal is now finalized."
- Dev Pack §6 Frame 06 – Classification lists three options with **no skip or default**.
- Tender Pack WRK-010: MUST / MVP, "Classification is approved, but the labels should be changed."

**Options**
1. Mandatory: no skip on Frame 06; an unclassified item stays a Draft and never enters the feed. "Zero mandatory fields" is read as scoped to the capture stage (text/media), which is how §4 words it.
2. Skippable, defaulting to "Be Aware", changeable later by the worker or a supervisor.
3. Skippable, publishing as "Unclassified", displayed as such and surfaced to admins for triage.
4. Merge classification into the capture screen as three large one-tap buttons that also submit, removing the separate step.

**Recommendation — Option 1.** §4's rule is explicitly scoped "at capture", and both the object model (§1.1, §2) and the SafeIn5.md scenario treat classification as the act that finalises the signal. An unclassified signal has no place in a feed that sorts by classification (WRK-013) or a dashboard whose MUST metric is the category split (ADM-038). Option 4 is worth prototyping at Milestone 1 against the <10-second constraint, but it conflicts with Frame 06 existing as a distinct authoritative frame — treat it as a Discovery experiment, not the baseline.

**Decide by:** before Milestone 1.

---

## 6. What actually happens when a worker taps "Needs Attention Now"? ⚠ COMMERCIAL
**Kind:** gap / conflict

**What is open:** Whether anyone is notified in real time, within what timeframe a response is expected, and what the capture UI tells the worker. Nothing in scope routes, escalates or alerts on the top classification — while WRK-022 is priced MUST/MVP for "Live Worksite Warnings" and the vendor excludes automated push.

**Evidence**
- Dev Pack §2: "Needs attention now - a risk that requires prompt awareness, escalation, or action."
- Dev Pack §15.3 (Mandatory Human Factors Questions): "Who acts on Behaviour Signals and within what timeframe?" — posed, never answered anywhere.
- Dev Pack §17.1 Scenario 5 — Report Black Hole Risk: "No visible action or feedback is returned." / "Engagement and trust begin to collapse."
- Tender Pack WRK-022 (MUST / MVP): "Automatically pushes direct pop-up alerts … if an urgent safety hazard cluster is flagged in their zone." — but its **Detailed Requirement Statement is a verbatim copy of WRK-009's voice/caption ruling** and addresses alerts nowhere.
- Tender Pack WRK-023 (COULD / Phase 2 / Defer): "Predictive alerts should not be in MVP because they imply analytics maturity that the platform will not yet have."
- Talentica Slide 13 (out of scope): "Automated insights workflow (auto-generated push notifications)." vs Slide 19: "Notifications | web-push (VAPID)".

**Options**
1. **No system escalation; honest copy only.** Explicit copy on the Needs Attention Now option stating SafeIn5 is not an emergency channel and immediate dangers must still be raised by radio/supervisor, repeated on the confirmation screen.
2. **Option 1 plus transactional supervisor push:** web-push (or email) to supervisors of the affected site on every Needs Attention Now signal. No threshold logic, no worker-facing push.
3. Threshold rule only (per ADM-040): N Needs-Attention-Now signals flag the dashboard; no per-signal notification and nothing said to the worker.
4. No escalation and no copy change.

**Recommendation — Option 2 (which contains Option 1).** The honest-copy element is non-negotiable: §15 makes trust an explicit product principle and §17 Scenario 5 names the black hole as the failure mode that collapses engagement — a label reading "Needs Attention Now" that dispatches nobody is the fastest way to create one. WRK-022's MUST flag cannot be read as a deliberate decision to build hazard-cluster alerting because its ruling text belongs to another requirement, and cluster detection is exactly what WRK-023 defers. Restricting push to supervisors also sidesteps delivery: workers arrive via an unauthenticated QR scan in a browser tab where iOS web push is unavailable without home-screen install, whereas supervisors are a small, onboarded, named group. Email is the fallback if PWA install proves unreliable — the email service is already priced for magic-link/OTP.

**Decide by:** before Milestone 1. **Commercial note:** Slide 13 excludes auto-generated push while Slide 19 provisions web-push and Milestone 4 lists "notifications" on both workstreams. Confirm which is priced.

---

## 7. What does the confirmation screen claim while the upload is still queued?
**Kind:** gap

**What is open:** Whether the worker is told a signal is "shared" before it has reached the server, what states exist (Queued / Sending / Sent / Failed), whether a signal appears in the site feed before its media lands, and how a worker learns that a queued upload ultimately failed.

**Evidence**
- Dev Pack §4 (MANDATORY): "Media uploads (photo/video) must handle asynchronously in the background to allow the user to proceed to classification without waiting for upload completion."
- Dev Pack §6 Frame 07 – Confirmation: "Reinforcement messaging" / "Finalises Behaviour Signal"
- SafeIn5.md Step 5: ""Thanks. You helped improve lift safety for the next crew."" / Step 3: "Even though the upload is still processing in the background, Dave can continue immediately."
- Tender Pack WRK-011 Decision: "The MVP should at least handle failed uploads gracefully and avoid data loss where practical."
- Tender Pack CQA-008: "Confirm proposed handling of failed/slow uploads." — **left blank in the issued pack**.
- Dev Pack §7 Media Service: "Must support background processing and **multipart uploads**."

**Options**
1. **Publish on submit** — the signal enters the site feed immediately with a media placeholder that fills in later; all viewers see the placeholder.
2. **Publish on completion** — the signal enters the site feed only when its media has uploaded; until then it exists as a pending card in the author's own view only.
3. **Split publish** — text/voice/classification publish immediately; other viewers see an explicit "media pending" state.
4. Hold the worker on the capture screen until upload completes (contradicts Dev Pack §4).

**Recommendation — Option 2, with an explicit state model regardless of choice.** Every signal carries a visible state (Queued / Sending / Sent / Failed); the author sees their pending signal as a local card from the moment of submit so the confirmation is never a lie; retries are automatic with backoff plus a manual "Retry now"; nothing is ever silently discarded; a persistent banner shows the unsent count. Option 2 is preferred because WRK-012's ruling that the feed be "card-based, quick to view" is undermined by empty placeholder cards on a feed other workers scan for operational awareness — unlike the author, other viewers gain nothing from an unfinished signal. Vary the reinforcement copy by classification (three strings) so the Needs Attention Now path carries the expectation-setting message from Decision 6. Confirm resumable/multipart upload is in the build: without it, every retry of a 30-second video restarts from zero on a network that is already failing.

**Decide by:** before Milestone 1.

---

## 8. Where in the capture flow does the account gate fire?
**Kind:** ambiguity

**What is open:** Guests read and accounts submit (already decided) — but not the moment the email OTP / magic-link gate interrupts, nor whether a captured photo, voice note and classification survive the round trip to an email client.

**Evidence**
- Dev Pack §4: "Zero mandatory fields at capture." / "Capture must be completable in under 60 seconds."
- Tender Pack WRK-002 Decision: "OTP can be used as a lightweight authentication approach, but it should not become a barrier to worker participation."
- Tender Pack WRK-003 Decision (D3): "For Corporate pilots, SafeIn5 should decide during discovery whether all signal submissions must be linked to a named worker or whether limited guest submissions are acceptable."
- Talentica Slide 19: "Authentication | Custom magic-link + email OTP + JWT"
- Dev Pack §2: "Behaviour Signal Draft - created during fast capture before classification."

**Options**
1. Gate **before** capture: sign-in required before the camera opens.
2. Gate **at submit, draft preserved**: guest captures freely; the gate appears at submit; the draft is held locally and posted automatically once authenticated, surviving the app leaving the foreground.
3. Deferred gate: signal submits into a pending state and the worker has a grace window to claim it by verifying email.
4. As Option 2, plus **long-lived device trust** (e.g. 90-day token) so the gate is a first-run event, not a per-signal event.

**Recommendation — Option 4 (Option 2 plus device trust).** Option 1 puts a login in front of the camera — the traditional-EHS failure mode the product is defined against. Option 2 preserves "zero mandatory fields at capture" and lets the 60-second measurement apply to the capture activity as Dev Pack §4 scopes it, but it **requires an explicit ruling that the unauthenticated draft persists locally and survives backgrounding**, which interacts directly with the already-decided "no background sync" constraint. Prefer a 6-digit OTP over a magic link: the code can be read from a notification without leaving the PWA.

**Decide by:** before Milestone 1.

---

## 9. What does a worker see when they land from a QR, and where does the Rescue Plan sit?
**Kind:** ambiguity / conflict

**What is open:** A single QR must carry PULSE, Rescue Plan and Learn 5 simultaneously, but no document says whether the landing is a hub of destinations or an immediate drop into PULSE — and whether the Rescue Plan is a blocking step, an always-available link, or optional per context.

**Evidence**
- Dev Pack §8.1: "Each QR code must resolve to a predefined context and route the user to **one or more** of the following: • PULSE • Rescue Plan • Learn 5" and "QR is a core product feature and must be treated as a primary entry point, not a secondary feature."
- Dev Pack §8.6: "The confined space survey, rescue plan, PULSE, Learn 5 should link to the same QR code."
- SafeIn5.md Step 1: "The system immediately opens the SafeIn5 PULSE screen."
- Talentica Slide 7: step 2 "PULSE (Take 5)" then step 3 "Rescue Plan Review" — a sequential step, not a parallel destination.
- Tender Pack WRK-006 / SCP-006: Priority **SHOULD**, Decision: "Rescue information is valuable but should not dominate the MVP." vs Dev Pack §8.5: "Working Rescue Plan route" is a Phase 1 deliverable and §13: "QR routes correctly to PULSE / Rescue Plan / Learn 5".

**Options**
1. **Hub screen:** the QR always lands on a context card with tiles for each configured destination; nothing auto-starts.
2. **Direct to PULSE, with a persistent context header** carrying always-visible one-tap Rescue Plan and Learn 5 shortcuts at every step and after completion.
3. **Option 2 plus a per-context "require Rescue Plan review" flag**: high-risk contexts (e.g. confined space) show a mandatory full-screen Rescue Plan before PULSE; all others treat it as a persistent link.
4. Admin-configured primary destination per QR (default PULSE; a rescue-only QR possible at emergency points).

**Recommendation — Option 3.** Both SafeIn5.md ("The system immediately opens the SafeIn5 PULSE screen") and Slide 7 show PULSE first, and PULSE is already fixed as an always-full sequence — so a hub adds a tap before the settled behaviour. But the Rescue Plan is the one destination with a safety consequence and the only screen mandated as offline-cached, so burying it behind a five-step sequence is not acceptable. A per-context flag reconciles the SHOULD priority with the MUST-level acceptance route: the confined-space example forces the read (satisfying §8.5/§13) while every other context treats it as "contextual supporting information" per WRK-006 and does not spend the PULSE budget. Frames 01–10 contain **no QR landing state**, so this screen is new design either way. Declare "survey" (§8.6, appearing nowhere else) explicitly out of scope.

**Decide by:** before Milestone 1.

---

## 10. What dimensions does the QR context object carry, and how deep is the site hierarchy?
**Kind:** conflict

**What is open:** The Dev Pack mandates four context dimensions (site, asset/location, task type, risk type) stamped on every signal; the Tender Pack's admin model provides only Organisation > Site > Sub-site and folds assets into sub-sites. Nothing says where task type and risk type are created, stored or selected.

**Evidence**
- Dev Pack §8.2: "Each QR code must map to a context object containing: • site • asset / location • task type • risk type (e.g. confined space) • destination type(s) • active / inactive status"
- Dev Pack §1.1: "Context: Specific data (Site, Asset, Task, or Risk Type) automatically attached to a signal or session via a QR code scan."
- SafeIn5.md Step 1: "The app already knows: - Site - Lift zone - Asset ID - Task type = Heavy Lift - Risk type = Suspended Load"
- Tender Pack WRK-007 assumption: "Assuming that in any site there can be different sections like any particular assets, machinary or any localised workspace. **We are taking all these things as sub-sites**"
- Tender Pack ADM-015: "Entry forms to provision a new site name, sub site group, and general regional operating city location." — no asset, task or risk fields anywhere in ADM-012…ADM-023. Decision on WRK-013/014/015: "Avoid complex asset management."
- Talentica Slide 12: "Site, Fixtures and other asset setup" and "QR Context mapping to site, subsite, assets, learn 5 content, Rescue plan etc." — assets present, **task type and risk type absent**.

**Options**
1. Two levels only: Organisation > Site > Sub-site is the whole model. Task and risk type are expressed only in the sub-site name ("Confined Space Entry 3"). No new fields.
2. **Location spine plus context attributes:** Site > Sub-site remains the only managed hierarchy; task type and risk type are optional attributes **on the QR context record**, chosen from a fixed SafeIn5-seeded list (no admin CRUD).
3. Full entity model: Organisation > Site > Sub-site > Asset, plus admin-managed Task Type and Risk Type master libraries.
4. Free-text "context tags" on the QR record — no structure, no reporting guarantee.

**Recommendation — Option 2.** §8.2 makes all four dimensions mandatory and §12 requires Phase 1 to "capture clean SIGNAL data and preserve the structure needed for future SIGNAL intelligence", so Options 1 and 4 forfeit the data asset — and note that task type and risk type are the **only available basis for the supervisor trend view** (Decision 18/31). But "Avoid complex asset management" and the deferral of all master-library CRUD (ADM-035/036, Phase 2) rule out Option 3, which also adds two unpriced admin modules. Attributes on the QR context record, seeded from a fixed list, deliver every required dimension with zero new managed entities and zero new admin CRUD screens.

**Decide by:** before Milestone 1 (it defines both the admin QR/site screens and the worker context header).

---

## 11. What does a corporate QR resolve for someone with no account?
**Kind:** conflict

**What is open:** Guest read access is a MUST and QR codes are physically posted on site barriers; the Tender Pack simultaneously rules the corporate feed private. Nothing states whether an unauthenticated scanner gets the site's feed as well as its PULSE, Rescue Plan and Learn 5.

**Evidence**
- Tender Pack WRK-003 (MUST / MVP / Approved): "No Requirement of any credentials, app will directly show content. When user scan QR at that time as well we are considering guest login"
- Tender Pack WRK-024 / SCP-024 Corporate Requirement: "**Corporate feed remains private/site-based**; selected anonymised learning may later be shared if permitted."; Decision D16: "it must not expose corporate/client content unless explicitly approved."
- Talentica Slide 14: "Anonymity enforced at database layer, **tenant-based isolation** between Community and Corporate data."
- Dev Pack §7 Storage: "utilise, row level security (RLS) to ensure strict data segregation between community and corporate layers."
- Tender Pack QA-004: "QR codes can then be printed and physically placed by the site team/SafeIn5 pilot lead."

**Options**
1. **Tiered:** an unauthenticated scan resolves PULSE, Rescue Plan and Learn 5 for that context, plus the general Community feed. The corporate site/sub-site feed requires a signed-in account assigned to that organisation.
2. Fully open: a corporate QR resolves everything unauthenticated, including the site feed.
3. Guest-visible but redacted corporate feed (no author, no site names, no full-resolution media).
4. Per-tenant admin toggle, defaulting to closed.

**Recommendation — Option 1.** §8.1 insists QR is "a primary entry point, not a secondary feature" and reading a confined-space rescue plan at the entry point cannot sit behind a login — so gating everything is untenable. But D16 and SCP-024 are explicit that corporate content stays private, and **the feed is the corporate content**: worker-authored signals, identities where non-anonymous, live site conditions. Option 2 means anyone who photographs a QR sticker on a barrier can browse a paying client's safety signals indefinitely. Splitting at the feed boundary honours both rulings with one rule that is easy to explain to pilot clients. **This also requires QR URLs to carry a high-entropy, non-enumerable token** rather than a readable site slug, or the scoping rule is meaningless. Option 4 is a reasonable Discovery variant if a pilot client wants an open feed — but default closed.

**Decide by:** before Milestone 1.

---

## 12. Is the worker's feed scoped to their sub-site or to the whole site?
**Kind:** conflict

**What is open:** Whether the feed shows only observations from the sub-site whose QR was last scanned, or all observations from the parent site — and what it shows when the app is opened without any scan.

**Evidence**
- Tender Pack WRK-013 (MUST / MVP): "Feed will be auto filtered:- Sub Site specific observations in which worker currently is (by scanning QR) will be shown."
- SafeIn5.md Step 6: "Later during break, another rigging crew **on the same site** sees the signal in the feed."
- Talentica Slide 7 step 6: "the photo along with the context and the classification appears in the feed that is shared with **all workers on the site**."
- Tender Pack SCP-012 / WRK-012 Corporate Requirement: "Required as a site/sub-site feed for operational awareness."
- WRK-013's Decision text rules only on sub-site hierarchy, not on feed scope.

**Options**
1. **Site-scoped by default, sub-site as a clearable filter:** the feed shows all signals for the current site; a QR scan pre-applies (but does not lock) a sub-site filter chip.
2. Sub-site-scoped by default per WRK-013; site-wide viewing requires an explicit action.
3. Two-tier feed: a pinned "here now" band of current sub-site signals above a site-wide chronological body.
4. Always site-wide; sub-site only ever a manual filter (WRK-014).

**Recommendation — Option 1.** It satisfies SCP-012's "site/sub-site feed" literally, matches both narrative documents, preserves WRK-013's auto-filtering intent as a filter rather than a wall, and gives the feed a valid state before any scan. Sub-site-only scoping would make the SafeIn5.md scenario — the second rigging crew learning from Dave's signal — **impossible**, since that crew was working a different fixture. That scenario is the product's core justification.

**Decide by:** before Milestone 1.

---

## 13. How is the feed ordered, and is there a "you're caught up" boundary?
**Kind:** ambiguity

**What is open:** Whether the feed sorts by classification severity or by recency, and how the caught-up boundary is computed — which requires per-user read-state tracking that no document specifies and that has no defined behaviour for unauthenticated guest readers.

**Evidence**
- Tender Pack WRK-013: "Auto sorted based on classification Stop & Act now will be shown first and Good Practice will be shown at last"; Assumption: "we will show red alerts on top so worker can act immediately on those"
- WRK-013: "When all new observations are viewed by the worker a dedicated page with message "You caught up! Further scrolling will show old observation""
- WRK-013 still uses the retired label "Stop & Act now"; WRK-010 Decision: "Use Good Practice, Be Aware and Needs Attention Now."
- Talentica Slide 12 lists only "Feed Visibility" in MVP scope; **no read-state, unread-count or caught-up mechanism appears anywhere** in the proposal or its milestones.

**Options**
1. Reverse-chronological only; classification as a colour treatment plus a filter chip. Caught-up divider from a stored last-seen timestamp, signed-in users only.
2. **Two-band feed:** unresolved "Needs Attention Now" signals from the last N days pinned at the top, everything else reverse-chronological below. Caught-up divider for signed-in users; none for guests.
3. Strict severity sort as WRK-013 is written, recency secondary within each band.
4. Reverse-chronological, no caught-up state at all in MVP.

**Recommendation — Option 2.** A pure severity sort freezes a three-week-old "Needs Attention Now" permanently at the top, making the feed look stale and defeating the recency value the supervisor scenario depends on — and it conflicts with WRK-012's own ruling that the feed be "card-based, quick to view, and focused on operational learning". Dropping urgency entirely discards the stated safety rationale. A bounded pinned band satisfies both. **Whichever is chosen, the label "Stop & Act now" in WRK-013 must be corrected to "Needs Attention Now" per WRK-010.** Note that any caught-up state adds an unpriced per-user read model.

**Decide by:** before Milestone 1.

---

## 14. What is on a feed card, and what can a viewer do with it?
**Kind:** gap

**What is open:** Three documents give three different card field lists; none includes acknowledged/closed status; nothing says whether video plays inline or on tap; and "Feed interactions" is a committed usage metric while social-media mechanics are ruled out.

**Evidence**
- SafeIn5.md Step 6 lists five fields: "Photo", "Context", "Classification", "Lift zone", "Time shared" — no author, no status, no playback.
- Tender Pack ADM-031 lists a different set: "Will get pic, caption, posted on which site/sub site, posted date and time, worker profile" — omits classification.
- Tender Pack WRK-012 Decision: "The feed should be card-based, quick to view, and focused on operational learning" and "SafeIn5 should avoid a purely reel-style or social media experience" (original text was "Site specific observations will be shown in **reels like format**").
- Tender Pack CQA-011: "Avoid social-media style engagement mechanics that undermine safety purpose."
- Talentica Slide 13 (out of scope): "Manual / user tagging in the feed."; Slide 18 commits to measuring "Feed interactions".
- Talentica Slide 19: "sharp (thumbnails)" — **no video poster-frame extraction**; Slide 6: "Has intermittent WiFi or Cellular Connectivity".

**Options**
1. **Read-only card, no interaction affordances:** media thumbnail with **tap-to-play** (never autoplay), classification chip, transcribed caption always rendered as text, sub-site, relative time, author or "Anonymous", and an acknowledged/closed status chip. Paginated fetch with skeleton placeholders. "Feed interactions" redefined as card opens, media plays and filter usage.
2. Option 1 plus a single non-social "This helped me / Seen it too" tap — one counter, no comments.
3. Comments enabled for crew-to-crew response.
4. Muted autoplay video in viewport, images loaded eagerly.

**Recommendation — Option 1.** Fix the field list as the reconciliation of SafeIn5.md Step 6 and Dev Pack §2, and always render the transcript as text so voice-captured signals are scannable — voice is the preferred capture method, so a large fraction of signals will otherwise have no readable content. Tap-to-play puts data cost under the worker's control, which matters because Slide 6 states workers may be on a "Personal Mobile Phone"; Option 4 is exactly the reel-style direction SafeIn5 has already ruled against. Option 3 is excluded by CQA-011 and would create an unbounded moderation surface on an unauthenticated-readable feed. **Option 1 requires adding video poster-frame generation to the Media Service**, which "sharp (thumbnails)" does not cover.

**Decide by:** before Milestone 1.

---

## 15. What roles exist, and what can each do?
**Kind:** gap

**What is open:** "Role-based access" is asserted in three documents, but no document enumerates the roles or their permissions — and the user-creation requirements capture name, email and site only, with **no role field**, so there is no way to create a Supervisor.

**Evidence**
- Dev Pack §5 System: "Authentication (user + optional anonymity) • Role-based access • Consent and visibility control"
- Tender Pack QA-005: "Create/manage users and assign role/site access."
- Tender Pack ADM-025: "Form tool to enroll a new field worker by specifying their **name and email**" — ADM-024…ADM-030 contain no role attribute at all.
- Tender Pack QA-006 Phase 1: "Site-based feed visibility with **supervisor/admin visibility across assigned organisation**."
- Tender Pack ADM-001: "Community administration is SafeIn5 internal only for MVP."
- Tender Pack D23: "User management is required but should remain lightweight… Avoid complex HR-style user administration."
- Talentica Slide 5 personas: "Frontline Worker / Technician", "Supervisor / Site lead", "SafeIn5 Platform Administrator".

**Options**
1. Two roles: Admin and Worker. Supervisors are Admins scoped to their sites.
2. Three roles: Org Admin, Site Supervisor, Worker.
3. **Four fixed roles:** SafeIn5 Platform Admin (cross-tenant, Community moderation), Org Admin, Site Supervisor (assigned sites, acknowledge/close, no CRUD), Worker — with Community user as a tenant-less Worker. No custom permission editor.
4. No roles: one admin account per organisation; separation by tenant only.

**Recommendation — Option 3.** QA-006 distinguishes "supervisor/admin visibility across assigned organisation", ADM-001 requires a cross-tenant SafeIn5 role for Community administration, and the already-decided supervisor Acknowledge/Close capability is a third distinct permission set — plus Worker. Four fixed roles with no custom permission editor satisfies D23's "avoid complex HR-style user administration". Option 4 cannot support the confirmed supervisor workflow. **A role field must be added to ADM-025, which currently captures name and email only.**

**Decide by:** before Milestone 1.

---

## 16. Where does the supervisor acknowledge and close — phone or desktop? ⚠ COMMERCIAL
**Kind:** scope-mismatch

**What is open:** Acknowledge + Close is settled; the surface is not. Talentica's architecture places Supervisor in the mobile PWA while its milestone plan places supervisor workflows in the Admin & Platform (desktop) stream, and no ADM requirement covers acknowledgement at all.

**Evidence**
- Talentica Slide 17: "Mobile PWA (Community, Worker, **Supervisor**)Desktop Admin Console" … "supporting QR Scan, PULSE, Behaviour Signal Capture, Feed, Search, Learn 5, Rescue Plans and **Supervisor Actions**."
- Talentica Slide 22, Milestone 4: "**Admin & Platform: Supervisor workflows**, approvals, notifications, analytics dashboards, moderation…"
- Talentica Slide 19: "Admin Console | Next.js / React destop web app — **not a PWA**"
- Tender Pack ADM-031…ADM-034 (the complete Feed Management set): "View Observation Pic and details", "Filter", "Update observation", "Delete observations" — **no acknowledge or close action**.
- Tender Pack QA-005 minimum admin capability: "Basic acknowledgement/review of signals." — no requirement ID, no MoSCoW priority.
- Tender Pack ADM-005 Corporate Requirement: "Required for supervisors/site leads to view latest signals." — the only supervisor mention in the entire ADM sheet, and it is a desktop widget.

**Options**
1. **Admin console only:** Acknowledge/Close are actions on the ADM-031 signal-detail screen, performed at a desk.
2. **Worker PWA only:** supervisors use the same mobile app with Acknowledge/Close controls on feed cards for sites they supervise; the console shows acknowledgement state read-only.
3. Both surfaces, one API and state model.
4. Split: Acknowledge in the PWA, Close-with-comment in the console.

**Recommendation — Option 2.** Supervisors are described throughout as "supervisors/site leads" working in quarries and yards on the same mobile devices as workers; Dev Pack §17 Scenario 5 makes response latency the existential risk, and routing acknowledgement through a desktop console adds hours to the loop. Slide 17 already places Supervisor in the PWA, and adding two controls to an already-rendered feed card is far cheaper than a separate console workflow — the same card carries the acknowledgement control (supervisor view) and the acknowledgement result (worker view), which is the cheapest way to deliver the already-decided public closure display. If SafeIn5 prefers the desktop, Option 1 is coherent but must be paired with explicit acceptance that site leads need a laptop, which puts the "Signals Reviewed / Actioned" success metric at risk. **Option 3 should be rejected on cost inside the fixed price.**

**Decide by:** before Milestone 1. **Commercial note:** Slide 17 (PWA) and Slide 22 (Admin & Platform) imply different workstreams and different build sizes for the same capability. This must be reconciled in writing.

---

## 17. What are the exact rules of Acknowledge and Close?
**Kind:** ambiguity

**What is open:** Whether Close requires a comment, whether Close can happen without Acknowledge, whether a closed signal can be reopened, whether Good Practice signals are closable, and what status appears on the card for everyone else.

**Evidence**
- Working PRD §5.4: "The supervisor can mark a Behaviour Signal **Acknowledged** and **Closed** with a comment, and the originating worker sees that it happened."
- Dev Pack §7 Corporate Workflow rules (deferred to Phase 2): "Assignment required before action", "Evidence required before close (configurable)", "Full audit trail maintained" — the only close-precondition rules written anywhere, and they are out of scope.
- Dev Pack §16: "The UX/UI should prioritise simplicity, fast interaction, non-punitive engagement, and **visible closure of reported concerns**."
- WRK-010 classification set: "Use Good Practice, Be Aware and Needs Attention Now." — a Good Practice signal has nothing to "close".
- Dev Pack §15.4: "The platform should default to condition first reporting rather than person first reporting."

**Options**
1. **Two flags:** Acknowledged (one tap, no comment, Close implies it) and Closed (**comment required**). No reopen. Good Practice signals are acknowledgeable but not closable.
2. Single linear state New → Acknowledged → Closed, comment optional at both, reopen allowed, all classifications closable.
3. Close only — one action with a mandatory comment, applied to Be Aware and Needs Attention Now.
4. Acknowledge only for MVP; Close deferred.

**Recommendation — Option 1.** Acknowledge must be a single tap with no required input — it is the fast, high-frequency action that answers the black-hole risk, and forcing a comment will suppress it. Close carries the substance and should require a comment, because an unexplained closure reproduces the black hole in another form. Excluding Good Practice from closure follows from "influence before compliance": a positive signal is celebrated, not resolved. No reopen keeps the state model inside the deferred-Phase-2 boundary; correction of a wrongly-closed signal falls back to the auditable admin edit path. **The closure comment is displayed publicly, so the composer needs a visible warning against naming individuals** — §15.4's condition-first rule must extend to the supervisor's reply.

**Decide by:** before Milestone 1.

---

## 18. How does a supervisor find out a signal needs acting on, and is response time tracked? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** No inbox, queue, unacknowledged filter or response-time expectation exists — the only discovery mechanism specified is a five-item recent-activity list. The Dev Pack separately requires the dashboard to track response and closure times; no requirement implements it.

**Evidence**
- Tender Pack ADM-005: "A minimized scrolling list module displaying the **latest 5** safety signals submitted from the field."
- Dev Pack §17.1 Scenario 5: "UX must include visible acknowledgement and closure workflows." and "**Corporate dashboard should track response and closure times.**"
- Dev Pack §15.3: "Who acts on Behaviour Signals and within what timeframe?" — never answered.
- Tender Pack CQA-012 (SHOULD / Phase 1): "A simple feedback/status loop is desirable for Phase 1."
- Tender Pack Success Metrics: "Supervisor Engagement | Signals Reviewed / Actioned" (SHOULD) — a count only, no latency.
- Reference note on the Success Metrics sheet: "no thresholds or numeric targets stated anywhere in the sheet."

**Options**
1. **Pull only:** a "Needs acknowledgement" queue (default filter: Needs Attention Now, sorted oldest-first) with an "open for N days" label on cards. Capture `acknowledged_at` / `closed_at`, display median time-to-acknowledge, **no target and no escalation**.
2. Option 1 plus a **daily email digest** to site supervisors summarising new signals by classification.
3. Option 1 plus a soft target (e.g. Needs Attention Now acknowledged within one shift) with cards colouring when exceeded.
4. Feed-only: the supervisor browses the site feed; acknowledgement is opportunistic; no queue, no timestamps.

**Recommendation — Option 2.** Option 4 is what the pilot scenario literally describes and is the option that reproduces the black-hole failure the Dev Pack calls existential — an action nobody is prompted to perform will not be performed in a 4–6 week pilot, and "Signals Reviewed / Actioned" will read zero for reasons unrelated to the product concept. Timestamps are near-free and are exactly the clean structured data the SIGNAL foundation requires; withholding them creates a Phase 2 backfill problem. Displaying ageing **without** a threshold satisfies "track response and closure times" while avoiding the numeric target the pack has deliberately never set and avoiding a supervisor scorecard (ADM-039's ruling: "Avoid language that implies worker performance scoring"). Escalate to Option 3 only after the pilot produces baseline latency data.

**Decide by:** before Milestone 1. **Commercial note:** the queue is not in any ADM requirement and the digest is not priced.

---

## 19. Is contextual content a reusable library, or free-text fields on each site? ⚠ COMMERCIAL
**Kind:** conflict

**What is open:** The Tender Pack authors Learn 5, PULSE prompt and Rescue Plan as free-text fields on a site record; the Dev Pack and the vendor proposal describe reusable content objects mapped to QR contexts. Also open: at what level content binds (site / sub-site / QR), what a scan resolves when a context has no content of its own, and how many variants SafeIn5 must author.

**Evidence**
- Tender Pack ADM-020 (MUST / MVP): "Add details of learn 5, take 5, rescue plan **though text fields**"
- Dev Pack §8.6: "Mapping to context can be managed via configuration or simple backend setup" and "up to 30 unique QR context mappings"
- Talentica Slide 12: "Learn 5 – content management and mapping" and "QR Context mapping to site, subsite, assets, learn 5 content, Rescue plan etc."; Milestone 3: "Learn 5 management, QR management, context configuration".
- Tender Pack CQA-010: "SafeIn5 will provide initial Learn5 content. MVP should allow generic Community content and Corporate/site-specific content capability."
- Tender Pack WRK-005 (MUST / MVP): "Site-specific behavioral pause prompts"
- Talentica Slide 14: "~20–30 learning modules authored by SafeIn5" — **no equivalent volume figure for PULSE prompts or Rescue Plans**.

**Options**
1. Literal ADM-020: free-text fields on each site/sub-site record. No reuse, no library.
2. **Reusable content objects** — a Learn 5 library, a PULSE prompt-set library and a structured Rescue Plan object — each referenced (many-to-many) by site, sub-site and QR context records, **with sub-site inheriting from its parent site unless overridden, and a QR context able to pin a specific item**.
3. Hybrid: Learn 5 in a library; PULSE prompt and Rescue Plan as free text on the site.
4. Structured Rescue Plan and reusable Learn 5, with a single platform-wide PULSE prompt (no contextual variation).

**Recommendation — Option 2.** Reuse is not a nicety at this scale: §8.6 sizes the pilot at up to 30 QR context mappings across 3 organisations, and free text forces the same confined-space rescue plan to be retyped and separately maintained at every one, with no way to correct all copies when a procedure changes. Generic Community Learn 5 content (CQA-010) cannot live as a field on a site record because Community users have no site. Option 4 is rejected because WRK-005 ("Site-specific behavioral pause prompts") is MUST and the whole SafeIn5.md scenario depends on a lift-specific PULSE. **Two things must be settled with it:** the inheritance/fallback chain and the empty state ("no Rescue Plan configured for this context"), plus a per-context admin preview; and a **volume assumption for PULSE prompt sets and Rescue Plans** alongside the agreed 20–30 Learn 5 modules, or the content-authoring effort is unpriced.

**Decide by:** before Milestone 1 (it defines the admin console's largest authoring surface, which has zero Figma coverage).

---

## 20. What fields make up a Rescue Plan, and which are mandatory?
**Kind:** conflict

**What is open:** The Dev Pack mandates six named fields; the vendor names four; the only admin requirement says free text. Undecided whether it is a structured record with a fixed render template or an authored page, and what is mandatory to publish.

**Evidence**
- Dev Pack §8.3: "The Rescue Plan page **must** include: • location / asset • immediate actions • roles and responsibilities • required equipment • escalation contacts • version / review date"
- Tender Pack ADM-020: "Add details of learn 5, take 5, rescue plan though text fields"
- Talentica Slide 7 step 3: "Rescue plan provides task –specific emergency response procedures, roles, contacts and required equipment" (omits location/asset and version/review date)
- Tender Pack WRK-006: "Rescue plan in case of any emergency will be given in quick summary so worker before even entering will know what to do"; Decision D6: "Include it where content is available and simple to manage."
- Working PRD §5.9: the Rescue Plan is the **only screen with a mandated offline guarantee**.

**Options**
1. All six Dev Pack §8.3 fields, all mandatory to publish, fixed worker template.
2. **Structured with a mandatory core** (immediate actions + escalation contacts) and the rest optional, so a site can publish partial content.
3. A single free-text / rich-text block per context, plus a version field.
4. Upload or link an existing site PDF; capture only title and version.

**Recommendation — Option 2.** Structure is required so that immediate actions and escalation contacts render identically and legibly offline — numbered action steps, tap-to-call contacts — which free text cannot guarantee on a safety-critical screen read under stress. Making all six mandatory contradicts D6 ("Include it where content is available") and the Corporate note that existing instructions will be "converted into short content"; pilot sites will not always have all six. **Reject Option 4 outright:** a PDF cannot be read reliably on a phone in gloves, defeats the offline cache, and forfeits the "quick summary" intent of WRK-006.

**Decide by:** before Milestone 1.

---

# TIER 2 — Must be settled before Milestone 2 (architecture / build)

## 21. How long does scanned context last, and what does a cold app open show?
**Kind:** gap

**What is open:** Scanning updates context, but nothing states how long it persists, what applies when the app is opened without scanning, or which wins when a worker's assigned site differs from the site they just scanned — for feed filtering and for the context stamped on a signal.

**Evidence**
- Tender Pack WRK-015 (MUST / MVP): "If worker moves to another site/sub-site he can scan the QR and info given in the app will automatically updates to the new site/sub-site"
- Tender Pack WRK-013: "Sub Site specific observations **in which worker currently is** (by scanning QR) will be shown."
- Tender Pack D13: "Workers must be able to scan another QR and update the app context without friction."
- Dev Pack §1.1: "Context: Specific data … automatically attached to a signal or session via a QR code scan." — silent on non-QR sessions.
- Dev Pack §10: PWA "Add to Home Screen" is in scope — an installed app can be opened with no scan.

**Options**
1. Sticky forever: the last scan persists until the next scan; assigned site is only the fallback for a worker who has never scanned.
2. **Expiring context:** scanned context persists for a shift-length window (configurable, default ~12 hours), then reverts to the worker's assigned site. A visible context chip shows the active context throughout.
3. Journey-scoped: scanned context applies only to the journey launched from the scan; outside it the app shows assigned-site context.
4. Assigned site always wins for the feed; scanned context only stamps signals and selects content.

**Recommendation — Option 2.** WRK-013's "in which worker currently is" is a present-tense claim that sticky-forever context quietly breaks — a worker who scanned a lift zone on Tuesday would still be filtered to it on Friday, seeing stale signals and stamping new ones with the wrong location. Option 3 is safest for data integrity but contradicts WRK-013's requirement that the feed itself be context-filtered. A shift-length expiry matches the operational rhythm of the SafeIn5.md scenario while keeping WRK-015's frictionless re-scan. **Two rules must be written down with it:** signals are always stamped with the context live at the moment of **capture**, not the moment of scan; and the empty state must be designed, because a pilot site's feed will be empty for the first days.

**Decide by:** before Milestone 2.

---

## 22. Can a worker belong to more than one site?
**Kind:** conflict

**What is open:** Admin requirements assume one site per worker; worker requirements make roaming between sites a MUST. Undecided whether assignment is one-to-one, many-to-many, or organisation-level — and what a scan at an unassigned site grants (read? submit?).

**Evidence**
- Tender Pack ADM-019: "List of workers who are **not assigned to any other site** will be visible to add with search option"
- Tender Pack ADM-023: "workers assigned in site will be updated as **on bench**" — "on bench" is undefined product terminology.
- Tender Pack D13 Corporate Requirement: "Required. **Workers may move between sites/sub-sites/task zones.**"
- Tender Pack QA-006: "supervisor/admin visibility **across assigned organisation**."
- SafeIn5.md persona environment: "Heavy fabrication yard / shutdown maintenance site / offshore prep area" — three environments for one worker.

**Options**
1. One site per worker, enforced. A scan elsewhere shows contextual content but not that site's feed.
2. Many-to-many: admin assigns multiple sites (multi-select picker); feed and submission rights follow the assignment set.
3. **Organisation-level membership:** workers belong to the organisation; site assignment is a default feed filter only, and any QR within the organisation grants full context, feed and submission rights. Cross-**tenant** scans yield safety content only, never another client's feed.
4. Home site plus QR-granted temporary rights for the session/shift.

**Recommendation — Option 3.** D13 makes cross-site movement an unqualified MUST and QA-006 defines visibility at organisation level. The QR is physical proof of presence — a worker holding a phone in front of a sticker at a lifting zone **is** at that lifting zone, and refusing them the local feed defeats the crew-to-crew learning that is the stated core value. But feed contents must never cross an organisation boundary (WRK-024). **ADM-019's "not assigned to any other site" filter must be corrected in any case** — it is a straight contradiction of WRK-015/D13 and will otherwise be built as written. Define "on bench" explicitly: organisation member with no site assignment.

**Decide by:** before Milestone 2.

---

## 23. One identity across Community and Corporate, or separate accounts?
**Kind:** ambiguity

**What is open:** Community requires self-registration; Corporate requires invitation and site assignment. Nothing says whether these are one account or two, which tenant a self-registered account belongs to, whether one person can hold both, or where a signal lands when a self-registered user scans a corporate QR.

**Evidence**
- Tender Pack WRK-001 Decision (D1): "the account model must support **future movement from Community user to Corporate user**."
- Tender Pack ADM-024 Strategic Reasoning: "User management is essential for Corporate governance and future Community-to-Corporate migration."
- Tender Pack CQA-001: "SafeIn5 is one platform with two operating models." / "Confirm architecture can support both models **without rebuild**."
- Talentica Slide 14: "tenant-based isolation between Community and Corporate data"; Slide 13: "Bulk user import / CSV provisioning (Community self-registration is in scope)".

**Options**
1. **Global identity, per-tenant membership:** one account per email address, holding a Community membership and zero-or-more Corporate memberships. An invite to an existing address adds a membership. A user with no membership for a scanned site may read the safety content but not submit into that site.
2. Separate accounts per operating model; migration becomes a Phase 2 merge job.
3. Corporate-first: self-registration creates a Community account that can never link to a Corporate tenant in MVP; signals from unassigned scanners land in the Community feed.
4. Any authenticated user may submit into any corporate site they scan.

**Recommendation — Option 1, with Option 3's fallback rule for unassigned scanners.** D1 binds the design and CQA-001 sets a "without rebuild" test — separate accounts (Option 2) deliver exactly the rebuild the Tender Pack forbids, and separating identity from tenant membership costs little at Milestone 2 but a great deal to retrofit after row-level security is built. **Option 4 must be rejected:** it lets arbitrary self-registered users publish into a paying client's private site feed.

**Decide by:** before Milestone 2 (this is a foundational data-model decision).

---

## 24. Does the app include its own QR scanner, or do workers use the phone camera? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** No document states the scan mechanism or what the QR encodes. "Scan another QR" mid-session is a MUST, which implies an in-app scanner — but the proposed stack lists QR generation and no scanning capability.

**Evidence**
- Dev Pack §8.5: "QR scan or QR URL routing" — both, undifferentiated.
- Tender Pack D13 (WRK-016/017/018, MUST / MVP): "Workers must be able to scan another QR and update the app context **without friction**."
- Talentica Slide 19: "Media processing | sharp (thumbnails), **qrcode (QR generation)**" — generation only; **no scanning library listed**.
- Talentica Slide 14: "Supported Browsers | Safari (iOS) and Chrome (Android)"; Dev Pack §10: PWA "Add to Home Screen".
- Tender Pack WRK-003 (MUST): guest QR access with no credentials.

**Options**
1. URL-only: no in-app scanner; workers always use the OS camera; "Scan another QR" is an instruction card telling them to leave the app.
2. **Dual:** an in-app camera scanner as the in-session path, with the same code resolving as a plain https URL for cold OS-camera scans by guests, including installed-PWA hand-off.
3. In-app scanner only; the QR encodes an opaque token meaningless outside the app.
4. OS camera primary with an in-app "enter code" fallback.

**Recommendation — Option 2.** WRK-016/017/018 are three MUST rows whose entire content is context change mid-session "without friction" — Options 1 and 4 make that a multi-app context switch. Option 3 breaks WRK-003's guest QR access, also a MUST. **Two payload decisions follow:** the code must encode an https URL carrying a high-entropy, non-enumerable token (see Decision 11), and installed-PWA hand-off must be tested on iOS Safari specifically, where it is least reliable.

**Decide by:** before Milestone 2. **Commercial note:** an in-app scanner is currently **unpriced** — the stack lists QR generation only.

---

## 25. What happens to a QR when a site is deleted, and what does a worker see scanning a dead code?
**Kind:** gap / ambiguity

**What is open:** "Active / inactive status" is a mandatory field on the QR context object, but nobody sets it and no worker-facing state exists for an inactive, deleted or unrecognised code. Separately, site deletion is specified as a hard delete with no ruling on the signals, feed history, content mappings and dashboard counts attached to it, and there is **no sub-site delete requirement at all**.

**Evidence**
- Dev Pack §8.2: the context object must contain "active / inactive status"
- Tender Pack QA-004: "A simple 'QR tested/active' status would be useful if achievable within MVP scope, but it is **not essential** if it creates cost or complexity."
- Tender Pack ADM-023 (MUST / MVP): "Deleting will remove the site completely, **QR codes will not work** and workers assigned in site will be updated as on bench"
- Tender Pack ADM-013: site details include "associated workers, associated observations, counts"
- Talentica Slide 13 (out of scope): "Physical QR sticker production and hardware." — printed codes stay in the field after the digital record changes.
- Talentica Slide 14: "**Append-only audit logging** enabled."; Success Metrics: "Trends / Repeated Themes — Evidence that repeated exposure themes can be identified without AI."

**Options**
1. No status field: a QR either resolves or fails to a generic app home screen. Sites hard-delete with cascade.
2. **Explicit lifecycle (Draft → Active → Inactive/Retired) settable in admin, a designed worker-facing screen for inactive/deleted/unknown codes that still surfaces generic emergency guidance and a way to report the bad code, and site/sub-site deletion changed to soft delete/archive** — QRs resolve to an "inactive location" state, workers unassigned, signals and analytics retained.
3. Option 2 plus a "tested / confirmed placed" verification flag set the first time an admin scans a printed code.
4. Block deletion where signals exist; only "Deactivate" is offered.

**Recommendation — Option 2, deferring Option 3's verification flag.** §8.2 states the status field as a hard requirement, so Option 1 knowingly drops a MUST on the product's primary entry point — and the decisive case is safety, not usability: a dead QR at a confined-space entry is exactly what ADM-023's "QR codes will not work" creates today. QA-004's cost caveat applies specifically to the tested/placed verification workflow, not to the status field, so deferring Option 3 stays faithful to it. A cascading hard delete would destroy the pilot's own evidence base — the signals the Success Metrics sheet depends on — and contradicts the "append-only audit logging" commitment. **Add an explicit "Delete sub-site" action with the same semantics; none exists today.**

**Decide by:** before Milestone 2.

---

## 26. Is device geolocation captured, when is permission requested, and is it shown? ⚠ COMMERCIAL
**Kind:** conflict / scope-mismatch

**What is open:** Geolocation attachment is stated differently for Community (all capture) and Corporate (non-QR capture only), appears in **no WRK or ADM requirement**, and is absent from Talentica's scope slide. Undecided when the permission prompt fires, whether location is displayed, and how it interacts with anonymity.

**Evidence**
- Dev Pack §5 Community Layer: "For capture workflows, optional device geolocation should automatically attach…"; Corporate Layer: "For **non-QR** mobile capture workflows, optional device geolocation should automatically attach…"
- Talentica Slide 8 (Community flow only): "Geo Location is automatically attached if permissions allow" — no equivalent in the Slide 7 Corporate journey.
- Talentica Slide 12 MVP Scope makes **no mention of geolocation**.
- Talentica Slide 18: "True anonymity will require **masking of location**, non-reversal by the admins etc. which is not considered as a part of MVP."
- Tender Pack ADM-006 (Defer): "Heat maps require reliable location data and sufficient volume" — the only MVP consumer of location is deferred.
- Tender Pack QA-004: "Location tracking, GPS verification … can be considered later. These should not be critical-path requirements for Phase 1."
- Dev Pack §15.1: "SafeIn5.ai is not a surveillance or disciplinary platform."

**Options**
1. **Community (non-QR) capture only.** Request permission once, with an in-app explainer immediately before the OS prompt, **never inside the capture flow**. QR context supplies location for all Corporate journeys. Store, never display in MVP, and **suppress capture entirely on anonymous signals**.
2. Capture wherever permitted including QR journeys; store for future use, never display.
3. Capture and display coarse location on every feed card.
4. Exclude geolocation from MVP entirely.

**Recommendation — Option 1 — which is simply what the Dev Pack's Corporate bullet already says, made explicit and applied consistently.** Corporate journeys already carry site, sub-site and asset from the QR, so a redundant GPS fix buys nothing and costs a full-screen OS interruption inside the 60-second budget. But the Community journey ("Member notices an open manhole") has no QR and therefore no context at all without location — Option 4 leaves Community signals unactionable. **Option 3 must be rejected:** Slide 18 concedes MVP anonymity does not mask location, so showing coordinates on an anonymous signal at a 20-person sub-site breaks the anonymity promise already committed to.

**Decide by:** before Milestone 2. **Commercial note:** geolocation appears in no WRK/SCP requirement and not in Talentica's scope slide — it is **unpriced** and needs an explicit scope decision, not an assumption.

---

## 27. With no face blurring, what stops photos identifying colleagues? ⚠ COMMERCIAL
**Kind:** scope-mismatch

**What is open:** The Dev Pack asks developers to consider automatic face blurring and identity minimisation; the vendor lists it as explicitly out of scope and not planned. No alternative control exists — while the flagship UX scenario is a worker photographing a PPE breach.

**Evidence**
- Dev Pack §15.4: "Developers should **consider** automatic face blurring and identity minimisation for uploaded images." and "The platform should default to condition first reporting rather than person first reporting."
- Talentica Slide 13, "Features Not Required — The following are explicitly out of scope and not planned": "**Automatic face-blurring**"
- Dev Pack §17.1 Scenario 1 — PPE Non-Compliance: "Worker does not want to identify colleagues directly." / "UX should focus on unsafe condition and environmental context."
- Dev Pack §15.1: "The system must focus on conditions, behaviours, and emerging risk patterns rather than identifying and blaming individuals."
- Tender Pack WRK-008 Decision: "MVP should not require complex galleries or editing."
- Tender Pack ADM-034 "Delete observations" — the only stated remedy, and it is post-publication.

**Options**
1. **Accept no blurring; mitigate in the capture UX:** mandatory, designed guidance on the camera screen ("Photograph the condition, not the person"), a pre-submit reminder, and "contains identifiable people" made an explicit takedown ground in the admin moderation tools.
2. Manual redaction tool (finger-drag blur/box) on the photo review step.
3. Reinstate automatic face blurring as an MVP media-processing step (change request).
4. No measure; rely on post-hoc admin delete.

**Recommendation — Option 1, recorded explicitly as an accepted deviation from Dev Pack §15.4** rather than left as an unnoticed contradiction between two documents. §15.4 says "should consider", not "must implement", so the vendor exclusion is not strictly a breach — but Option 4 means a person-identifying photo reaches the whole site feed before any admin sees it, contradicting §15.1 and §17.1 Scenario 1 and risking the "snitch culture" outcome the product exists to avoid. Capture-time copy is near-zero build cost and is the intervention that shapes behaviour at the moment it matters. Option 2 conflicts with the <60s budget and WRK-008's "not require complex galleries or editing". Option 1 is only defensible if the guidance is treated as a **mandatory designed element**, not optional copy, and if pilot workers are told plainly that images publish unblurred. Log Option 3 as a Phase 2 item.

**Decide by:** before Milestone 2. **Commercial note:** Option 3 is a priced change request, not a re-scope inside the fixed fee.

---

## 28. What consent is captured, and how does a worker know who will see their signal?
**Kind:** gap

**What is open:** "Consent and visibility control" is a named Phase 1 system capability, but no document defines what consent is captured, when it is presented, or how a worker sees who will view their signal. No requirement ID in the Tender Pack mentions consent, privacy notice or visibility control.

**Evidence**
- Dev Pack §5 System: "Authentication (user + optional anonymity) • Role-based access • **Consent and visibility control**"
- Dev Pack §15.4: "Data handling must comply with GDPR and Corporate privacy requirements."
- Talentica Slide 14: "EU-based data residency with GDPR compliance, including export, delete, and retention policies."
- Talentica Slide 22, Milestone 4: "…moderation, reporting, **GDPR compliance**, deployment readiness."
- Tender Pack: **no WRK or ADM requirement mentions consent, privacy notice or visibility control.**

**Options**
1. One-time consent at account creation only: a single plain-English privacy statement on the OTP screen covering media, voice, location and feed visibility. Guests get a static notice on the QR landing page.
2. **Option 1 plus a persistent, non-blocking audience indicator** on the capture/confirmation screen (e.g. "Visible to: Northfield Quarry — Lift Zone A"). No extra tap.
3. Per-submission consent checkbox before the signal is finalised.
4. Footer privacy-policy link only; treat consent as covered by pilot-site employment agreements.

**Recommendation — Option 2.** Option 4 fails an explicit Phase 1 system requirement and leaves guests — who are outside any employment agreement — uncovered. Option 3 adds a mandatory tap, attacking both "Zero mandatory fields at capture" and the 60-second rule. Option 2 satisfies the "visibility control" half of the requirement, which is precisely what §15.2 needs to "Increase workforce trust and engagement", at the cost of one line of static text.

**Decide by:** before Milestone 2 (it changes onboarding, the OTP screen and the capture-to-submit flow).

---

## 29. Can an admin change a worker's signal, and is anyone told?
**Kind:** ambiguity

**What is open:** ADM-033 lets an admin change a worker's risk classification and caption and ADM-034 lets them delete an observation; the ruling requires this to be "auditable" but never says whether the audit is visible anywhere, whether the author is told, or whether "delete" means hide or destroy.

**Evidence**
- Tender Pack ADM-033: Sub Feature "update- risk classification, caption"; "Security action enabling managers to update errant inputs, typos, or double-posts from the mobile view."
- Tender Pack ADM-031–034 shared Decision (D24): "…view signal detail, filter by category/site/sub-site/user, and **hide/delete** inappropriate content. Editing worker observations should be **controlled and auditable**." Strategic Reasoning: "Moderation is essential for trust, but **over-administration could undermine worker ownership**." — while ADM-034's own text is only "Delete observations".
- Talentica Slide 14: "**Append-only** audit logging enabled."
- Dev Pack §15.1: "SafeIn5.ai is not a surveillance or disciplinary platform."

**Options**
1. **Classification immutable by admins; caption correction permitted with a visible "Updated by site admin" marker on the card; deletion is a reversible soft-hide** (row retained, excluded from feed, counts stable).
2. Full edit permitted with transparency: caption and classification editable, marker shown, originals in the audit log, author notified.
3. Edit permitted silently as ADM-033 is written; changes visible only in the admin audit log.
4. Hide/delete only — remove admin editing of caption and classification entirely (ADM-033 out of MVP).

**Recommendation — Option 1.** Classification is the worker's own judgement and the unit of the product's core dataset; silently downgrading a "Needs Attention Now" to "Be Aware" is both a safety risk and precisely the "over-administration" D24 warns against, and it corrupts the category split that is a MUST success metric. A visible marker costs one label and is compatible with anonymity (it is a property of the signal, not a notification to a person). Soft-hide keeps the append-only audit commitment intact and dashboard counts stable. **ADM-034 must be amended to state whether it means hide or hard delete — the requirement and its own decision text currently disagree.** Option 4 is a defensible simplification but should be an explicit decision, since ADM-033 is priced as SHOULD/MVP.

**Decide by:** before Milestone 2.

---

## 30. What happens to abandoned drafts, and can a worker correct their own signal?
**Kind:** gap

**What is open:** The object model defines a Draft but no product behaviour: whether it can be resumed, how long it and its already-uploaded media are retained, and — separately — whether a worker can edit or withdraw a published signal, when only admins have update/delete rights.

**Evidence**
- Dev Pack §7 Behavioural Signal Service: "Create draft", "Update", "Finalise", "Retrieve feed"
- Dev Pack §4: "Media uploads … must handle asynchronously in the background to allow the user to proceed to classification without waiting for upload completion." — so media uploads **before** the signal is finalised.
- Tender Pack ADM-033 / ADM-034 give update and delete rights to **admins only**.
- Talentica Slide 14: "GDPR compliance, including export, delete, and retention policies."
- Dev Pack §15: moderation "could undermine worker ownership".

**Options**
1. **Drafts ephemeral:** abandoning capture discards the draft and purges its media on a short TTL; no draft list. Workers get a self-service correction window (e.g. edit caption/classification within 15 minutes) and can delete their own signal.
2. Drafts ephemeral with hard purge; no worker-side edit or delete — all corrections via admin.
3. Drafts persist and are resumable via an "unfinished signal" indicator, purged after 24 hours; corrections admin-only.
4. Drafts persist and resumable, plus worker self-service edit/delete.

**Recommendation — Option 1.** Resumable drafts add UI for a state the worker rarely wants — the 60-second flow's premise is that capture and classification happen in one breath — but **orphaned media needs an explicit TTL purge for GDPR regardless**, since uploads start before classification. The worker-side correction window is the more important half: routing every typo and mis-tap through an administrator contradicts the ownership principle and makes a bad transcript unfixable by the person who made it.

**Decide by:** before Milestone 2.

---

## 31. How does a supervisor see that three signals are about the same thing? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** Manual trend discovery is the scenario's core value moment and a stated success metric, but tagging is out of scope, deep search and the heat map are deferred, and the only available facets are classification, site, sub-site and worker.

**Evidence**
- SafeIn5.md Step 7: "3 similar "Be Aware" signals in two weeks", "All related to custom lifting fixtures", "Even without AI analytics in Phase 1, the trend becomes visible manually."
- Tender Pack Success Metrics (SHOULD): "Trends / Repeated Themes — Evidence that repeated exposure themes can be identified without AI."
- Tender Pack QA-003: "Basic trend themes by site, sub-site, **task**, and category."
- Tender Pack ADM-032 Filter: "classification flag, Site, Sub site, worker" — the complete facet set.
- Tender Pack WRK-021 (Defer): "Advanced search is not required for MVP."; ADM-006 (Defer): heat map; Talentica Slide 13 (Phase 2): "Manual / user tagging in the feed."
- Dev Pack §8.2 already attaches "task type" and "risk type" to every signal via QR context.

**Options**
1. **Group by QR context:** expose task type and risk type (already auto-attached per §8.2) as dashboard facets and feed filters — a panel of "signals by risk type / task type, last 30 days, this site". No worker tagging, no extra capture step.
2. Add an optional topic picker at classification time from a short fixed list.
3. Keyword grouping over transcribed captions using the Postgres full-text search already in the stack, shown as a "frequent words at this site" panel.
4. No grouping in MVP; the trend metric becomes a qualitative pilot observation.

**Recommendation — Option 1, with Option 3 as a cheap additive.** QR context is the one dimension SafeIn5 already commits to attaching automatically at zero worker cost, and QA-003 explicitly names "task" as a trend dimension. This delivers the SafeIn5.md scenario verbatim without tagging, deep search or a heat map. Option 2 should be rejected: it adds a decision to the capture flow that "zero mandatory fields" exists to eliminate, and it depends on a master list that ADM-035 defers. **State the limitation honestly: non-QR ad-hoc captures carry no task/risk type and fall outside the grouping.** This decision depends on Decision 10 — if task/risk type do not exist on the context record, no grouping is possible at all.

**Decide by:** before Milestone 2. **Commercial note:** the sum of ADM-005/037/038/039 is counts and a latest-five list; no grouping panel is in any requirement.

---

## 32. Can content ever move between the Community and Corporate feeds? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** The general Community feed is specified as drawing from the whole user base, but corporate content is firewalled and the architecture enforces hard tenant isolation. Nothing defines whether a corporate signal can reach Community, who approves it, or whether a corporate worker can even see the Community feed.

**Evidence**
- Tender Pack WRK-024: "A general feed which will show good practices and positive behaviours from all over the user base not just from specific sites"; Corporate Requirement: "Corporate feed remains private/site-based; selected anonymised learning **may later be shared if permitted**."
- Tender Pack D16: "it must not expose corporate/client content **unless explicitly approved**."
- Dev Pack §7: "row level security (RLS) to ensure strict data segregation between community and corporate layers."
- Talentica Slide 14: "tenant-based isolation between Community and Corporate data"; Slide 12 admin scope lists only "Feed Moderation".

**Options**
1. **Hard isolation for MVP:** corporate signals never leave their tenant; corporate workers see only their site/sub-site feed; the Community feed carries Community-tenant users only. No cross-flow UI.
2. Read-only bridge: corporate workers get a clearly-labelled read-only Community tab; nothing they submit can go there.
3. Admin-approved promotion: an admin can promote a corporate signal to Community, stripping identity and site context.
4. Worker-chosen destination at submit ("share to site" vs "share to community").

**Recommendation — Option 1, with the data model shaped so Option 3 is a later addition.** Option 4 adds a decision to the capture flow and directly threatens the 60-second, zero-mandatory-field constraint. Option 3's approval, anonymisation and audit machinery is **unpriced** — Talentica's admin scope lists only "Feed Moderation" — and both D16 ("unless explicitly approved") and WRK-024 ("may later be shared if permitted") read as future-tense permission, not an MVP feature. **Record explicitly that corporate workers do not see the Community feed in MVP**, so PWA navigation is designed once.

**Decide by:** before Milestone 2.

---

## 33. How is Community content moderated — before or after it publishes? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** Moderation is named as the hard differentiator for Community, and the vendor's Community journey has moderation as an explicit step **after** publication — but no flag/report control exists in any requirement, and the only moderation filters are site/sub-site, dimensions Community content does not have.

**Evidence**
- Dev Pack §15.6: "Community environments require moderation, verification, abuse protection, and simplified public UX."
- Dev Pack §17.2 Scenario 4 — Malicious Public Reporting: "System requires moderation and abuse detection." / "Confidence scoring and duplicate detection may be required." / "Anonymous mode should not enable harassment."
- Talentica Slide 8, Step 4: "Moderation and Verification — Shared content is reviewed and **duplicates removed**" — placed after Step 3 "shares to the community feed".
- Tender Pack ADM-032 Filter: "classification flag, Site, Sub site, worker" — the only defined moderation filters.
- Tender Pack WRK-024 Community Requirement: "Required as the foundation of the Community platform, but must be moderated and learning-focused."

**Options**
1. **Post-publish reactive only:** Community signals go live immediately; add a user-facing "Report this" control on every feed card, a per-account rate limit, and a SafeIn5 moderation queue ordered by report count. **State explicitly that abuse detection, confidence scoring and duplicate detection are NOT in MVP.**
2. Pre-publish review: every Community submission is invisible until a SafeIn5 moderator approves it.
3. Hybrid: Good Practice and Be Aware publish immediately; Needs Attention Now is held for review.
4. No Community submissions in MVP (removes the requirement entirely).

**Recommendation — Option 1.** It is the only option that preserves the confirmation-and-feed reinforcement loop the whole capture design depends on, and it is the smallest addition to the already-scoped ADM-031–034 set. **ADM-032's filter set must be amended so moderation works on content with no site or sub-site.** Talentica's Slide 8 promises "duplicates removed" and nothing prices it — that promise needs correcting or funding.

**Decide by:** before Milestone 2.

---

## 34. Who closes the loop on a Community signal? ⚠ COMMERCIAL
**Kind:** scope-mismatch

**What is open:** The vendor's Community journey ends in escalation to external authorities and status updates back to the community. No requirement covers external escalation, no role owns a Community signal (supervisors are site-assigned corporate roles), and external integrations are explicitly excluded.

**Evidence**
- Talentica Slide 8, Step 5: "Authority / Owner notification — Signal is escalated to concerned authorities wherever applicable"; Step 6: "Resolution and feedback — Status updates shared back with the community"
- Talentica Slide 13, Features Not Required: "**Corporate / external system integrations.**"; Slide 12 MVP scope contains no escalation item.
- Dev Pack §17.2 Scenario 1: "Potential escalation to local authority or asset owner."; Scenario 3: "Moderation and escalation ownership required." / "System should avoid public panic or misuse."
- Tender Pack ADM-001: "Community administration is SafeIn5 internal only for MVP."
- Tender Pack CQA-012 (SHOULD / Phase 1): "A simple feedback/status loop is desirable for Phase 1."

**Options**
1. Acknowledge + Close applies to Community too, performed by SafeIn5 internal moderators; no external notification.
2. **Option 1 plus a manual escalation status:** a moderator can set a Community signal to "Escalated" with free-text detail (which authority was contacted) and later to "Closed", with status displayed publicly on the signal. Contacting the authority happens outside the system.
3. No action loop for Community in MVP; the Community feed is peer learning only, and Slide 8 Steps 5–6 are formally struck from scope.
4. Build external escalation properly (authority directory, notification routing, resolution tracking).

**Recommendation — Option 2.** It closes the black-hole risk §17.1 Scenario 5 names as existential and satisfies CQA-012's "simple feedback/status loop", while keeping authority contact manual — exactly the pattern SafeIn5 already accepted for QR placement in QA-004 ("the physical placement and site verification process can remain largely manual during MVP"). It reuses the Acknowledge + Close state already agreed rather than inventing a second lifecycle. **Option 4 must be rejected** on Slide 13's exclusion of external integrations, and because §17.2 Scenario 3 warns against public panic — automated authority escalation with no verification is exactly that risk. **Whichever option is chosen, Slide 8 Steps 5–6 must be reconciled in the scope baseline: at present the proposal shows the client a journey the MVP does not deliver.**

**Decide by:** before Milestone 2.

---

## 35. What happens on first run — install prompt, permissions, and anonymity explanation?
**Kind:** gap

**What is open:** The frame map begins at Frame 04; Frames 01–03 are in scope but never described. Nothing specifies what an invited worker sees after clicking the enrolment email, when "Add to Home Screen" is offered, or when camera, microphone and geolocation permissions are requested — the permissions the 60-second flow depends on.

**Evidence**
- Dev Pack §9 IN SCOPE: "Community flows (Frames 01–10)" — but §6 maps only Frames 04, 05, 06, 07, 08/09 and 10. **Frames 01–03 are never mapped.**
- Dev Pack §10: "including a line item for Progressive Web App (PWA) implementation to support the "Add to Home Screen" and offline capabilities."
- Dev Pack §13: "A user can: • **Enter the app** • Capture a Behaviour Signal in under 60 seconds" — "Enter the app" is never defined.
- Tender Pack ADM-026: "Automated email dispatcher that sends platform enrollment links straight to the user's inbox."

**Options**
1. Zero onboarding: QR deep-link opens straight into contextual content; permissions requested lazily at first use; install offered by browser default only.
2. Primed onboarding: a 2–3 screen first-run sequence (what SafeIn5 is, anonymity, permission priming, install prompt) before the first capture.
3. **Post-first-signal onboarding:** nothing precedes the safety content; after the confirmation screen, offer install and explain anonymity and the feed — earning the install with a completed action. Camera and microphone permissions primed with an in-app explanation immediately before the OS prompt fires.
4. Invite-email-led: the enrolment link lands on a dedicated welcome/install page; QR-first guests get the zero-onboarding path.

**Recommendation — Option 3 combined with Option 4's dedicated invite landing page.** Interrupting a first-time user standing at a confined-space entry with a tutorial is the exact friction the product exists to remove, so nothing may precede the safety content. But the install prompt and anonymity explanation must happen somewhere, and the confirmation screen is already reinforcement-shaped. **First action for Discovery: confirm what Frames 01–03 actually contain**, since they are in scope, unmapped, and may already answer this.

**Decide by:** before Milestone 2.

---

## 36. How does a worker find their own signal again, and what brings them back? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** Repeat usage is the stated primary success measure and closure is shown publicly with no individual notification — yet the journey ends at the confirmation screen, the feed auto-filters to the worker's current sub-site, and there is no "my signals" view or filter.

**Evidence**
- Dev Pack §14: "The primary success measure is **repeat usage**, not feature completion."
- Dev Pack §15.5, final step: "Worker receives acknowledgement or closure feedback."
- Dev Pack §6: "Frame 07 – Confirmation: • Reinforcement messaging • Finalises Behaviour Signal" — the frame map ends here; **no next step is defined**.
- Tender Pack WRK-014 filters: "Filter by Classification … Filter by Sub-site location" — **no author or "mine" facet**.
- Working PRD §5.5: "Acknowledgement and closure are displayed publicly on the signal in the feed; an anonymous reporter sees the outcome by viewing it."
- Talentica Slide 22, Milestone 4 PWA: "**worker feedback loop**" — named as a deliverable, specified nowhere.

**Options**
1. Confirmation lands the worker in the feed with their own signal at the top. No other mechanism.
2. **Option 1 plus a "My Signals" view** listing the signed-in worker's own signals with state (Submitted / Acknowledged / Closed) and an unseen-update badge. Nothing is pushed; the worker pulls.
3. A "Mine" filter added to the existing feed filters instead of a separate view.
4. Passive only: rely on incidental discovery in the public feed; instrument whether closed signals are re-viewed and revisit in Phase 2.

**Recommendation — Option 2.** Option 1 alone is the minimum and should be built regardless — the confirmation screen currently terminates the journey with no onward path, which is a straightforward design defect. But a worker who signals at the lifting zone and next scans a different sub-site sees a feed that no longer contains their signal, and closure typically arrives days later; without a retrieval path the feedback loop that justifies the whole Acknowledge+Close decision exists on paper only. Option 2 is compatible with the no-notification rule (nothing is pushed) and with account-level anonymity (the ownership link exists in the account regardless of display-name stripping). Option 3 is cheaper but collides with WRK-013's MUST auto-filter, which would keep hiding the worker's own out-of-zone signals. **Talentica's Milestone 4 "worker feedback loop" line must be resolved into this concrete deliverable.**

**Decide by:** before Milestone 2.

---

## 37. Does the admin console report the metrics the MVP must prove, and can data be exported? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** Five of the eight required success metrics — QR scans, Learn 5 engagement, repeat usage, supervisor review activity, and Community-vs-Corporate use — have no dashboard widget, report or export. It is also unclear whether pilot evidence comes from the product or from Mixpanel/Clarity.

**Evidence**
- Tender Pack Success Metrics (**MUST**): "QR Scans / Context Journeys — Evidence that QR contextual workflow is being used in corporate environment."; (MUST) "Repeat Usage"; (SHOULD) "Learn5 Views / Completion"; (SHOULD) "Signals Reviewed / Actioned".
- Tender Pack QA-003: "it should include basic analytics and **exportable usage data** to support future investor, client and product decisions."
- Tender Pack ADM-004: "…live total counts for Good Practice, Emerging Risk, and Stop & Act Now entries **across projects**" — an entity that does not exist; ADM-005/037/038/039 complete the set.
- Talentica Slide 19: "Usage Metrics – Telemetry Capture | Microsoft Clarity, MixPanel"; Slide 18: "Collect metrics such as active users, PULSE completion rates, SIGNAL Captures per user, Feed interactions, QR Scan frequency, and Anonymous usage".

**Options**
1. **In-product coverage of all eight Success Metrics** as dashboard widgets (adding QR scans by site/sub-site, Learn 5 views/completions, repeat-usage rate, signals acknowledged/closed) **plus a CSV export** of raw signal and scan events.
2. Keep the five specified widgets; source the rest from Mixpanel/Clarity operated by SafeIn5, with no client-facing view.
3. Minimal dashboard plus a single CSV/event export from which any metric can be derived offline.
4. Two surfaces: a lightweight client-facing site dashboard, plus a SafeIn5-internal "Pilot Metrics" page carrying the validation metrics and export.

**Recommendation — Option 1, subject to sizing; Option 4 if budget forces a cut.** QA-003 asks explicitly for exportable usage data and QR Scans is a **MUST** metric — a MUST metric with no reporting surface is a scope hole, not a design choice. If the numbers live only in Mixpanel, the pilot client's site lead cannot see them and SafeIn5 cannot produce per-site evidence without vendor tooling access. Marginal cost is low once the events are instrumented, which Slide 18 already commits to. **Fix the dashboard's scope (organisation vs single site, driven by role) and default time window at the same time, and correct ADM-004's "across projects" to "across sites".**

**Decide by:** before Milestone 2 (event instrumentation must exist from the first build).

---

## 38. Does the admin console show per-worker activity, when anonymity strips the link?
**Kind:** conflict

**What is open:** The user directory is specified to show each worker's activity volume and feed management to filter by worker — but anonymity strips user metadata at the database layer, so those figures will be silently incomplete, and per-individual counts sit against an explicit ruling against performance scoring.

**Evidence**
- Tender Pack ADM-024 (MUST / MVP): "Comprehensive directory table tracking all registered crew members, their site assignments, and their **activity volume metrics**."; ADM-032 Filter includes "worker"; ADM-031: "…posted date and time, **worker profile**".
- Dev Pack §7: "Anonymity must be handled by **stripping user metadata at the DB level** when the "Anonymous" flag is active."
- Tender Pack D28 (ADM-039): "Show activity by site and crew only as engagement/learning indicators. **Avoid language that implies worker performance scoring.**" Strategic Reasoning: "SafeIn5 should remain influence-led, not surveillance-led."
- Dev Pack §17.1 Scenario 2: "User fears retaliation if management sees their identity."

**Options**
1. Remove per-worker activity volume from ADM-024 and the "worker" filter from ADM-032; report engagement at site and crew level only. Anonymous signals render as "Anonymous" with no profile link anywhere in the admin UI.
2. Keep per-worker counts but count non-anonymous signals only, with an explicit caveat and an "anonymous (unattributed): N" aggregate.
3. **Replace volume with a binary engagement indicator** — "active in last 30 days: yes/no" — plus Option 1's removal of the worker filter and no admin-visible identity path on anonymous signals.
4. Retain a system-resolvable identity link so counts are complete, hidden from the UI but present in the data.

**Recommendation — Option 3, incorporating Option 1's removals.** D28 and §15.1 rule against anything reading as individual performance data, and the confirmed anonymity model makes complete per-worker counts technically impossible without Option 4 — which contradicts the anonymity promise and should be rejected. A binary "active recently" flag still serves the real admin need (spotting users who never onboarded) without creating a leaderboard. If per-worker volume is retained for pilot troubleshooting, Option 2's caveat is **mandatory** so supervisors do not read zeros as disengagement.

**Decide by:** before Milestone 2.

---

# TIER 3 — Can wait (settle before Milestone 4 / pilot start)

## 39. How is a Rescue Plan versioned, and what does a worker see if the cached copy is stale?
**Kind:** gap

**What is open:** "version / review date" is a required field with no lifecycle — who sets it, what happens when a review date passes, whether there is approval before publishing safety-critical content, and what a worker sees when the offline copy is older than the server's.

**Evidence**
- Dev Pack §8.3: "• version / review date" — the only mention of versioning or review dates in any source document.
- Tender Pack ADM-020 is the only admin requirement covering rescue content: "Add details of learn 5, take 5, rescue plan though text fields" — no version, status, approver or review handling.
- Working PRD §5.9: the Rescue Plan is "the only screen with a mandated offline guarantee" because "absent connectivity has a safety consequence rather than a usability one."
- Talentica Slides 7, 13 and 14 contain no content versioning, review or approval capability.

**Options**
1. Free-text version/review-date typed by the admin and displayed verbatim; no system behaviour.
2. **System-managed version incremented on save, admin-set review-due date, a "review overdue" flag in the admin site list, a visible "Version X · reviewed DD/MM/YYYY" line plus cached-copy timestamp on the worker page, and silent revalidate-on-reconnect.**
3. Full approval workflow: draft → approved by a named approver → published, unpublishing on expiry.
4. No versioning; treat the Rescue Plan as always-current.

**Recommendation — Option 2.** It delivers the §8.3 field as a real governance signal at low cost and gives the worker a visible timestamp on a cached copy, so a stale plan is detectable. **Reject Option 4 outright:** unversioned emergency content that can be cached offline is a safety risk, not a scope saving. Option 3 is Phase 2 enterprise governance, consistent with the deferred supervisor state machine.

**Decide by:** before Milestone 4 (but the version field must exist in the data model at Milestone 2).

---

## 40. Which Learn 5 card appears at the "L" step of PULSE?
**Kind:** ambiguity

**What is open:** Learn 5 appears inline in PULSE, as a QR destination, and as a browsable list — but nothing says which item is chosen for the inline card, or whether it is designated, ordered or rotating.

**Evidence**
- SafeIn5.md, PULSE step: "L – Learn — A short Learn 5 card appears: "Incorrect shackle loading can create side-loading failure.""
- Dev Pack §3: "L - Learn: Recall the fundamentals and the safest option."
- Dev Pack §6: "Frame 08/09: • Search and Learn functionality"
- Talentica Slide 7, step 2: "Learn – Learn 5 Card appears – Incorrect shackle loading can create side loading failures."

**Options**
1. **Admin designates exactly one "PULSE card" per context; the same card appears at the L step on every scan.**
2. The first item of the context's ordered Learn 5 list is used; the admin controls order.
3. Rotate through the context's items so repeat scans show a different card.
4. No inline card — the L step links into the list and the worker chooses.

**Recommendation — Option 1, with Option 2 as the fallback when no card is designated.** An explicit designation keeps the sequence deterministic and testable, is authorable by a site lead, and needs one extra field. Option 3 would mitigate repeat-scan fatigue but adds selection state and makes the experience non-reproducible at UAT — raise it as a Phase 2 improvement backed by PULSE-completion instrumentation.

**Decide by:** with Decision 19 (content model), so the field exists; behaviour can be finalised later.

---

## 41. What counts as "completing" a Learn 5 module?
**Kind:** ambiguity

**What is open:** Learn 5 completion is a named success metric and must be instrumented, but "completion" is undefined for a card with no end state — so there is no UI control to build and no event to log.

**Evidence**
- Tender Pack Success Metrics (SHOULD): "Learning | Learn5 Views / Completion | Evidence that workers are accessing short learning content."
- Tender Pack QA-003: "Number of Learn5 views/completions."
- Dev Pack §14: "Engagement with PULSE and Learn 5"
- Dev Pack §8.4 defines the item only as "title", "short description", "media (image/video)", "optional link to Behaviour signals" — no completion state, quiz or acknowledgement.

**Options**
1. Drop "completion"; instrument views only (open event plus dwell time).
2. Implicit completion: scrolled to the end, or video watched to ≥90%.
3. **Explicit one-tap acknowledgement ("Got it") at the end of each card, logged as a completion.**
4. Micro-check question at the end of each module.

**Recommendation — Option 3.** It is the only definition that behaves identically for text-only and video modules, is unambiguous to report, and costs one glove-friendly 48×48dp button consistent with the accessibility decisions already taken. **Reject Option 4** — a knowledge check reads as testing and compliance, contradicting "influence before compliance" and the non-punitive positioning. Option 2 alone is unreliable on short cards that fit one screen.

**Decide by:** before Milestone 4.

---

## 42. Is the threshold-based "early warning" flag in the MVP? ⚠ COMMERCIAL
**Kind:** conflict

**What is open:** ADM-040 is the pack's only requirement explicitly marked for a Discovery decision — and the vendor's priced stack already contains a "rule-based alert evaluator". Undecided whether it is in, what the threshold is, who configures it, and how it is worded so it does not read as prediction.

**Evidence**
- Tender Pack ADM-040 (SHOULD, Phase "Phase 1 / Phase 2", Decision "**Discovery Workshop Decision**"): "A system indicator that automatically changes color or flags an alert on the dashboard if a site submits more than a set threshold of critical danger logs." Statement: "A simple rule-based alert may be considered… **It must not be presented as predictive AI.**"
- Tender Pack Decision Register: "DISCOVERY | 0" — counted as zero, despite ADM-040 carrying that verdict.
- Talentica Slide 19: "Background work | In-process workers — outbox flusher, **rule-based alert evaluator**, transcription dispatch"
- Talentica Slide 13 (Phase 2): "Automated insights workflow (auto-generated push notifications)."
- Tender Pack CQA-009 (WON'T / Phase 2): "AI, computer vision, predictive analytics and automated classification are not MVP dependencies."

**Options**
1. **In scope, dashboard-only, fixed threshold** (e.g. N Needs Attention Now signals in one sub-site within a rolling 7 days highlights that sub-site). No notification, no configuration UI, threshold in config. **Renamed to something descriptive such as "Repeated attention flag".**
2. In scope with a notification as well as the dashboard flag.
3. In scope and admin-configurable per site.
4. Out of MVP; defer with the rest of Intelligence & Insights and remove the rule-based alert evaluator from the priced stack.

**Recommendation — Option 1.** The mechanism costs almost nothing — Talentica has already priced the evaluator — and it delivers the analytics band's actual purpose: making a repeated pattern visible without AI. Dashboard-only respects Slide 13's exclusion of auto-generated push. A hard-coded pilot threshold follows ADM-035's ruling that "Too much configurability early can weaken standardisation and increase build cost"; with ~50 users across 3 organisations there is no case for per-site tuning. **The rename is not cosmetic:** "Early Warning" and "Proactive Intervention Trigger" are precisely the words ADM-040's own ruling forbids, and the label appears in the UI.

**Decide by:** before Milestone 4. **Commercial note:** the evaluator is priced but the feature is formally undecided — the pack's only Discovery item.

---

## 43. Does the worker get a profile/settings screen, and is anonymity on or off by default?
**Kind:** gap

**What is open:** No worker profile, settings or account requirement exists anywhere in WRK-001…024 — yet anonymity has been made an account-level setting the worker sets once, and the default value has never been chosen.

**Evidence**
- Tender Pack WRK-001…WRK-024 contain **no profile, account or settings requirement**; the only profile requirement is admin-side ADM-025.
- Working PRD §5.5: "**Account-level** — the worker sets it once in their profile; it applies to all their signals. Not a per-signal toggle."
- Talentica Slide 14: "GDPR compliance, including export, delete, and retention policies."
- Dev Pack §15.4: "Anonymous and confidential reporting modes should be supported."

**Options**
1. **Minimal settings screen** (anonymity toggle, current site, sign out) with **default = identified**, and the choice surfaced once at first submission so it is a conscious decision rather than an unvisited default.
2. Minimal settings screen with default = anonymous, to maximise psychological safety during validation.
3. Full self-service account screen (anonymity, notifications, data export, account deletion, email change).
4. Anonymity chosen once at onboarding with no settings screen at all.

**Recommendation — Option 1 (borrowing Option 4's first-run moment).** A mandated account-level setting with no screen is unbuildable, and if the choice lives only in a settings screen most pilot users will never open, the default becomes the product decision. Defaulting to anonymous would suppress the crew-to-crew attribution that makes "safer by sharing" visible and would leave supervisors unable to follow up on a Needs Attention Now signal. Option 3 is disproportionate for a ~50-user pilot.

**Decide by:** before Milestone 4 (the default must be agreed earlier if it affects the data model).

---

## 44. Who handles GDPR export and deletion, and what happens to a deleted user's signals?
**Kind:** gap

**What is open:** Export, delete and retention are promised as an NFR alongside an append-only audit log, and scheduled as a Milestone 4 line item — but nobody owns the request, there is no screen, no retention period exists in any document, and the deletion cascade is undefined.

**Evidence**
- Talentica Slide 14: "EU-based data residency with GDPR compliance, including **export, delete, and retention policies**… **Append-only audit logging enabled**."
- Talentica Slide 22, Milestone 4: "…moderation, reporting, GDPR compliance, deployment readiness."
- Tender Pack ADM-028 "Delete/Block User" (MUST / MVP) — **Functional Description column is blank**.
- Tender Pack ADM-023 is the only cascade-on-delete behaviour described anywhere in the pack.

**Options**
1. **Admin-mediated only:** a corporate admin can export a user's data and delete a user; **deletion anonymises the user's signals in place** (author becomes "Removed user") so the safety learning survives in the feed. One platform-wide retention period agreed at Discovery.
2. Admin-mediated hard delete of the user **and** all their signals and media, removed from feeds and counts.
3. Worker self-service export and delete in the PWA profile screen.
4. Manual/out-of-band handling by SafeIn5 via database scripts; no UI in MVP.

**Recommendation — Option 1.** GDPR requires erasure of the **person**, not of the observation; Option 2 would silently delete safety content from a live site feed and destroy the crew-to-crew learning that is the product's value. Anonymise-in-place also reconciles the append-only audit commitment with the right to erasure, which Option 2 cannot. Option 3 adds PWA screens with no pilot need at ~50 users. Option 4 leaves ADM-028's delete button undefined, which is worse than not shipping it. **A retention period exists nowhere in any document and must be set at Discovery.** Note the cascade rule is a Milestone 2 data-model decision even though the UI is Milestone 4: it determines whether authorship is a hard foreign key or a nullable, anonymisable reference.

**Decide by:** UI before Milestone 4; **cascade rule before Milestone 2.**

---

## 45. Is there one Learn 5 library or two, and who can author Corporate content? ⚠ COMMERCIAL
**Kind:** gap

**What is open:** The two-mode requirement (Community generic / Corporate controlled) is stated repeatedly but never modelled — one shared library with a visibility flag or two separate libraries, who may author Corporate content, and whether a corporate tenant can reuse a SafeIn5 Community module.

**Evidence**
- Tender Pack D4 (WRK-004/007): "Content should be capable of being used in two modes: Community generic content and Corporate controlled content."
- Tender Pack CQA-010: "SafeIn5 will provide initial Learn5 content. MVP should allow generic Community content and Corporate/site-specific content capability."
- Tender Pack SCP-004 Community: "SafeIn5-curated generic micro-learning content by topic, industry or risk theme."; Corporate: "contextual client/site/task content linked to QR journeys".
- Tender Pack D16: Community content "must not expose corporate/client content unless explicitly approved."
- Talentica Slide 12 lists only "Learn 5 content management and mapping" — **no Community/Corporate content distinction anywhere in the scope slides.**

**Options**
1. Single global library with a visibility flag per item (Community / Corporate / Both), authored only by SafeIn5; corporate admins may map but not author.
2. Two entirely separate libraries with no sharing in either direction.
3. **Global SafeIn5 library that every corporate tenant can map from, plus tenant-private items authored by corporate admins; sharing one-way only (Community → Corporate, never Corporate → Community).**
4. Defer the Community library; build tenant-scoped Corporate content only and treat Community as a tenant seeded with SafeIn5 content.

**Recommendation — Option 3.** It matches CQA-010 exactly, and the one-way rule enforces D16's firewall **structurally** rather than by policy — corporate-authored learning can never surface in Community without a deliberate promotion action that is not in MVP. "Community vs Corporate Use" is itself a MUST success metric ("Evidence that architecture can support free Community use and controlled Corporate use"), so content scoping must be in the data model from Milestone 2 or 3. **Talentica's scope slides contain no Community-content line item — this needs pricing confirmation at Discovery.**

**Decide by:** with Decision 19; data model before Milestone 3.

---

## 46. How is the Community feed browsed and filtered?
**Kind:** conflict

**What is open:** Corporate feed filtering uses the site/sub-site hierarchy, which explicitly does not exist for Community. All three candidate substitutes — user tags/topics, geolocation, and a city master list — are each deferred or contradicted, so there is no defined way to browse or filter the Community feed.

**Evidence**
- Tender Pack WRK-013/014/015 Community Requirement: "Community does not require formal sub-site hierarchy, but users **may later** tag general locations or topics."
- Tender Pack SCP-012 Community Requirement: "Required as a Community learning feed, **organised around topics** and positive/shared learning."
- Talentica Slide 13, Phase 2: "Manual / user tagging in the feed."
- Tender Pack ADM-036 "List of cities | CRUD" — COULD / Phase 2 / "Defer / Minimise"; WRK-021 Deep Search — COULD / Phase 2 / Defer; ADM-006 heat map — Defer: "Heat maps require reliable location data and sufficient volume".

**Options**
1. **Chronological plus classification filter only** — a flat reverse-chronological card list filtered by Good Practice / Be Aware / Needs Attention Now.
2. A fixed SafeIn5-defined topic list (8–12 risk themes) selectable at submit and filterable in the feed.
3. Geo-first: captured location drives a proximity/city filter and "nearby" warnings.
4. Free user tagging (reverses Talentica's Phase 2 exclusion).

**Recommendation — Option 1 for MVP, with Option 2 as the first Phase 2 increment.** Option 4 is explicitly excluded by Slide 13 and contradicts ADM-035's rationale that "Too much configurability early can weaken standardisation". Option 3 depends on reliable location data — the same objection SafeIn5 used to defer the heat map — and collides with the accepted position that location masking is out of MVP. **Note that dropping topics means SCP-012's "organised around topics" wording must be formally amended rather than silently ignored.**

**Decide by:** before Milestone 4.

---

# COMMERCIAL RISK SUMMARY — where the Tender Pack and the Talentica proposal imply different build sizes

These carry direct risk against the fixed £45,000 price. Each should be reconciled in writing before Milestone 1 sign-off.

| # | Decision | Tender Pack implies | Talentica proposal implies | Exposure |
|---|---|---|---|---|
| 2 | Video capture | WRK-019 MUST/MVP; CQA-007 Phase 2; tenderer confirmation **left blank** | Slide 12 in scope, Slide 14 30s cap — but Slide 19 media stack is image-only (`sharp`) | Recorder UI, video pipeline, poster frames, queue profile |
| 3 | Media payload | "Multiple images … if simple" (undefined count) | No client-side compression component named anywhere | Full-resolution originals over patchy cellular; capture-first-sync-later fails |
| 4 | Voice & transcription | WRK-020 MUST/MVP, text "within the message box" | Slide 19 "transcription dispatch" background worker + third-party STT — architecturally incompatible with the requirement | Async worker + STT contract vs on-device (free) |
| 6 | Push notifications | WRK-022 MUST/MVP (with wrong ruling text) | Slide 13 excludes auto push; Slide 19 provisions web-push; Milestone 4 lists "notifications" on **both** workstreams | Notification service, permission flow, install dependency |
| 16 | Supervisor surface | Every supervisor-adjacent row is an ADM (desktop) row; no acknowledge requirement exists | Slide 17 puts Supervisor in the PWA; Slide 22 puts supervisor workflows in Admin & Platform | Potential double build of one capability |
| 18 | Supervisor triage queue | Only ADM-005 "latest 5" list | No queue, no digest, no latency tracking in any milestone | New console/PWA view + timestamps |
| 19 / 45 | Content model | ADM-020 "text fields" on the site record | Slide 12 "content management and mapping"; Milestone 3 "context configuration" — but **no Community-content line item** | Library + mapping UI vs a longer site form; unpriced Community authoring |
| 24 | In-app QR scanner | D13 MUST: re-scan mid-session "without friction" | Slide 19 lists `qrcode` (generation) and **no scanning library** | Scanner component currently unpriced |
| 26 | Geolocation | Appears in **no** WRK/SCP requirement | Slide 8 Community flow only; **absent from Slide 12 scope** | Permission UX, storage, anonymity handling — unpriced |
| 27 | Face blurring | Dev Pack §15.4 asks it be considered | Slide 13: "explicitly out of scope and not planned" | Reinstating it is a change request, not a re-scope |
| 31 | Trend discovery | Success Metrics SHOULD; QA-003 names task-level themes | Slide 9 promises "Quick trends to help supervisors take action"; no requirement delivers it | New dashboard grouping panel |
| 32 / 34 | Community cross-flow & escalation | D16 "unless explicitly approved"; no escalation requirement | Slide 8 Steps 5–6 present escalation and resolution feedback as delivered; Slide 13 excludes external integrations | Two journey steps currently promised and unbuilt |
| 33 | Community moderation | ADM-031–034 reactive admin CRUD only, filtered by site/sub-site | Slide 8 Step 4 promises "duplicates removed"; nothing prices duplicate detection | Report control, queue, rate limiting |
| 36 | Worker feedback loop | No requirement | Milestone 4 lists "worker feedback loop" as an unspecified phrase | "My Signals" view undefined and unsized |
| 37 | Metrics & export | QA-003 requires "exportable usage data"; QR Scans is MUST | Metrics live in Mixpanel/Clarity, not the product | Client cannot see MUST metrics; export unbuilt |
| 42 | ADM-040 alert | The pack's **only** Discovery-decision item | Slide 19 already prices a "rule-based alert evaluator" | Feature formally undecided but already in the stack |

---

**Two document corrections required regardless of any decision above:**
1. WRK-013 still specifies the retired label "Stop & Act now"; WRK-010's ruling is "Good Practice, Be Aware and Needs Attention Now".
2. ADM-004 refers to counts "across projects" — an entity that does not exist in the data model; it should read "across sites".