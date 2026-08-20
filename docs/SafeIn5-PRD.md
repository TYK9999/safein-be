# SafeIn5 — Business PRD

> **Status:** Draft — in progress. Generated incrementally from the `prd-questions` discovery framework.
> **Sources:** SafeIn5 Dev Pack V9 Issue · SafeIn5 MVP Requirements Specification & Tender Pack v1.0 · SafeIn5.md (Rigging & Fixtures scenario) · Talentica Proposal — SafeIn5
> **Discovery progress:** Section 1 (Vision & Business Context) complete — Q1–Q7.

---

## 1. Executive Summary

SafeIn5 is a behavioural safety intelligence platform for frontline industrial workers. It is explicitly **not** a compliance reporting system: it turns everyday worker observations into shared safety awareness *before* incidents occur, using two connected loops — **PULSE** at the point of work and **SIGNAL** as the platform intelligence layer.

Phase 1 is a **validation MVP**. Its purpose is to prove that workers will capture and share safety signals in under 60 seconds in real operational environments, and — critically — that they come back and do it again. Repeat usage is the primary success measure, not feature completion.

**Key objectives**
- Prove sub-60-second, zero-mandatory-field Behaviour Signal capture in the field.
- Prove QR-driven contextual routing end-to-end for at least one full use case.
- Establish a scalable, non-throwaway architecture that preserves clean structured data for the future SIGNAL intelligence layer.

**Target audience:** frontline workers/technicians, supervisors/site leads, and platform administrators, initially in the UK extractive/quarrying domain.

**Delivery envelope:** ~14 weeks across 5 milestones; fixed price GBP 45,000 (±15–20% pending Discovery); pilot of ~50–60 users across 3 organisations × 3 sites plus a shared Community tenant.

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

> SafeIn5 is a behavioural safety intelligence platform, not a reporting system. It helps frontline workers turn everyday observations into shared safety awareness before incidents occur, built on two connected loops: **PULSE** (Pause, Uncover, Learn, Shift, Echo) at the point of work, and **SIGNAL** (Sense, Identify, Gather, Navigate, Alert, Loop) as the intelligence layer. Core principle: **"Safer by Sharing" — influence before compliance.**
>
> The value proposition is sub-60-second, zero-mandatory-field capture that fits the existing work rhythm, delivered as one platform across two operating models: a free **Community** platform (adoption engine) and a monetised **Corporate** platform (governance and intelligence).

*Confirmed by SafeIn5 — Q1.*

### 2.2 Problem Statement

Traditional safety reporting systems fail at the frontline because they demand long forms, logins, incident categorisation, and carry a fear of blame. The result is that the vast majority of near-misses, workarounds, setup deviations and temporary unsafe conditions — the micro-signals that precede serious incidents — are never captured at all. Where systems do capture reports, a second failure follows: the **"report black hole,"** where workers submit signals, see no visible action or feedback, and engagement collapses.

Three connected problems:

| # | Problem | Consequence |
|---|---------|-------------|
| 1 | **Capture friction** | Reporting takes too long and demands too much typing for gloved, goggled workers under schedule pressure. |
| 2 | **Fear and blame** | Person-first reporting discourages sharing; workers will not identify colleagues. |
| 3 | **No learning loop** | Signals flow upward for compliance rather than sideways crew-to-crew, so the same risk repeats on the next shift. |

*Confirmed by SafeIn5 — Q2.*

### 2.3 Business Objectives

**Primary (Phase 1 — validation):**
1. A worker can enter the app, capture a Behaviour Signal in under 60 seconds, classify it in under 10 seconds, and see it appear in the feed.
2. QR routing works end-to-end for at least one full contextual use case (e.g. confined space → PULSE + Rescue Plan + Learn 5).
3. Workers return — **repeat usage is the primary success measure.**

**Secondary (foundation):** build a scalable platform, not a throwaway. Phase 1 architecture must capture clean, structured SIGNAL data and preserve the relationships needed for the future intelligence layer without requiring a rebuild.

*Confirmed by SafeIn5 — Q3.*

### 2.4 Expected Business Value

**For pilot organisations:** earlier visibility of near-miss intelligence before it becomes a formal incident; supervisor trend awareness (e.g. "3 similar Be Aware signals in 2 weeks on custom lifting fixtures") driving toolbox talks and lift-plan reviews; crew-to-crew learning that stops the same risk repeating on the next shift.

**For SafeIn5 Ltd:** Community is the free adoption engine that grows the user base and the signal corpus; Corporate is the monetised governance layer. Long-term defensibility is the SIGNAL data asset — repeated frontline signals revealing patterns before incidents occur, enabling eventual predictive prevention.

> **DECISION (Q4):** Business-impact targets are deliberately **left unquantified for the MVP**. Phase 1 is framework validation; adoption and safety-outcome targets will be set after the pilot produces baseline data. Phase 1 is measured only against the success metrics in §14.

### 2.5 Success Metrics

See §14. Primary measure: **repeat usage**, not feature completion.

---

## 3. Target Market & User Personas

> **In progress** — pending Q8 onward.

### 3.1 User Personas

| Persona | Role | Relationship to the product |
|---------|------|------------------------------|
| **Frontline Worker / Technician** (e.g. "Dave Smith", Senior Rigger) | Point-of-work operative in heavy fabrication yards, quarries, shutdown maintenance and offshore prep areas. Works in gloves and goggles, on a personal or company rugged device, with intermittent WiFi/cellular. | Key contributor to PULSE. Identifies and shares risks without disrupting work. |
| **Supervisor / Site Lead** | Owns situational awareness for a site or sub-site. | Consumes trends, runs toolbox talks, acts on and closes signals. |
| **SafeIn5 Platform Administrator** | Sets up tenants, users, sites, QR context mappings, Learn 5 content and workflows. | Desktop admin console user. |

### 3.2 Market Need

> **DEFERRED (Q5).** Working assumption carried forward: primarily a **gap in the market** (existing EHS platforms are compliance-and-audit shaped; nothing serves sub-60-second, non-punitive, worker-owned behavioural capture), secondarily **pricing** (incumbent suites are priced for enterprise HSE departments, making a free Community tier disruptive). **To be confirmed at Discovery** — including whether any specific regulation drives the UK quarrying/extractive focus.

### 3.3 Target Customer Segments

**Primary target (Corporate platform):** small-to-mid-size industrial operators — quarries, contractors, fabrication yards, plant hire. Organisations with no dedicated HSE software budget, for whom incumbent EHS suites are too heavy and too expensive. *(Q8)*

**Explicitly not** large-enterprise EHS estates in the near term. SafeIn5 is not positioned as a frontline layer alongside Enablon/Cority-class systems at this stage.

**Pilot scope is not market scope.** The 3 organisations × 3 sites × ~50–60 users pilot is a validation vehicle only and must not be read as the target customer profile. *(Clarified by SafeIn5.)*

**Geography:** **UK only** for MVP and near term. EU-based data residency is an architecture and GDPR-compliance decision, **not** a signal of EU market entry. MVP is English-only; multilingual/localisation is Phase 2. *(Q9)*

> **DISCOVERY ITEM:** if the Community tier permits open self-registration, it will attract users outside the UK regardless of commercial focus, with consequent GDPR and moderation implications. Needs a decision on whether Community sign-up is geographically constrained.

> **OPEN:** whether the Community tier targets the same industrial population or a broader public audience. To be resolved in Users & Personas.

### 3.4 Monetization Strategy

> **DEFERRED — commercial questions descoped from this discovery round at SafeIn5's direction.**

| Item | Status |
|------|--------|
| Expected ticket size (ACV/ARR) | **Not yet determined.** Pricing discovery follows the pilot; no figure assumed. *(Q10)* |
| Pricing model | **Not yet determined.** Tender Pack commits only to "future monetised subscription model" for Corporate. *(Q11)* |
| Community tier | Free at point of use — assumed constant throughout. |
| Buyer value proposition | Deferred. *(Q13)* |
| Go-to-market strategy | Deferred. *(Q14–Q15)* |

**Architectural consequence:** because per-tenant cost tolerance is unknown, the Phase 1 architecture should avoid designs that assume either a high-ACV (dedicated infrastructure) or low-ACV (aggressively shared) model. Tenant-level segregation with row-level security, as already proposed, keeps both options open.

---

## 4. Competitive Landscape

### 4.1 Competitor Analysis

> **DEFERRED (Q6).** Competitive analysis is deferred to Discovery. No competitors are named in the source documents and SafeIn5 has not yet supplied a list.

### 4.2 Key Differentiators

1. **Influence before compliance** — explicitly not a reporting or surveillance system. Non-punitive by design: condition-first rather than person-first, optional anonymity, no naming of individuals, no disciplinary tone.
2. **PULSE Method™ and SIGNAL as proprietary IP** — a named, ownable behavioural framework rather than generic "Take 5" industry wording. This is product identity, not terminology.
3. **Sub-60-second capture with zero mandatory fields** — photo/voice-first, WhatsApp-grade friction, built for gloves and goggles. Capture first, structure later.
4. **QR as a primary entry point, not a secondary feature** — the physical-to-digital bridge. Context (site, asset, task, risk type) attaches automatically, so the worker types nothing.
5. **Crew-to-crew lateral learning** — the value is sideways, not upward. One crew's finding stops another crew repeating it, which upward-reporting compliance systems do not deliver.
6. **One platform, two operating models** — free Community adoption engine and monetised Corporate governance layer sharing common services, architected so neither requires a rebuild.
7. **A compounding data asset** — repeated frontline signals become the SIGNAL intelligence layer: reactive reporting → shared awareness → pattern detection → predictive prevention. Defensibility grows with usage.

