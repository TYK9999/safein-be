# Phase 1 Spec — Behavioural Rules, Architecture, Scope

Source: technical / requirements deck (mandatory rules, services, QR, workflow, acceptance).

## Mandatory behavioural design rules

Constraints — failure invalidates product model:

- Zero mandatory fields at capture
- Capture completable in &lt;60 seconds
- Media uploads async (background) — don't block classification
- Classification &lt;10 seconds
- UX must feel like WhatsApp (low friction)
- Offline support — capture in low-connectivity, sync later
- No long forms / structured input at capture

## Figma frame → system mapping

| Frame | Role |
| --- | --- |
| Frame 04 — Feed | Displays signals + entry to capture |
| Frame 05 — Capture | Creates Signal Draft (Photo / Video / Text; future WhatsApp) |
| Frame 06 — Classification | User selects Good Practice / Aware / Needs Attention |
| Frame 07 — Confirmation | Reinforcement messaging, finalises signal |
| Frame 10 — PULSE (Take 5) | Behavioural pause, can trigger sharing |
| Frame 08 / 09 | Search and Learn functionality |

## Backend architecture — core services

1. **Behavioural Signal Service** — Create draft / update / finalise / retrieve feed
2. **Media Service** — Upload / store / generate preview (background + multipart)
3. **Classification Service** — Map UI to internal logic
4. **Search Service** — Keyword search, tag filtering
5. **QR Service** — Resolve QR to context
6. **Workflow Service** — Manage corporate lifecycle

**Storage / requirements**

- Row-level security (RLS) for data segregation
- Cloud storage for media
- Data segregation, audit logging, GDPR compliance
- Anonymity: user metadata stripped at DB level when “Anonymous” flag is active

## Corporate workflow (state machine)

**Flow:** New → Assigned → Acknowledged → Actioned → Closed

**Rules**

- Each state change is logged
- Assignment required before action
- Evidence required before closing (configurable)
- Full audit trail

**Objects:** Review Task, Assignment, Evidence, Audit Log

## QR system (core, not secondary)

- QR resolves to context: site, asset / location, task type, risk type, destination type(s), active / inactive status
- Routes to: PULSE (Take 5), Rescue Plan, Learn 5
- Rescue Plan page includes: location / asset, immediate actions, roles / responsibilities, required equipment, escalation contacts, version / review date
- Phase 1: up to 30 unique QR context mappings; no complex QR admin UI needed
- Example: confined space links same QR to survey / rescue plan / PULSE / Learn 5

### Learn 5 delivery options

1. External integration (link / webview)
2. Native SafeIn5 hosting (title, description, media, optional signal link)

## Phase 1 scope

**In scope**

- Community flows (Frames 01–10)
- Signal capture, Classification, Feed, PULSE (Take 5), Search, Basic QR routing

**Out of scope**

- AI, Advanced analytics, Corporate integrations, Native apps

**Deliverables**

- Working MVP, Backend APIs, Deployment environment, Documentation

## Developer quotation requirements

- Cost for Phase 1 only, broken down by frontend / backend / services
- Disclose tech stack (languages, frameworks, DB); if low-code / no-code, show support for future SIGNAL layer
- PWA line item (Add to Home Screen, offline)
- Quote Learn 5 as 2 options (external vs native)
- Timeline / milestones, assumptions, risks / dependencies

## Future (not Phase 1): SIGNAL AI layer

- Not required in Phase 1: predictive models, ML, advanced analytics
- Phase 1 must still capture clean data structured for future use
- Future AI must be: explainable, human-overseen, non-punitive, aligned with workforce trust
- Strategic path: reactive reporting → shared behavioural awareness → SIGNAL intelligence → predictive prevention

## System architecture (core platform flow)

1. User completes PULSE or shares observation
2. Signal Draft created (minimal friction)
3. Classified (Good Practice / Be Aware / Needs Attention Now)
4. Context attached (QR / site / asset / task / location / workflow)
5. Signal stored, surfaced in feed, routed
6. SIGNAL intelligence later identifies patterns / hotspots / alerts

**Data flow:**  
PULSE / Observation / QR / Community Input → Signal Draft → Classification → Context → Final Signal → Feed / Workflow → SIGNAL Intelligence → Next PULSE

## Definition of acceptance (Phase 1 “Done”)

1. User can: enter app, capture signal in &lt;60s, classify it, see it in feed
2. QR routes correctly to PULSE / Rescue Plan / Learn 5; ≥1 full use case works end-to-end
3. Backend APIs operational, media upload works, data persists
4. Working staging environment, source code handed over, basic docs

## Success metrics (Phase 1)

- Capture completable in &lt;60 seconds
- Repeat usage (same user shares multiple signals) — primary success measure
- Engagement with PULSE and Learn 5
- Initial signal volume generated

## Human factors / ethical design

### Core UX philosophy

- NOT a surveillance / disciplinary platform
- Focus on conditions / behaviours / risk patterns, not blaming individuals
- Reduce fear / friction, reinforce positive participation

### Behavioural design goals

- Trust & engagement
- Rapid reporting
- Positive feedback / closure loops
- Psychological safety + optional anonymity
- Avoid “snitch culture”

### Mandatory design questions

- Why would workers trust it?
- What discourages reporting across cultures?
- How to prevent retaliation / blame?
- What if reports go unresolved?
- Who acts on signals and when?
- Could AI create bias?

### Ethical design principles

- Condition-first (not person-first) reporting
- Consider automatic face blurring / identity minimisation
- Anonymous / confidential modes
- GDPR compliance
- Support learning not punishment

### Signal action flow

captured → classified → routed to feed / workflow → trend analysis → supervisor / corporate workflow triggered → worker receives acknowledgement / closure

### Corporate vs Community UX

- **Corporate:** audit trails, workflows, escalation, governance
- **Community:** moderation, verification, abuse protection, simplified UX

## Scenarios (for context / reference)

**Corporate**

- PPE Non-Compliance
- Unsafe Scaffold Access
- Repeated Dropped Object Near Misses
- QR Activated Confined Space Entry
- Report Black Hole Risk

**Community**

- Dangerous Public Infrastructure
- Flood Hazard Reporting
- Unsafe Event Crowd Conditions
- Malicious Public Reporting
- Positive Community Safety Sharing