*Confirmed by SafeIn5 — Q7.*

### 4.3 Market Positioning

> **In progress.**

---

## 5. Product Overview

> **In progress.**

### 5.1 Design Approach & Authority

**DECISION (Q16) — Split design authority:**

| Surface | Authority | Milestone 1 activity |
|---------|-----------|----------------------|
| **Worker PWA** (Feed, Capture, Classification, Confirmation, PULSE, Search/Learn 5) | Existing **Figma Frames 01–10** are authoritative. Frames exist and Talentica has access. | Validation, refinement and gap-filling — **not** concepting. |
| **Admin console** (org/site/sub-site setup, user management, QR configuration, Learn 5 authoring, moderation, dashboard) | **Designed fresh** by Talentica. | Full design. Frames 01–10 have **zero coverage** of these surfaces. |
| **Supervisor workflows** (trend awareness, assignment, acknowledgement, closure) | **Designed fresh** by Talentica. | Full design. No frame coverage. |

> **Conflict resolved.** Dev Pack V9 §6 states developers *"must follow this flow without deviation"*; the Talentica proposal prices *"maximum 2 concepts to arrive at one detailed design."* The split above supersedes both: frames bind the worker flow, fresh design covers everything they omit. Milestone 1 scope and the 15% payment tranche should be re-read against this.

### 5.2 Accessibility & Field-Environment Usability

> **Status: assumed from recommendation — confirm at Discovery.** No accessibility requirement appears in any source document.

**Hard MVP requirements**

| # | Requirement | Rationale |
|---|-------------|-----------|
| A1 | **Glove-friendly touch targets** — minimum 48×48dp, generous spacing, no precision gestures (pinch, long-press-drag) | Workers operate in gloves; precision input is unavailable. |
| A2 | **Sunlight-readable contrast** — high-contrast palette validated outdoors, not only against contrast ratios on a monitor | Quarries, yards and lifting zones are outdoor environments. |
| A3 | **Voice-first, no mandatory typing** — no flow may *require* keyboard input to complete | Directly serves the sub-60-second and zero-mandatory-field constraints. |
| A4 | **One-handed operation** — primary controls in the bottom third of the screen | The other hand may hold equipment or a handrail. |

**Design principles (not testable requirements)**

| # | Principle |
|---|-----------|
| A5 | **Low-literacy / low-digital-confidence support** — icon-led navigation, plain English, no jargon. The app must not feel like paperwork. |
| A6 | **Noise tolerance** — no reliance on audio cues; voice capture degrades gracefully to text when transcription fails in high-noise conditions. |

**Deferred**

| # | Item | Status |
|---|------|--------|
| A7 | **WCAG 2.1 AA formal conformance** | **Phase 2 target.** Declaring conformance for MVP requires an audit budget not present in the £45k fixed price. Likely to be requested by enterprise buyers later. |

### 5.3 Visual Identity & Theming

**DECISION (Q18):**

- **Figma Frames 01–10 are the de facto design system.** Their palette, typography and components become the standard. The admin console and supervisor surfaces are built to match. No separate SafeIn5 brand guideline exists.
- **Community and Corporate are visually distinct but share components.** One component library, two theme layers.

> **ARCHITECTURE CONSEQUENCE:** theming tokens must be built into the shared component library from **Milestone 2**, not retrofitted. "Visually distinct" is a theming-architecture decision, not a styling decision, and reversing it later is expensive.
>
> **MVP theming scope remains limited to logo and colour** per the Talentica proposal. Full design-system customisation stays Phase 2. Note the tension: "visually distinct" Community vs Corporate identities may require more than logo-and-colour to achieve — to be sized at Discovery.

**Action:** Talentica requires access to Frames 01–10 before Milestone 1 begins, and a component/token extraction pass should be an explicit Milestone 1 deliverable.

### 5.4 Supervisor Workflow Scope

**DECISION (Q19): Acknowledge + Close only.**

The supervisor can mark a Behaviour Signal **Acknowledged** and **Closed** with a comment, and the originating worker sees that it happened.

| Considered | Outcome |
|---|---|
| Light — feed awareness only (SafeIn5.md "Phase 1 Light Workflow") | **Rejected.** Dev Pack §15 and §17 Scenario 5 identify unacknowledged reports as an existential trust risk that collapses engagement — which would undermine the primary success metric (repeat usage). |
| **Acknowledge + Close** | **SELECTED.** Minimal state, closes the "report black hole." |
| Full state machine — `New → Assigned → Acknowledged → Actioned → Closed` with evidence and audit trail (Dev Pack §7) | **Deferred to Phase 2.** Enterprise-governance scope aimed at a segment not targeted near-term (see §3.3); would consume Milestone 4. |
| Full state machine minus evidence | Deferred with the above. |

> **CONFLICT RESOLVED.** Dev Pack §7 specifies the full state machine with assignment, evidence-before-close and audit trail; SafeIn5.md describes a manual "Phase 1 Light Workflow"; the Talentica proposal places "supervisor workflows, approvals, notifications" in Milestone 4. This decision supersedes all three. **Dev Pack §7 objects (Review Task, Assignment, Evidence) are out of MVP scope**, though the data model should not preclude them.

### 5.5 Anonymity Model

**DECISION (Q20): Account-level setting + no individual closure notification.**

| Aspect | Decision |
|--------|----------|
| **Where anonymity is set** | **Account-level** — the worker sets it once in their profile; it applies to all their signals. Not a per-signal toggle. |
| **Rationale** | Keeps the capture flow free of an extra decision, protecting the sub-60-second target. |
| **Trade-off accepted** | The worker cannot make case-by-case judgements — e.g. attaching their name to a Good Practice signal while staying anonymous on a Needs Attention Now concerning their own crew. |
| **Closure feedback** | **No individual notification.** Acknowledgement and closure are displayed publicly on the signal in the feed; an anonymous reporter sees the outcome by viewing it. |
| **Rationale** | A system that retained a resolvable identity link in order to notify would contradict the anonymity promise. Public closure also demonstrates to *every* viewer that signals get actioned — the trust behaviour the product needs to prove. |
| **Rejected** | *Pseudonymous link* (system-resolvable identity — contradicts the promise); *device-local claim token* (closest to true anonymity, but disproportionate build for MVP). |

**Implementation:** anonymity enforced at the data layer by stripping user metadata when the flag is active, and masked in audit logs, per Dev Pack §7 and the Talentica proposal.

**Scope limit (carried from the Talentica proposal):** *true* anonymity — location masking, non-reversibility by administrators — is **not** in MVP. MVP anonymity is display-level and data-layer enforced, but administrators may retain technical means of correlation. **This must be stated honestly to pilot workers**; overpromising anonymity is a trust risk larger than not offering it.

> **DISCOVERY ITEM — guest users have no account to hold an account-level setting.** Guest/QR access is a MUST (Tender Pack WRK-003) and Community self-registration is in scope. Guest submissions therefore need their own rule — presumed **anonymous by definition**. Requires confirmation, and interacts with the onboarding decision below.

### 5.6 Access & Onboarding Model

> **REVISED at Q40. Supersedes the earlier "guest reads, account writes" position.**

**Access differs by operating model. Community submits freely; Corporate submission requires an invited account.**

| Action | Community | Corporate |
|--------|-----------|-----------|
| Scan QR → view PULSE, Rescue Plan, Learn 5 | **None** | **None** |
| View the feed | **None** | **Account required**, assigned to that organisation — see §5.25 |
| **Submit a Behaviour Signal** | **None — fully open** | **Invited account required** |
| Admin console | Authenticated (ADM-001–003) | Authenticated (ADM-001–003) |

**This follows the documents, which split the two tiers by action:**

**WRK-003** (MUST) — Community: *"Required. Community users **must** be able to access SafeIn5 without belonging to a corporate tenant."* Corporate: *"Supported where appropriate for **QR-led viewing**, but **corporate signal submission may require known-user or assigned-user context** depending on pilot rules."*

**WRK-001** — Community: *"Community users should **not** be forced into corporate invitation-only access… self-registration and/or guest access to maintain low friction."* Corporate: *"Corporate users **require controlled access through invitation, role assignment and organisation/site permissions**."* Ruling: *"the design must not assume that all users are corporate users… must support Community users who may join independently **and** Corporate users who are invited or assigned by an organisation."*

**WRK-002** — OTP *"Optional for Community"*, *"Useful for Corporate."*

> **ANSWERS WRK-003's deferred question.** The amendment asked *"whether all signal submissions must be linked to a named worker or whether limited guest submissions are acceptable."* **Answer: Corporate submissions are linked to a named worker; Community submissions are not.**

**Three places that require identity to exist at all — and are satisfied by the Corporate side of this split:**
- **Dev Pack §5, System layer:** *"Authentication (user + optional anonymity)"*, *"Role-based access"*, *"Consent and visibility control"*
- **Dev Pack §7:** *"Anonymity must be handled by **stripping user metadata** at the DB level when the Anonymous flag is active"* — metadata that was never captured cannot be stripped, so anonymity as specified **presupposes an identity**
- **Dev Pack §14:** repeat usage defined as *"**same user** shares multiple Behaviour Signals"*

#### Cascade — consequences of open Community submission

| Ref | Impact |
|-----|--------|
| **§5.5 Anonymity** | Coherent for **Corporate** (accounts exist, metadata can be stripped per Dev Pack §7). For **Community**, submissions are anonymous by default with no account to hold the setting. **The Community anonymity model needs re-specifying.** |
| **§5.12 Moderation** | **Per-account rate limiting is unavailable for Community** — the control recommended against Dev Pack §17.2 Scenario 4 (malicious reporting). With an open public feed (§5.11) and post-moderation, anyone with the URL can publish anonymously. Requires device- or IP-based limiting instead: weaker, and **unpriced**. |
| **§5.10 Recognition** | Site-level visibility survives for Corporate. No personal contribution view exists for Community. |
| **§5.21 Supervisor routing** | Unaffected — supervisors are authenticated. |
| **Closure feedback** | Corporate submitters can be linked to their signals. **Community submitters have no identity and no "my signals" view** — closure visibility depends on returning to the feed and finding the signal. *(Register Decision 36.)* |
| **Repeat usage (primary metric)** | Measurable by identity for **Corporate**. For **Community**, only by device heuristic. Since the pilot is Corporate (3 orgs × 3 sites), the primary metric remains measurable. |
| **Register Decisions 8, 23** | **Moot for Community**; still live for Corporate. |

### 5.7 PULSE Presentation

**DECISION (Q22/Q23): PULSE is a sequence. Always the full sequence.**

| Aspect | Decision |
|--------|----------|
| **Screen model** | **Sequential** — Frame 10 shows a sequence, and per §5.1 the frames are authoritative for the worker PWA. |
| **Repeat scans** | **No condensed variant.** The full sequence shows every time, including repeat scans of the same QR context. Adaptive/condensed PULSE is not in MVP and is not scheduled. |
| **Relationship to capture** | Distinct activities with distinct budgets: PULSE targets **under 5 minutes** (Dev Pack §3); capture targets **under 60 seconds** (Dev Pack §4). Talentica's "single-screen" commitment (Slide 18) applies to **capture only** — it was never a PULSE commitment. |

> **WATCH ITEM — validate in Milestone 1.** A sequential PULSE sits against Talentica's stated UX principle of "context specific content… to avoid scroll, click" (Slide 16). This is not a conflict — the time budgets differ — but the sequence must be validated against both targets during UX design rather than assumed to pass.

> **RISK — repeat-scan fatigue.** Workers scan the same context daily (the SafeIn5.md scenario has Dave at the same lifting zone under crane-window pressure). A fixed sequence that never adapts is one workers may learn to tap through without engaging, which would erode the behavioural intent while leaving usage metrics looking healthy. **Mitigation:** Slide 11 already commits to instrumenting usage metrics — PULSE completion time and repeat-scan frequency per context should be explicitly instrumented so this can be detected and revisited in Phase 2.

### 5.8 Learn 5 Delivery Model

> **Status: assumed from recommendation (Q24) — confirm at Discovery.**

**Native hosting with an external adapter.**

| Aspect | Decision |
|--------|----------|
| **Primary path** | **Native.** Learn 5 content hosted within SafeIn5 — title, short description, media (image/video), optional link to Behaviour Signals. Authored and managed via the admin console. |
| **Secondary path** | **External adapter** — ability to link out to third-party content (e.g. 5mins.ai) where SafeIn5 content does not yet exist. Opens in browser or webview. |
| **Volume assumption** | ~20–30 modules authored by SafeIn5 (Talentica NFRs, Slide 14). |

**Rationale:** *"Engagement with PULSE and Learn 5"* is a stated Phase 1 success metric (Dev Pack §14). Engagement cannot be measured inside a third party's product, so an external-only model would forfeit a success criterion. The adapter pattern is already in the proposed architecture (Slide 16), so the secondary path costs little.

> **RESOLVES Dev Pack §8.4**, which required developers to quote Option 1 (external) and Option 2 (native) as alternatives. The answer is: build Option 2, retain Option 1 as a fallback route.

**Requirement:** Learn 5 engagement must be instrumented — views, completion, and which QR context drove the view — otherwise the success metric remains unmeasurable regardless of hosting model.

### 5.9 Connectivity & Offline Behaviour

**DECISION (Q25): Queued uploads, app must be open. Rescue Plan cached offline.**

| Scenario | Behaviour |
|----------|-----------|
| **Capture with no connectivity** | Worker completes capture normally. Signal queues locally and uploads when connectivity returns **while the app is open**. |
| **App closed before sync** | **No background sync.** Queue resumes when the worker reopens the app. |
| **Rescue Plan, no connectivity** | **Cached and readable offline.** The only screen with a mandated offline guarantee. |
| **Feed, no connectivity** | **Blank / offline state.** Not cached. |
| **Learn 5, no connectivity** | Not cached — follows the feed. |

**Rationale for caching the Rescue Plan alone:** it is the single screen where absent connectivity has a *safety* consequence rather than a usability one. A worker at a confined space entry needs the emergency procedure whether or not there is signal. Everything else may fail gracefully.

> **Out of scope, confirmed:** full offline-first capture and sync store (Talentica Slide 13); service-worker background sync after app close — deliberately excluded, and note that iOS Safari background sync is unreliable in any case, which supports the exclusion.

> **RISK:** Dave's environment is described as *"intermittent WiFi / patchy cellular"* — i.e. degraded connectivity is the **normal** operating condition, not an edge case. "App must be open" means a worker who captures a signal and pockets their phone may not sync until their next session. **Mitigation:** the UI must clearly indicate unsent items and their count, and the app should attempt sync immediately on foreground. Queue durability across app restarts must be explicitly tested.

### 5.10 Recognition & Reinforcement

**DECISION (Q26): Team / site-level visibility. No individuals named.**

| Aspect | Decision |
|--------|----------|
| **Model** | Site-wide contribution visibility — counts, activity, outcomes attributed to the **site or team**, never to a named worker. |
| **Rejected** | *Message-only* (leaves the primary success metric to chance); *individual recognition / leaderboards / badges* (Dev Pack §15.2 warns against creating a "snitch culture"; volume-based recognition rewards quantity over quality, which in safety means noise crowding out signal). |

> **RISK — the site league table.** Site-level counts can still become a comparison metric between sites. A supervisor reading a cross-site ranking reintroduces precisely the punitive performance dynamic Dev Pack §15.1 forbids.
>
> **Mitigations (design requirements):**
> 1. Frame as collective contribution, not ranking — *"your site shared 40 signals this month, 12 led to changes"*.
> 2. Do **not** expose cross-site comparison in the supervisor dashboard.
> 3. Weight visible outcomes toward *closures and changes made*, not raw submission volume.

### 5.11 Community Tier Definition

**DECISION (Q27): The Community tier serves BOTH populations — individual industrial workers and the general public — in ONE shared feed.**

Community is an open platform carrying both industrial behavioural signals from workers outside a corporate tenant *and* public hazard reports (damaged walkways, open manholes, flooding, unsafe crowd conditions), with escalation to local authorities or asset owners. Corporate remains the private industrial platform serving small-to-mid-size UK operators (§3.3).

**This resolves the ambiguity flagged at Q8.** Community is not an industrial-only funnel into Corporate; it is a genuinely open, mixed-population platform.

| | Community | Corporate |
|---|---|---|
| **Population** | **Both** — individual workers outside a tenant **and** the general public, sharing one feed | Industrial workers within a tenant |
| **Access** | Open self-registration; guest reads | Invited/assigned accounts |
| **Content** | **Mixed** — industrial behavioural signals **and** public infrastructure/environmental hazards | Site, asset and task-linked behavioural signals |
| **Escalation** | Local authority / asset owner | Site supervisor |
| **Moderation** | Heavy — open, mixed population | Light — closed, accountable population |

#### ⚠️ SCOPE & COMMERCIAL RISK — requires Discovery resolution

Choosing the public model activates Dev Pack §17.2 requirements that are **absent from the Talentica scope and milestones**:

| Dev Pack §17.2 / Talentica Slide 8 requirement | Status in Talentica proposal |
|---|---|
| Moderation and verification of public reports | "Feed Moderation" is listed, but sized for a closed industrial user base |
| Abuse detection and governance for malicious reporting (Scenario 4) | **Absent** |
| Confidence scoring and duplicate detection | **Absent** |
| Escalation to local authority / asset owner (Slide 8, step 5) | **Absent from all milestones** |
| Resolution status returned to the community (Slide 8, step 6) | **Absent** |
| Geolocation as a core, relied-upon field | Specified only as "optional… where permissions allow" |
| Geographic clustering of reports (flood scenario) | **Absent** — adjacent to the deferred risk heat map |

**Consequence:** this is material exposure against the fixed **GBP 45,000** price (stated tolerance ±15–20%). Either the Community build is descoped for MVP, or the price and milestones are revisited.

#### Interactions with earlier decisions

| Earlier decision | Collision |
|---|---|
| **§3.3 UK-only (Q9)** | Open public self-registration will not respect national borders. Requires either geographic gating of Community sign-up or acceptance of non-UK users, with GDPR consequences. |
| **§5.5 Account-level anonymity (Q20)** | Dev Pack §17.2 Scenario 4: *"Anonymous mode should not enable harassment."* A far sharper risk with an open public population than a closed industrial one. Anonymous public reporting needs abuse controls that account-level anonymity alone does not provide. |
| **§5.6 Guest reads, account writes (Q21)** | **Helps.** Requiring an account to submit gives the only handle available for abuse control and rate limiting in an open population. |
| **§5.10 Site-level recognition (Q26)** | "Site" has no meaning for a public reporter. Community needs its own recognition model — geographic area, or none at all. **Open.** |

#### The mixed-feed problem — NEW, created by this decision

Serving both populations in **one shared feed** introduces design problems that neither a public-only nor a worker-only Community would have. None of these are addressed in any source document.

| # | Issue | Why it matters |
|---|-------|----------------|
| M1 | **Relevance collision** | A rigger has no use for an open-manhole report three towns away; a resident has no use for shackle side-loading guidance. An undifferentiated feed is low-value to *both* audiences and directly threatens repeat usage — the primary success metric. |
| M2 | **Two incompatible context models** | Industrial signals are contextualised by **site / sub-site / asset / task** (via QR). Public reports are contextualised by **geolocation**. One feed must carry, filter and sort both. |
| M3 | **Classification fit** | *Good Practice / Be Aware / Needs Attention Now* was designed for industrial behavioural observation. "Needs Attention Now" on an open manhole implies an emergency-services expectation SafeIn5 does not fulfil. |
| M4 | **Learn 5 relevance** | Learn 5 content is industrial and SafeIn5-authored (~20–30 modules). It has no obvious counterpart for public reporters, leaving the "Learn" step of PULSE thin or empty for that population. |
| M5 | **PULSE applicability** | PULSE is a pre-task behavioural pause for someone about to do work. A member of the public reporting a hazard is not about to perform a task — the PULSE sequence (§5.7) may not apply to them at all. |
| M6 | **Corporate leakage** | Tender Pack WRK-024 requires the general feed "must not expose corporate/client content unless explicitly approved." With a mixed Community population, the boundary must be enforced technically, not by convention. |

**Required decision (not yet taken):** how the shared feed is segmented — by topic, by geography, by audience self-selection at onboarding, or not at all. This shapes the feed data model and should be settled **before Milestone 1 UX design**.

> **OPEN — Community personas.** §3.1 documents three industrial personas only. **Two** further personas must be authored: an individual worker operating outside a corporate tenant, and a general-public reporter.

### 5.12 Community Moderation & Escalation

**DECISION (Q28): Post-moderation with manual escalation.**

| Aspect | Decision |
|--------|----------|
| **Publication** | Public and Community reports **publish immediately**. No approval queue. |
| **Moderation** | **Post-moderation** — admins hide or delete after publication. |
| **Escalation** | **Manual.** An admin can flag a signal as referred to a local authority or asset owner, and record a status. **No integrations** with authority systems. |
| **Feedback** | Escalation status and resolution are returned to the Community feed, delivering Talentica Slide 8 steps 5–6 in their cheapest honest form. |

**Rationale:** post-moderation without escalation would recreate the "report black hole" — the failure Dev Pack §15 and §17.2 Scenario 5 identify as fatal to engagement — in the tier that is now the adoption engine. Full pre-moderation with abuse detection, confidence scoring and duplicate detection (Dev Pack §17.2 Scenario 4) is deferred to **Phase 2**.

> **REQUIRED SUPPORTING CONTROLS — recommended, not yet confirmed.** Post-moderation on an open population is only viable with:
> 1. **User report/flag control** on public content, so abuse surfaces without an admin monitoring the feed continuously.
> 2. **Per-account rate limiting** — the cheapest available defence against the malicious-reporter scenario (Dev Pack §17.2 Scenario 4).
>
> Neither appears in the Talentica scope. Both should be confirmed at Discovery.

> **RESIDUAL RISK:** immediate publication in an open, mixed population means defamatory, identifying or abusive content is publicly visible until an admin removes it. Post-moderation is a deliberate trade of safety-for-speed and should be accepted explicitly, with a documented takedown SLA.

### 5.13 Community Feed Segmentation

**DECISION (Q29): Audience self-selection at onboarding.**

| Aspect | Decision |
|--------|----------|
| **Mechanism** | At onboarding the Community user declares their context — **"I'm a worker"** or **"I'm reporting in my community"**. |
| **Effect** | Sets the default feed filter. The user may opt to view both. |
| **Cost** | One onboarding question and a default filter — near-zero build. |
| **Rejected** | *By geography* (misapplies the public model to industrial content, where the useful affinity is task type, not postcode); *by topic* (better long-term, but requires a taxonomy that does not yet exist, and Learn 5 is only ~20–30 modules at pilot); *no segmentation* (poor for both audiences). |

**Fast-follow:** topic/category following remains the better long-term model and should be revisited once a content taxonomy exists and volume justifies it.

> **Addresses M1** in §5.11. **M2–M6 remain open.**

### 5.14 PULSE Entry Points & Applicability

**DECISION (Q30): QR-triggered *and* directly launchable. Tender Pack WRK-005 governs.**

| Entry point | Behaviour |
|-------------|-----------|
| **QR scan** | Primary path. PULSE opens with full context pre-attached — site, sub-site, asset, task type, risk type (Dev Pack §8.2). |
| **Direct launch** | Available to **all users, including Community**. User starts PULSE without scanning, selecting a context or proceeding with none. |

> **CONFLICT RESOLVED.** An initial decision to make PULSE QR-triggered-only was **reversed**: Tender Pack **WRK-005** (MUST, *Approved with Amendment*) states in the Community Requirement column — *"Required, but branded as PULSE rather than Take5. **Community users should be able to launch PULSE directly.**"* QR-only would have made PULSE unreachable for every public reporter and every self-employed worker on the free tier, i.e. exactly the users WRK-005 names. WRK-005 governs.

**Strategic rationale:** PULSE Method™ is a core differentiator (§4.2) and Community is the adoption engine (§5.11). Withholding the differentiator from the growth tier would be self-defeating.

**Rejected:** *QR-only* (contradicts WRK-005); *divergent behaviour per tier* (satisfies WRK-005 literally but splits PULSE across operating models, cutting against the shared-component decision in §5.3).

#### Consequent open question — context-less PULSE

Direct launch means PULSE must function with **no site, asset, task or risk type attached**. This state is undefined in every source document:

| Step | With QR context | With no context |
|------|-----------------|-----------------|
| **P — Pause** | Works unchanged | Works unchanged |
| **U — Uncover** | "What looks different *here*?" — grounded in the work zone | **Undefined** — no zone to reference |
| **L — Learn** | Contextual Learn 5 card served by QR mapping | **Undefined** — no basis to select from ~20–30 modules |
| **S — Shift** | A deliberate improvement to the task at hand | **Undefined** — no task |
| **E — Echo** | Share the signal with context attached | Works, but the signal carries no context |

**Applicability limit (M5, §5.11):** PULSE remains a *pre-task* behavioural pause (Dev Pack §3). A member of the public reporting a hazard is not about to perform work, so four of five steps have no natural referent for them. Direct launch makes PULSE *reachable* by that population; it does not make it *meaningful* to them. **The generic/context-less PULSE content must be authored** — this is a content design task for Milestone 1, not a build task.

### 5.15 Classification in the Community Tier

**DECISION (Q31): Same three labels for both populations, with an emergency interstitial.**

Classification remains *Good Practice / Be Aware / Needs Attention Now* across Community and Corporate (Tender Pack WRK-010). When a **Community** user selects **"Needs Attention Now"**, an interstitial is shown before the report proceeds:

> *"If anyone is in immediate danger, call 999. SafeIn5 is not an emergency service."*

The report then proceeds normally. No blocking, no diversion.

| Aspect | Decision |
|--------|----------|
| **Taxonomy** | Unchanged and shared — required by the mixed feed (§5.13). |
| **Interstitial trigger** | Community-context reports classified "Needs Attention Now". |
| **Rejected** | *Separate Community labels* (breaks the shared taxonomy the mixed feed depends on); *published moderation SLA* (honest, but creates a staffed operational obligation nothing in the proposal covers); *suppressing the option for public reports* (removes the risk **and** the ability to flag genuinely urgent hazards — the §17.2 flood and crowd-safety scenarios are exactly those cases). |

**Rationale:** in Corporate, "Needs Attention Now" routes to a supervisor who is on site, on shift and accountable. In Community there is no supervisor and escalation is manual (§5.12), so the label carries an urgency promise the system does not fulfil. The interstitial addresses Dev Pack §17.2 Scenario 3's warning that the system *"should avoid public panic or misuse"* at the precise moment of risk, for the cost of one screen.

> **LEGAL POSITION — required regardless of design.** SafeIn5 must carry an explicit **"not an emergency service"** disclaimer in the Community terms of use *and* at the point of capture. This is a duty-of-care matter, not a design preference, and should be reviewed by counsel before the Community tier goes live.

### 5.16 Context Model

**DECISION (Q32): Polymorphic context object.**

A single context record attached to every Behaviour Signal and PULSE session, whose **shape varies by source** while exposing a common set of display fields to the feed.

| Source | Context carried |
|--------|-----------------|
| **QR-derived** (Corporate, and Community workers at QR-equipped sites) | site, sub-site, asset/location, task type, risk type, destination type(s), active/inactive — per Dev Pack §8.2 |
| **Geo-derived** (public reports, non-QR mobile capture) | device geolocation, where permission is granted |
| **Neither** (direct PULSE launch, permission declined) | no context — signal remains valid and renders without a context header |

**Rationale:** Dev Pack §8.2 already describes context as an object with defined fields, so a polymorphic variant **extends rather than redesigns** it. It is the only option that degrades gracefully when a user both declines location *and* has no QR — a case that certainly occurs for the self-employed worker on Community.

**Rejected:** *geolocation as universal spine* (makes the feed dependent on a permission users routinely refuse); *free-text location* (unfilterable data, and adds typing to a flow designed to eliminate it); *two separate signal types* (would undo the Tender Pack's Legend & Principles commitment to *"one platform that supports both Community and Corporate use without requiring a rebuild"*).

> ⚠️ **COMMERCIAL — geolocation is unpriced.** Geolocation appears in **no** WRK or SCP requirement and is absent from the Talentica scope slide (it appears only in the Slide 8 Community flow). This decision makes it load-bearing for the Community tier. Requires an explicit scope decision and pricing, not an assumption. *(Register Decision 26.)*

---

## Companion Document — Design Decision Register

A full adversarially-verified register of **46 outstanding design decisions** is maintained separately at **`SafeIn5-Design-Decision-Register.md`**, tiered by when each must be settled (Milestone 1 / Milestone 2 / Milestone 4), each written as a numbered question with numbered options.

It includes a **commercial risk summary of 16 items** where the Tender Pack and the Talentica proposal imply different build sizes — direct exposure against the fixed GBP 45,000 price.

**Decisions in this PRD that already resolve register items:** #33 and #34 (Community moderation and escalation) — §5.12; #46 (Community feed browsing) partly — §5.13; #35 and #8 (first run, account gate) partly — §5.6; #27 (face blurring / identity) context — §5.5.

**Two document corrections required regardless of any decision:**
1. **WRK-013** still specifies the retired label *"Stop & Act now"*; WRK-010's ruling is *Good Practice, Be Aware, Needs Attention Now*.
2. **ADM-004** refers to counts *"across projects"* — an entity that does not exist in the data model. Should read *"across sites"*.

### 5.17 Performance Budgets — Definition of "Under 60 Seconds"

**DECISION (Q33 / Register Decision 1): The clock covers capture and classification only.**

| Budget | Scope | Target |
|--------|-------|--------|
| **Capture + classification** | First tap on capture → classification confirmed. **Excludes** PULSE, **excludes** authentication, **excludes** upload completion. | **< 60 seconds** |
| **Classification alone** | Classification screen → selection confirmed (Dev Pack §4). | **< 10 seconds** |
| **PULSE sequence** | Full sequence, per Dev Pack §3. | **< 5 minutes** |
| **QR scan → PULSE render** | Cold load. **Stated separately** — not inside the 60s. | To be set at Milestone 1 |

**Measurement protocol — binding:** measured on a **mid-range Android device throttled to a 3G network profile**. An unthrottled measurement passes in an office and fails at a quarry gate.

> **MUST be written into the Definition of Acceptance.** Dev Pack §13 lists *"Enter the app"* and *"Capture a Behaviour Signal in under 60 seconds"* as adjacent bullets without stating whether the first sits inside the second. Left unresolved, this will be argued at UAT.

**Rejected:** *whole QR-to-confirmation journey including PULSE* (Tender Pack QA-001's literal wording) — this would force the full PULSE sequence inside 60 seconds and thereby **reverse** the decision in §5.7 that PULSE is a full, non-condensed sequence. QA-001 is read as loose summary language, not a third budget. Also rejected: dropping the gate to an observed-metric-only measure.

> **CONFLICT NOTED:** SafeIn5.md states *"Capture takes under 30 seconds"* — treated as illustrative narrative, not a competing budget.

### 5.18 Behaviour Signal Content & Media

**DECISION (Q34 / Register Decision 2): Video capture is IN for MVP, both tiers.**

Photo and video capture for Community and Corporate alike, **30-second maximum per clip** (Talentica Slide 14).

> **CONFLICT RESOLVED.** Tender Pack WRK-019/SCP-019 record video as MUST/MVP *Approved*; CQA-007 records priority MUST but phase **Phase 2**; WRK-019's Community column calls it a *"Could have"*; SCP-019's ruling text is photo-only. Two of three cells say MUST, the Dev Pack lists video in the Community Layer scope, and Talentica has priced and capped it. **Video is IN.**
>
> ⚠️ **ACTION REQUIRED:** CQA-007's tenderer confirmation column — *"Confirm whether video is included, optional, or excluded"* — was **left blank**. This is the one place the pack explicitly requested confirmation and never received it. It must be filled in writing.
>
> ⚠️ **COMMERCIAL:** Talentica's media stack (Slide 19) is `sharp` — an image library. **No video processing component** is named anywhere: no transcoding, no poster-frame generation, no video playback in the feed. Build size gap against the fixed price.

**DECISION (Q35 / Register Decision 3): Media optional, but at least one of {media, caption} required.**

| Rule | Specification |
|------|---------------|
| **Minimum content** | At least one of **{media, caption}**. No single field is individually mandatory; a wholly empty signal cannot be submitted. |
| **Maximum content** | Up to **3 photos** *or* **1 video** — mutually exclusive types. |
| **Source** | **Camera-only.** No gallery import. |
| **Editing** | Delete-and-retake only. No reordering, cropping or filters. |
| **Compression** | **Client-side downscale to ~1600px / ≤500KB per image — HARD REQUIREMENT.** |

**Rationale:** honours *"zero mandatory fields"* (Dev Pack §4) in spirit — the worker is never forced to type — while preventing content-free cards that would make the feed and moderation tools useless. A three-slot strip satisfies WRK-008's *"multiple images… if simple"* without becoming a gallery. Camera-only keeps timestamps and context trustworthy.

> ⚠️ **Client-side downscale is non-negotiable.** Nothing in the current stack prevents full-resolution originals being queued. With video now in scope for both tiers and the offline model requiring the app to stay open (§5.9), uncompressed payloads break capture-first-sync-later at exactly the *"intermittent WiFi / patchy cellular"* the pilot sites have.

### 5.19 Voice Capture & Transcription

**DECISION (Q36 / Register Decision 4): Hybrid — on-device transcription, audio discarded.**

| Aspect | Specification |
|--------|---------------|
| **Primary** | **On-device speech recognition.** Live transcript shown and **editable before submit**. |
| **Fallback** | Server-side re-transcription **only** where no device engine exists. If no engine is available, **disable the record affordance and fall through to the text field** — never silently drop the note. |
| **Audio retention** | **Discarded** once a transcript is accepted. Audio is **not** a feed artifact and is not playable. |

**Rationale:** the 60-second budget (§5.17) and the no-mandatory-typing rule (§5.2 A3) both require the worker to see and correct the transcript **inside** the flow — a wrong caption published to their crew is worse than no caption, and in a noisy quarry with regional accents bad transcripts are the norm. Device engine support aligns with the supported browser set (Safari iOS, Chrome Android).

> **Anonymity benefit:** discarding audio removes the hardest anonymity edge case cheaply. **A recorded voice identifies the speaker to their own crew regardless of what the database strips** — which matters because MVP anonymity is display-level only (§5.5).

> **CONFLICT RESOLVED.** WRK-020 requires transcription *"within the message box"* (synchronous, at capture); Talentica Slide 19 provisions a *"transcription dispatch"* background worker (server-side, asynchronous) — architecturally incompatible. **On-device synchronous wins.**
>
> ⚠️ **COMMERCIAL:** this **removes** the transcription-dispatch background worker and the third-party STT provider from the priced stack. Should be reflected commercially. *(Retaining audio would instead have added audio storage, a feed player, and an audio field to Dev Pack §2's media model.)*

### 5.20 Classification Gate

**DECISION (Q37 / Register Decision 5): Classification is MANDATORY.**

No skip on Frame 06. An unclassified item **remains a Behaviour Signal Draft and never enters the feed**.

**Rationale:** Dev Pack §4's *"zero mandatory fields"* rule is explicitly scoped ***at capture*** — it governs text and media, not the finalisation step. Both the object model (§1.1: a Draft is *"an incomplete signal… before a user has applied a classification"*; §2: a Signal is *"finalised after classification"*) and SafeIn5.md (*"That is the only required action. The signal is now finalized."*) treat classification as the act that finalises. An unclassified signal has nowhere to go in a feed that sorts by classification (WRK-013) or a dashboard whose MUST metric is the category split.

**Rejected:** *skippable defaulting to "Be Aware"*; *publishing as "Unclassified"* for admin triage.

> **MILESTONE 1 EXPERIMENT (not baseline):** merging classification into the capture screen as three large one-tap buttons that also submit is worth prototyping against the <10-second budget — but it conflicts with Frame 06 existing as a distinct authoritative frame (§5.1). Treat as a Discovery experiment only.

### 5.21 "Needs Attention Now" — Routing & Escalation

**DECISION (Q38 / Register Decision 6): Honest capture copy **plus** transactional supervisor notification.**

| Element | Specification |
|---------|---------------|
| **Capture copy** | Explicit copy on the Needs Attention Now option stating SafeIn5 is **not an emergency channel** and immediate dangers must still be raised by radio/supervisor. **Repeated on the confirmation screen.** |
| **Routing** | Every Needs Attention Now signal triggers a **transactional notification to the supervisor(s) of the affected site**. |
| **Channel** | Web-push (VAPID, already provisioned Slide 19), with **email as fallback** — the email service is already priced for magic-link/OTP. |
| **Not included** | No threshold or cluster logic. No worker-facing push. No predictive alerting. |

**This follows the documents.** The Dev Pack repeatedly specifies supervisor routing for this classification:

- **§2** — *"a risk that requires prompt awareness, **escalation, or action**"*
- **§15.5** — *"Signal routed to relevant feed or workflow… **Supervisor or Corporate workflow triggered where required**"*
- **§17.1 Scenario 2** — *"**Workflow routes signal to supervisor** with escalation tracking"*
- **§17.1 Scenario 5** — *"UX must include visible acknowledgement and closure workflows"*

**Why worker-facing push is excluded:** workers arrive via unauthenticated QR scan in a browser tab, where **iOS web push is unavailable without home-screen install**. Supervisors are a small, onboarded, named group — a reliable delivery target.

> **WRK-022 IS UNUSABLE AS EVIDENCE.** Flagged MUST/MVP for *"Live Worksite Warnings"*, but its **Detailed Requirement Statement is a verbatim copy of WRK-009's voice/caption ruling** and addresses alerts nowhere. A corrupted cell cannot be read as a decision. Cluster detection is in any case what **WRK-023 defers** to Phase 2.

> **TALENTICA RECONCILED:** Slide 13 excludes *"Automated insights workflow (**auto-generated** push notifications)"* — predictive/derived alerting, matching WRK-023. Slide 19 provisions `web-push (VAPID)` as infrastructure. **Transactional push is provisioned; automated push is excluded.** These are not in conflict.

#### Two gaps this decision does not close

| # | Gap | Consequence |
|---|-----|-------------|
| 1 | **Response timeframe is undefined.** Dev Pack §15.3 poses *"Who acts on Behaviour Signals and within what timeframe?"* under **Mandatory Human Factors Questions** and **never answers it** anywhere in the pack. | Routing without a stated expected response window rebuilds the black hole one step further along. **A timeframe must be set.** |
| 2 | **Response/closure time tracking.** §17.1 Scenario 5 requires the dashboard to *"track response and closure times"* — this appears in **no requirement** and nothing prices it. | Open as **Register Decision 18**. |

### 5.22 Submit, Upload & Confirmation States

**DECISION (Q39 / Register Decision 7): Publish on completion.**

A Behaviour Signal enters the site feed **only once its media has uploaded**. Until then it exists as a pending card **in the author's own view only**.

**Rationale:** WRK-012's ruling that the feed be *"card-based, quick to view"* and focused on operational awareness is undermined by empty placeholder cards. The author gains from seeing their own pending signal; other viewers gain nothing from an unfinished one.

#### Mandatory state model

Every signal carries a visible state:

| State | Meaning |
|-------|---------|
| **Queued** | Submitted, awaiting network |
| **Sending** | Upload in progress |
| **Sent** | Media landed; signal published to the feed |
| **Failed** | Upload failed after retries; awaiting manual retry |

**Rules:**
1. The author sees their pending signal as a **local card from the moment of submit** — so the confirmation message is never a lie.
2. **Automatic retries with backoff**, plus a manual **"Retry now"**.
3. **Nothing is ever silently discarded.**
4. A **persistent banner shows the unsent count**.

> This matters more than usual because background sync is excluded (§5.9) — **the app must be open for the queue to drain**, so unsent state must be unmissable.

**Two build requirements to confirm:**
1. **Reinforcement copy varies by classification** (three strings) so the Needs Attention Now path carries the expectation-setting message from §5.21.
2. **Resumable / multipart upload must be in the build.** Dev Pack §7 Media Service requires *"background processing and multipart uploads"*. Without it, every retry of a 30-second video restarts from zero on a network that is already failing.

> ⚠️ **ACTION REQUIRED — second blank tenderer column.** Tender Pack **CQA-008** asks *"Confirm proposed handling of failed/slow uploads"* and was **left blank in the issued pack** (as was CQA-007 on video, §5.18). Both must be answered in writing.

### 5.23 QR Landing Experience & Rescue Plan Placement

**DECISION (Q42 / Register Decision 9): Direct to PULSE with a persistent context header, plus a per-context "require Rescue Plan review" flag.**

| Element | Specification |
|---------|---------------|
| **Landing** | QR scan lands **directly in PULSE**. No hub screen. |
| **Persistent context header** | Always-visible **one-tap Rescue Plan and Learn 5 shortcuts** at every PULSE step and after completion. |
| **Per-context flag** | Admin-configurable **"require Rescue Plan review"** per QR context. Where set (e.g. confined space), a **mandatory full-screen Rescue Plan is shown before PULSE**. |
| **Default** | Flag **off** — Rescue Plan is a persistent link, not a blocking step. |

**Rationale:** SafeIn5.md Step 1 (*"The system immediately opens the SafeIn5 PULSE screen"*) and Talentica Slide 7 both show PULSE first, and PULSE is fixed as an always-full sequence (§5.7) — a hub would insert a tap before settled behaviour. But the Rescue Plan is the only destination with a **safety** consequence and the only screen mandated as offline-cached (§5.9); burying it behind a five-step sequence is not acceptable.

> **CONFLICT RESOLVED.** WRK-006/SCP-006 rate the Rescue Plan **SHOULD** — *"valuable but should not dominate the MVP"* — while Dev Pack §8.5 makes *"Working Rescue Plan route"* a Phase 1 deliverable and §13 requires *"QR routes correctly to PULSE / Rescue Plan / Learn 5"*. The per-context flag reconciles both: high-risk contexts force the read (satisfying §8.5 and §13); all others treat it as *"contextual supporting information"* per WRK-006 and do not spend the PULSE budget.

> **NEW DESIGN REQUIRED.** Frames 01–10 contain **no QR landing state**. Despite the split authority in §5.1 placing the worker PWA under the frames, this screen must be designed fresh at Milestone 1.

> **OUT OF SCOPE — "survey".** Dev Pack §8.6 refers to *"The confined space **survey**, rescue plan, PULSE, Learn 5"*. The term **appears nowhere else in any document** and no requirement defines it. Declared explicitly out of scope so it does not resurface as an assumed deliverable.

### 5.24 QR Context Object & Site Hierarchy

**DECISION (Q43 / Register Decision 10): Location spine plus context attributes.**

This specifies the **QR-derived branch** of the polymorphic context object (§5.16).

| Element | Specification |
|---------|---------------|
| **Managed hierarchy** | **Organisation > Site > Sub-site.** This is the only managed entity hierarchy. |
| **Asset / location** | **Sub-site *is* the asset/location dimension.** No separate Asset entity is built. |
| **Task type** | Optional attribute **on the QR context record**, chosen from a **fixed SafeIn5-seeded list**. No admin CRUD. |
| **Risk type** | As above — attribute on the QR context record, fixed seeded list. No admin CRUD. |
| **Also on the record** | Destination type(s); active / inactive status. |

**Principle: the four dimensions are *carried*, not *managed*.** The documents mandate that context be captured and stamped onto every signal, while simultaneously refusing to fund entity management for it. Attributes on the QR record satisfy both.

**Required by:**
- **§8.2** — *"Each QR code **must** map to a context object containing: site • asset/location • task type • risk type • destination type(s) • active/inactive status"*, and that context *"**must** be passed into PULSE sessions, Behaviour SIGNAL creation, Rescue Plan display"*
- **§1.1** — *"Context: Specific data (Site, Asset, Task, or Risk Type) automatically attached to a signal or session via a QR code scan"*
- **§12** — Phase 1 must *"capture clean SIGNAL data and preserve the structure needed for future SIGNAL intelligence"*
- **SafeIn5.md** — shows all four populated live: Site, Lift zone, Asset ID, Task type = Heavy Lift, Risk type = Suspended Load

**Constrained by:**
- **WRK-007** — *"assets, machinary or any localised workspace — we are taking all these things as sub-sites"*
- **WRK-013/014/015 ruling** — *"Avoid complex asset management"*
- **ADM-012–023** — contain **no asset, task or risk fields**; site provisioning is name, sub-site group, city
- **Master library CRUD** — deferred to Phase 2

> **CRITICAL DEPENDENCY:** task type and risk type are the **only available basis for the supervisor trend view** — the *"3 similar Be Aware signals in two weeks, all related to custom lifting fixtures"* moment in SafeIn5.md. Without these attributes there is nothing to group signals on. *(See Register Decisions 18 and 31.)*

**Rejected:** *two levels only* (drops two mandated dimensions, contradicting §8.2 and §1.1); *full entity model with Asset entity and Task/Risk master libraries* (contradicts *"avoid complex asset management"* and the Phase 2 master-library deferral; adds two unpriced admin modules); *free-text context tags* (contradicts §12's requirement for structure).

> **NOTE:** task type and risk type appear **nowhere** in the Talentica proposal. Slide 12 covers *"site, subsite, assets"* only. Small scope addition to confirm.

### 5.25 Corporate QR — Unauthenticated Resolution

**DECISION (Q44 / Register Decision 11): Tiered resolution.**

| Destination | Unauthenticated scan of a Corporate QR |
|-------------|----------------------------------------|
| **PULSE** (that context) | ✅ Resolves |
| **Rescue Plan** (that context) | ✅ Resolves |
| **Learn 5** (that context) | ✅ Resolves |
| **General Community feed** | ✅ Resolves |
| **Corporate site / sub-site feed** | ❌ **Account required**, assigned to that organisation |

**Rationale:** Dev Pack §8.1 insists QR is *"a primary entry point, not a secondary feature"*, and reading a confined-space rescue plan at the entry point cannot sit behind a login — so gating everything is untenable. But **the feed *is* the corporate content**: worker-authored signals, live site conditions, and identities where non-anonymous. QR codes are *"printed and physically placed"* (QA-004) on public-facing barriers, so an open corporate feed means anyone who photographs a sticker can browse a paying client's safety signals indefinitely.

**Required by:**
- **WRK-024 / SCP-024** — *"Corporate feed remains private/site-based"*; ruling **D16** — *"it must not expose corporate/client content unless explicitly approved"*
- **Talentica Slide 14** — *"tenant-based isolation between Community and Corporate data"*
- **Dev Pack §7** — *"row level security (RLS) to ensure strict data segregation between community and corporate layers"*

> ⚠️ **IMPLEMENTATION REQUIREMENT — non-negotiable.** QR URLs **must carry a high-entropy, non-enumerable token**, not a readable site slug. Without this the scoping rule is decorative: `/site/quarry-3` is guessable from `/site/quarry-2`.

> **NARROWS §5.6.** Corporate guest access covers **PULSE, Rescue Plan and Learn 5 only** — not the site feed. The earlier reading of WRK-003's *"QR-led viewing"* as including feed access was too broad.

**Rejected:** *fully open* (contradicts D16 and SCP-024); *redacted guest feed* (still exposes corporate operational content); *per-tenant toggle* — reasonable as a Discovery variant if a pilot client wants an open feed, but **default closed**.

### 5.26 Feed Scope

**DECISION (Q45 / Register Decision 12): Site-scoped by default; sub-site as a clearable filter.**

| Behaviour | Specification |
|-----------|---------------|
| **Default scope** | All signals for the **current site**. |
| **After a QR scan** | The scanned sub-site is **pre-applied as a filter chip** — visible, and **clearable**. Not a hard scope. |
| **No scan / cold open** | Feed shows the worker's assigned site. Valid state with no scan required. |

**Rationale — the decisive argument:** sub-site-only scoping would make the product's core scenario **impossible**. SafeIn5.md Step 6 has a second rigging crew learning from Dave's signal *while working a different fixture*; under sub-site scoping they would never see it. That crew-to-crew transfer is the central justification for the product (§4.2, differentiator 5).

**Reconciles:**
- **WRK-013** (MUST) — *"Feed will be auto filtered — Sub Site specific observations in which worker currently is (by scanning QR) will be shown."* Preserved as an **auto-applied filter**, not a wall. WRK-013's ruling text addresses sub-site *hierarchy* only, not feed scope.
- **SCP-012** — *"Required as a **site/sub-site** feed"* — satisfied literally.
- **SafeIn5.md Step 6** — *"another rigging crew on the same site sees the signal"*.
- **Talentica Slide 7** — *"shared with all workers on the site"*.

**Rejected:** *sub-site-scoped by default* (breaks the core scenario); *two-tier pinned band* (adds complexity without solving the cold-open state); *always site-wide with manual filter only* (discards WRK-013's auto-filter intent).

### 5.27 Feed Ordering & "Caught Up" State

**DECISION (Q46 / Register Decision 13): Two-band feed.**

| Band | Contents | Order |
|------|----------|-------|
| **Pinned (top)** | **Unresolved "Needs Attention Now" signals from the last N days.** Bounded — *N to be set at Milestone 1.* | Most recent first |
| **Body** | Everything else | **Reverse-chronological** |

| Feature | Applies to |
|---------|-----------|
| **"You're caught up" divider** | **Signed-in Corporate users only** — computed from a stored last-seen timestamp |
| **No caught-up state** | Guests and Community users — no account, therefore no read state (§5.6) |

**Rationale:** a strict severity sort as WRK-013 is written would freeze a three-week-old "Needs Attention Now" permanently at the top — the feed reads as stale, and it defeats the recency the supervisor scenario depends on. It also contradicts **WRK-012's** ruling that the feed be *"card-based, quick to view, and focused on operational learning."* But dropping urgency entirely discards WRK-013's safety rationale (*"we will show red alerts on top so worker can act immediately"*). **Bounding the pinned band satisfies both.**

> ⚠️ **DOCUMENT ERROR — must be corrected in the source pack.** WRK-013 still specifies the retired label **"Stop & Act now"**. WRK-010's ruling is *Good Practice, Be Aware, Needs Attention Now*. Correcting it in this PRD is not sufficient; the Tender Pack itself carries the error.

> ⚠️ **UNPRICED.** A caught-up boundary requires a **per-user read model** — read-state, unread counts, last-seen timestamps. **No read-state mechanism appears anywhere** in the Talentica proposal or its milestones; Slide 12 lists only *"Feed Visibility"*. Confirm scope and price.

### 5.28 Feed Card — Content & Interaction

**DECISION (Q47 / Register Decision 14): Read-only card, no interaction affordances.**

#### Card fields — canonical list

Reconciles SafeIn5.md Step 6, ADM-031 and Dev Pack §2, which each give a different set:

| Field | Notes |
|-------|-------|
| **Media thumbnail** | **Tap-to-play. Never autoplay.** |
| **Classification chip** | Good Practice / Be Aware / Needs Attention Now |
| **Caption** | **Transcript always rendered as text** |
| **Sub-site** | Context location |
| **Relative time** | "2 hours ago" |
| **Author** | Name, or **"Anonymous"** |
| **Status chip** | **Acknowledged / Closed** — new; no source document places status on the card |

**Loading:** paginated fetch with skeleton placeholders.

#### Interactions

**None.** No likes, no reactions, no counters, no comments, no tagging.

**"Feed interactions"** — the metric Talentica commits to on Slide 18 — is **redefined** as: card opens, media plays, and filter usage.

**Rationale:**
1. **Transcript always as text** — voice is the preferred capture method (CQA-006), so without this a large share of signals would arrive with no scannable content.
2. **Tap-to-play puts data cost under the worker's control** — Slide 6 notes workers may be on a *"Personal Mobile Phone"* with *"intermittent WiFi or Cellular Connectivity"*.
3. **Status chip is required by §5.5** — closure is shown publicly on the signal in the feed, so the card is where it must live.

**Rejected:** *"This helped me / Seen it too" counter* (engagement mechanic, against CQA-011); *comments* (excluded by **CQA-011** — *"Avoid social-media style engagement mechanics that undermine safety purpose"* — and would open an unbounded moderation surface on a feed readable without an account); *muted autoplay* (exactly the *"reels like format"* direction **WRK-012** already ruled against).

> ⚠️ **COMMERCIAL — adds to the video gap in §5.18.** Tap-to-play requires **video poster-frame generation** in the Media Service. Talentica's stack lists `sharp (thumbnails)` — an image library that does not extract video frames.

### 5.29 Role Model & Permissions

**DECISION (Q48 / Register Decision 15): Four fixed roles, with an extensible model.**

| Role | Scope | Capabilities |
|------|-------|--------------|
| **SafeIn5 Platform Admin** | Cross-tenant | Community moderation, platform administration. Required by **ADM-001** — *"Community administration is SafeIn5 internal only for MVP."* |
| **Org Admin** | One organisation | Site/sub-site setup, user management, QR configuration, Learn 5 and Rescue Plan authoring, dashboard. |
| **Site Supervisor** | Assigned sites | Feed visibility across assigned sites, **Acknowledge and Close** (§5.4). **No CRUD.** Required by **QA-006** — *"supervisor/admin visibility across assigned organisation."* |
| **Worker** | Assigned site(s) | Capture, classify, submit, view feed. |

**Community users are NOT a role.** Per §5.6, Community reading and submission require **no account**. Community participants are **unauthenticated** and sit outside the role model entirely, which covers Corporate users and administrators only.

**No custom permission editor** in MVP — required to stay within **D23**: *"User management is required but should remain lightweight… Avoid complex HR-style user administration."*

#### Extensibility requirement (SafeIn5 direction)

Further roles are anticipated post-MVP. The role model must therefore be **data-driven, not hardcoded**:

1. Roles and their permissions stored as **data**, not as enums branched on throughout the codebase.
2. Permission checks resolved against a **capability set**, so a new role is a configuration change rather than a refactor.
3. No assumption anywhere in the code that the role list is exactly these four.
4. A custom permission *editor* remains out of MVP scope — the *model* must support extension; the *admin UI* need not expose it yet.

> ⚠️ **DOCUMENT CHANGE REQUIRED.** **ADM-025** captures *"name and email"* only, and ADM-024–030 contain **no role attribute**. **A role field must be added** — as written, a Supervisor cannot be provisioned, which blocks the supervisor workflow confirmed in §5.4.

### 5.30 Supervisor Surface

**DECISION (Q49 / Register Decision 16): Acknowledge and Close live in the worker PWA.**

| Surface | Supervisor capability |
|---------|----------------------|
| **Mobile PWA** | **Acknowledge and Close controls on feed cards** for sites the supervisor is assigned to. Primary and only action surface. |
| **Admin console** | Acknowledgement/closure state **read-only**. No action controls. |

**Rationale:**
1. Supervisors are described throughout as *"supervisors/site leads"* working in quarries and yards on the **same mobile devices as workers**.
2. **Dev Pack §17 Scenario 5 makes response latency the existential risk.** Routing acknowledgement through a desktop console adds hours to the loop that decision exists to shorten.
3. **Talentica Slide 17 already places Supervisor in the PWA** — *"Mobile PWA (Community, Worker, Supervisor)… supporting… Supervisor Actions."*
4. **Cheapest route to the §5.5 closure display:** the same feed card carries the acknowledgement *control* (supervisor view) and the acknowledgement *result* (worker view). One component, two states.

**Rejected:** *admin console only* (coherent, but requires explicitly accepting that site leads need a laptop, putting response latency and its metric at risk); *both surfaces* (**rejected on cost** inside the fixed price); *split Acknowledge/Close across surfaces* (incoherent state model).

> ⚠️ **COMMERCIAL — must be reconciled in writing.** Talentica **Slide 17** places Supervisor in the **PWA**; **Slide 22 Milestone 4** places *"Supervisor workflows"* in the **Admin & Platform** stream; **Slide 19** confirms the Admin Console is *"a desktop web app — not a PWA"*. Two workstreams currently imply two builds of one capability.

> **REQUIREMENTS GAP.** **ADM-031–034** — the complete Feed Management set — contains **no acknowledge or close action**. **ADM-005** is the only supervisor mention in the entire ADM sheet, and it is a desktop widget. **QA-005** mentions *"Basic acknowledgement/review of signals"* with **no requirement ID and no MoSCoW priority**. The supervisor capability is effectively unrequirement'd and must be written up.

### 5.31 Acknowledge & Close — Rules

**DECISION (Q50 / Register Decision 17): Two independent flags.**

| Action | Rule |
|--------|------|
| **Acknowledge** | **One tap. No comment required.** The fast, high-frequency action. |
| **Close** | **Comment required.** Close implies Acknowledge — it may be applied without acknowledging first. |
| **Reopen** | **Not supported.** Correcting a wrongly-closed signal falls back to the auditable admin edit path. |
| **Good Practice signals** | **Acknowledgeable, not closable.** A positive signal is celebrated, not resolved. |
| **Be Aware / Needs Attention Now** | Both acknowledgeable and closable. |
| **Status display** | Acknowledged / Closed shown as a chip on the feed card for **all viewers** (§5.28). |
| **Audit** | **Every state change logged**, append-only. |

#### Documented vs. judgement

**Established by the documents:**
- Acknowledgement and closure are **two distinct things** — §15.5: *"acknowledgement **or** closure feedback"*; §17.1 Scenario 5: *"visible **acknowledgement and closure** workflows"*
- Closure must be **visible to the workforce** — §16: *"visible closure of reported concerns"*; §17.1 Scenario 2: *"Closure notification returned to workforce once resolved"*
- **State changes must be logged** — §7: *"Each state change logged"*, *"Full audit trail maintained"*; Talentica Slide 14: *"Append-only audit logging"*
- Must stay **lightweight** — QA-005: *"**Basic** acknowledgement/review of signals"*
- **No preconditions apply.** §7's *"Assignment required before action"* and *"Evidence required before close (configurable)"* are the only precondition rules written anywhere, and §7 is deferred to Phase 2 (§5.4). MVP inherits none.

**Judgement calls — the documents are silent:**
- Mandatory comment on Close — *rationale: an unexplained closure reproduces the black hole (§17.1 Scenario 5) in another form.*
- No reopen — *rationale: keeps the state model inside the Phase 2 boundary.*
- Good Practice excluded from closure — *rationale: follows "influence before compliance"; WRK-010's semantics imply it but no text states it.*

> ⚠️ **MANDATORY — condition-first closure composer.** The closure comment is **displayed publicly**. The composer must carry a **visible warning against naming individuals**. Dev Pack §15.4 — *"default to condition first reporting rather than person first reporting"* — is a product principle, not a worker-only rule. Without this, a non-punitive capture flow terminates in a punitive reply.

---

## Register Decisions — Running Resolution Log

Decisions from `SafeIn5-Design-Decision-Register.md` settled in this discovery round.

| Register # | Decision | Resolution | Recorded in |
|---|---|---|---|
| 1 | "Under 60 seconds" definition | Capture + classification only; throttled 3G measurement | §5.17 |
| 2 | Video capture | **IN**, both tiers, 30s cap. CQA-007 blank column must be filled in writing | §5.18 |
| 3 | Signal min/max content | ≥1 of {media, caption}; ≤3 photos or 1 video; camera-only; client-side downscale mandatory | §5.18 |
| 4 | Voice & transcription | Hybrid — on-device live transcript, audio discarded. **Removes STT worker + provider from priced stack** | §5.19 |
| 5 | Classification gate | **Mandatory.** Unclassified stays a Draft, never enters the feed | §5.20 |
| 6 | "Needs Attention Now" routing | Honest capture copy + transactional supervisor push (email fallback). No cluster logic. **Response timeframe still undefined** | §5.21 |
| 7 | Confirmation vs queued upload | **Publish on completion.** Mandatory Queued/Sending/Sent/Failed state model. CQA-008 blank column must be filled | §5.22 |
| 8 | Account gate timing | **Moot for Community** (open submission); live for Corporate | §5.6 |
| 9 | QR landing & Rescue Plan | Direct to PULSE + persistent header + per-context mandatory-review flag. "Survey" out of scope | §5.23 |
| 10 | QR context & hierarchy | Org > Site > Sub-site spine; task/risk type as seeded attributes on the QR record. Sub-site *is* asset/location | §5.24 |
| 11 | Corporate QR, no account | Tiered — PULSE/Rescue/Learn 5 + Community feed open; **corporate feed gated**. Non-enumerable QR tokens required | §5.25 |
| 12 | Feed scope | **Site-scoped**; sub-site auto-applied as a clearable filter | §5.26 |
| 13 | Feed ordering & caught-up | Two-band — bounded pinned Needs-Attention band + reverse-chronological body. Read model **unpriced** | §5.27 |
| 14 | Feed card & interactions | Read-only card, tap-to-play, transcript always as text, status chip. No social mechanics. **Video poster-frames unpriced** | §5.28 |
| 15 | Role model | Four fixed roles, data-driven and extensible. **ADM-025 needs a role field** | §5.29 |
| 16 | Supervisor surface | **Worker PWA.** Console read-only. Slides 17 vs 22 must be reconciled in writing | §5.30 |
| 17 | Acknowledge & Close rules | Two flags; Acknowledge one-tap, Close comment-required; no reopen; Good Practice not closable | §5.31 |
| 8 | Where the account gate fires | Partly — account required to submit | §5.6 |
| 26 | Geolocation | Load-bearing for Community; **unpriced — needs scope decision** | §5.16 |
| 27 | Face blurring / identity | Out of scope; anonymity is display-level only | §5.5 |
| 33 | Community moderation | Post-moderation | §5.12 |
| 34 | Community escalation & loop closure | Manual admin referral + status returned to feed | §5.12 |
| 35 | First run | Partly — guest reads, account writes | §5.6 |
| 46 | Community feed browsing | Partly — audience self-selection at onboarding | §5.13 |

---

## 6–16. Remaining Sections

> **Not yet generated.** Sections 6 (User Journeys) through 16 (Appendices) will be populated as discovery continues.

---

## Appendix A — Discovery Question Log

| Q | Question | Status | Answer summary |
|---|----------|--------|----------------|
| Q1 | Vision & value proposition | ✅ Confirmed | PULSE + SIGNAL behavioural intelligence platform; "Safer by Sharing"; influence before compliance; one platform, two operating models. |
| Q2 | Problem being solved | ✅ Confirmed | Capture friction; fear and blame; no lateral learning loop. Plus the "report black hole." |
| Q3 | Primary goal / objective | ✅ Confirmed | Validation MVP — sub-60s capture, QR end-to-end, repeat usage. Scalable non-throwaway foundation. |
| Q4 | Business value / impact | ✅ Answered | Left unquantified for MVP; targets set post-pilot from baseline data. |
| Q5 | Key reasons for market need | ⏸️ Deferred | Working assumption: gap in market (primary), pricing (secondary). Confirm at Discovery. |
| Q6 | Competitors | ⏸️ Deferred | Deferred to Discovery. |
| Q7 | Key differentiators | ✅ Confirmed | Seven differentiators — see §4.2. |
