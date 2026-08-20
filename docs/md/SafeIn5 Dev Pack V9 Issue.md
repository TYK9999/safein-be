# SafeIn5 Dev Pack V9 Issue

> Converted from `SafeIn5 Dev Pack V9 Issue.pdf` — 19 pages

---

## Page 1

1
SAFEIN5 – Developer MVP Pack
1. Purpose of MVP
This document defines the full SafeIn5 MVP including behavioural model, system
architecture, UI flows, and backend requirements.
It combines the original detailed developer specification with updated behavioural design
and latest Figma frame alignment.
This document is intended for:
• Developer quotation (Phase 1)
• Technical build reference
• Product alignment
1.1 Key Definitions
To ensure alignment between behavioural intent and technical execution, the following
terms are defined:
• Behavioural Signal: A digital record of a worker's observation that could help
others stay safe; it is the core unit of data in the system.
• Behavioural Signal Draft: An incomplete signal captured during the "Capture"
phase before a user has applied a classification.
• PULSE: The five-step worker behavioural method - Pause, Uncover, Learn,
Shift, Echo - used to reset awareness, make a safer decision, and share the
learning.
• SIGNAL: Intelligence loop Sense, Identify, Gather, Navigate Alert, Loop
• PULSE and SIGNAL: The connected behavioural system that turns awareness
into shared intelligence and feeds learning back into the next safe decision.
• Take 5: A pre-task "behavioural pause" or checklist designed to prompt
awareness before a risk occurs, this is the P of the PULSE.
• Learn 5: Short-form micro-learning content delivered contextually through QR,
workflow, or trends to reinforce safer behaviour.
• Classification: The rapid process (<10 seconds) of categorizing a signal as
"Good Practice," "Something to be aware of," or "Needs attention now".
• Context: Specific data (Site, Asset, Task, or Risk Type) automatically attached to
a signal or session via a QR code scan.
2. Core Product Model
SafeIn5.ai is built around the PULSE and SIGNAL behavioural systems - a shared piece
of safety intelligence created from frontline observation, PULSE interaction, community
reporting, or corporate workflow activity, that generates a behavioural signal.
A behavioural signal represents: "Something someone notices, learns, or shares that
could help others stay safe."

---

## Page 2

2
Core principle: Safer by Sharing.
SafeIn5 is not a reporting system. It is a behavioural intelligence platform that turns
human awareness into shared safety intelligence.
PULSE creates the moment of awareness. SIGNAL captures and routes the learning.
The system then feeds intelligence back into the next PULSE moment.
What a behavioural signal can represent:
• Good practice - something working well that others can learn from.
• Something to be aware of - an emerging condition, behaviour, or context that could
become a risk.
• Needs attention now - a risk that requires prompt awareness, escalation, or action.
System objects:
• Behaviour Signal Draft - created during fast capture before classification.
• Behaviour Signal - finalised after classification and context capture.
• PULSE Session - a pre-task behavioural pause that may generate a signal.
• Learn 5 Item - short learning content linked to context, trends, or QR access.
Key fields:
• text - optional free-form input.
• media - optional photo/video upload.
• classification - Good Practice / Be Aware / Needs Attention Now.
• context - QR, site, asset, task, risk type, community location, or corporate workflow.
• timestamp and routing status.
Design principle: capture first, structure later, learn continuously.
3. PULSE and SIGNAL Model (Core UX Principle)
SafeIn5 operates through two connected loops: the PULSE worker behavioural loop and
the SIGNAL intelligence loop.
PULSE Method™ - PULSE Worker Behavioural Loop
PULSE supports safer decisions at the point of work in under five minutes and should be
used consistently throughout the product, UX, and developer documentation.
• P - Pause: Stop and reset awareness before acting.
• U - Uncover: Identify what is different and what could go wrong.
• L - Learn: Recall the fundamentals and the safest option.

---

## Page 3

3
• S - Shift: Turn awareness into action. Make one deliberate improvement and create a
Behaviour Signal that helps protect others.
• E - Echo: Share the moment as a SIGNAL so others can learn and stay safe.
SIGNAL Intelligence Loop - Platform System
SIGNAL turns shared frontline awareness into actionable safety intelligence.
• S - Sense: Receive signals from the frontline, community, QR journeys, and
corporate workflows.
• I - Identify: Recognise risk patterns, repeated themes, behaviours, and anomalies.
• G - Gather: Aggregate signals across users, sites, assets, teams, time, and
locations.
• N - Navigate: Route insights to the right people, feeds, dashboards, or workflows.
• A - Alert: Trigger nudges, warnings, escalations, and learning prompts.
• L - Loop: Feed intelligence back into the next PULSE moment.
Simple in the moment. Reinforced over time. Safer by Sharing.
4. Behavioural Design Rules (MANDATORY)
These are system constraints and must be adhered to:
• Zero mandatory fields at capture.
• Capture must be completable in under 60 seconds.
• Media uploads (photo/video) must handle asynchronously in the background to
allow the user to proceed to classification without waiting for upload completion.
• Classification must take <10 seconds.
• UX must feel like WhatsApp (low friction).
• Offline Support: The system should allow for signal capture in low-connectivity
environment. Full offline capability is not required for Phase 1.
• No long forms or structured input at capture stage.
Failure to meet these invalidates the product model.
5. Detailed MVP Functional Scope
Community Layer:
• Capture Behaviour Signals (photo, video, text)
• For capture workflows, optional device geolocation should automatically attach to
the PULSE session and resulting Behaviour Signal where user permissions
allow.
• Simple classification (3 options)
• Feed display (“What’s being shared”)
• Search and filter

---

## Page 4

4
• PULSE prompts
• Learn 5 content
Corporate Layer:
• Organisation and site setup
• For non-QR mobile capture workflows, optional device geolocation should
automatically attach to the PULSE session and resulting Behaviour Signal where
user permissions allow.
• Internal feeds
• Workflow management
• QR-linked content (PULSE, rescue plans)
• Dashboard (basic leading indicators)
System:
• Authentication (user + optional anonymity)
• Role-based access
• Consent and visibility control
6. Frame-to-System Mapping (Figma Alignment)
This section defines the exact mapping between Figma MVP frames and system
behaviour. Developers must follow this flow without deviation unless agreed.
Frame 04 – Feed:
Displays Behaviour Signals and entry to capture
Frame 05 – Capture:
Creates Behaviour Signal Draft via:
• Photo / Video
• Text
• (Future WhatsApp)
Frame 06 – Classification:
User selects:
• Good practice
• Something to be aware of
Needs attention now
Frame 07 – Confirmation:
• Reinforcement messaging
• Finalises Behaviour Signal

---

## Page 5

5
Frame 10 – PULSE (Take 5):
• Behavioural pause
• Can trigger sharing
Frame 08/09:
• Search and Learn functionality
All screens must be built to reflect the intent of the Figma MVP. Visual polish is
secondary to behavioural flow accuracy.
7. Backend Architecture (Detailed)
Core Services:
1. Behavioural Signal Service
• Create draft
• Update
• Finalise
• Retrieve feed
2. Media Service
• Upload
• Store
• Generate preview
Must support background processing and multipart uploads.
3. Classification Service
• Map UI to internal logic
4. Search Service
• Keyword search
• Tag filtering
5. QR Service
• Resolve QR to context
6. Workflow Service
• Manage corporate lifecycle
Storage:

---

## Page 6

6
• For structured data, utilise, row level security (RLS) to ensure strict data
segregation between community and corporate layers.
• Cloud storage (media)
Requirements:
• Data segregation (community vs corporate)
• Audit logging
• Security and GDPR compliance
Anonymity must be handled by stripping user metadata at the DB level when the
"Anonymous" flag is active.
7. Corporate Workflow (State Machine)
Workflow lifecycle:
New → Assigned → Acknowledged → Actioned → Closed
Rules:
• Each state change logged
• Assignment required before action
• Evidence required before close (configurable)
• Full audit trail maintained
Objects:
• Review Task
• Assignment
• Evidence
• Audit Log
Lightweight Admin Panel MVP Phase 1
Requirements
Minimum admin capability for Phase 1 MVP:
• Organisation management
• Site/sub-site setup
• User management
• Learn5 management
• QR management
• Signal analysis review
• Basic dashboard

---

## Page 7

7
MVP pilot assumption: approximately 50 users across 3 pilot organisations
8. QR System (Core Requirement)
QR functionality must enable contextual routing into the SafeIn5 system.
8.1 QR Contextual Access (Phase 1 Extension)
The MVP must support QR-based contextual entry into the SafeIn5 system. QR codes
act as a bridge between physical work environments and digital safety intelligence.
Each QR code must resolve to a predefined context and route the user to one or more of
the following:
• PULSE (Take 5 behavioural pause)
• Rescue Plan (e.g. confined space procedure)
• Learn 5 (micro-learning content)
QR is a core product feature and must be treated as a primary entry point, not a
secondary feature.
8.2 QR Context Model
Each QR code must map to a context object containing:
• site
• asset / location
• task type
• risk type (e.g. confined space)
• destination type(s)
• active / inactive status
This context must be passed into:
• PULSE (Take 5) sessions
• Behaviour SIGNAL creation
• Rescue Plan display
8.3 Confined Space Example (Reference User Case)
A QR code positioned at a confined space entry point should route the user to:
• Confined Space PULSE prompt
• Associated Rescue Plan
• Relevant Learn 5 content

---

## Page 8

8
The Rescue Plan page must include:
• location / asset
• immediate actions
• roles and responsibilities
• required equipment
• escalation contacts
• version / review date
8.4 Learn 5 Content Delivery (Phase 1 Options)
Developers must provide two quotation options for Learn 5 functionality:
Option 1 – External Integration
• QR or Learn 5 links to external content (e.g. 5mins.ai lesson)
• Opens in browser or webview
Option 2 – Native SafeIn5 Learn 5
• Learn 5 content hosted within SafeIn5
o Includes:
- title
- short description
- media (image/video)
- optional link to Behaviour signals
This allows flexibility between rapid MVP deployment and long-term product ownership.
8.5 Phase 1 QR Deliverables
If QR is included in Phase 1, the following must be delivered:
• QR scan or QR URL routing
• Context resolution service
• Working PULSE route
• Working Rescue Plan route
• Working Learn 5 route
• Configurable QR-to-destination mapping
• At least one full working example (e.g. confined space scenario)
The QR feature must function end-to-end within the MVP environment.
8.6 QR Management (Phase 1)
QR codes do not require a full admin interface in Phase 1.

---

## Page 9

9
• QR codes can be pre-generated
Mapping to context can be managed via configuration or simple backend setup
• For the purpose of this quote, developers should assume a requirement for up to
30 unique QR context mappings for the MVP pilot.
• No complex QR management UI is required for MVP
• The confined space survey, rescue plan, PULSE, Learn 5 should link to the same
QR code.
This ensures speed of delivery and avoids unnecessary system complexity.
9. Phase 1 Scope (Developer Quote)
Developers must quote Phase 1 ONLY.
IN SCOPE:
• Community flows (Frames 01–10)
• Behaviour Signal capture
• Classification
• Feed
• PULSE (Take 5)
• Search
• Basic QR routing
OUT OF SCOPE:
• AI
• Advanced analytics
• Corporate integrations
• Native apps
Deliverables:
• Working MVP
• Backend APIs
• Deployment environment
• Documentation
Developers must not extend scope beyond this definition without explicit approval.
10. Developer Quotation Requirements
Developers must:
• Provide cost for Phase 1 only
• Break down cost by frontend/backend/services

---

## Page 10

10
• Disclose the Proposed Tech Stack: Explicitly state the programming languages,
frameworks, and database technologies proposed. If a low-code/no-code
platform is proposed, the developer must demonstrate how the platform will
support the Future SIGNAL Intelligence Layer (Section 12) without requiring a full
system rebuild.
• Identify specific tech stack recommendations, including a line item for
Progressive Web App (PWA) implementation to support the "Add to Home
Screen" and offline capabilities.
• Quote Learn 5 as two distinct options:
o Option 1: External integration (Hyperlink/Webview).
• Option 2: Native SafeIn5 content hosting.
• Provide timeline and milestones
• Clearly state assumptions
• Clearly states risks and dependencies
11. SIGNAL AI & Behavioural Intelligence Layer (Future)
SafeIn5 builds its future defensibility through the SIGNAL intelligence layer. The value is
created by repeated frontline and community SIGNALS that reveal patterns before
incidents occur.
Future SIGNAL capabilities:
• Sense - receive high-frequency frontline, community, QR, PULSE, and workflow
SIGNALS.
• Identify - detect recurring risk patterns, good practice, behavioural drift, and
anomalies.
• Gather - aggregate data across users, sites, assets, shifts, teams, and time.
• Navigate - route insights to the correct supervisor, community feed, dashboard, or
escalation path.
• Alert - trigger nudges, warnings, learning prompts, and escalation notifications.
• Loop - feed learning back into the next PULSE moment.
Future AI capability boundary:
• AI capabilities are not required in Phase 1.
• No predictive models, machine learning implementation, or advanced analytics are
required in Phase 1.
• The Phase 1 architecture must capture clean SIGNAL data and preserve the
structure needed for future SIGNAL intelligence.
• Future AI must remain explainable, human-overseen, non-punitive, and aligned with
workforce trust.
Strategic outcome:

---

## Page 11

11
SafeIn5 moves from reactive reporting to shared behavioural awareness, then to
SIGNAL intelligence, and eventually to predictive prevention.
12. System Architecture Overview - PULSE and SIGNAL
SafeIn5 system architecture is designed to support a mobile-first PULSE experience and
a scalable SIGNAL intelligence layer.
Core platform flow:
1. User completes PULSE or shares an observation.
2. A SIGNAL Draft is created quickly with minimal friction.
3. The SIGNAL is classified as Good Practice, Be Aware, or Needs Attention Now.
4. Context is attached through QR, site, asset, task, community location, or corporate
workflow.
5. The SIGNAL is stored, surfaced in the correct feed, and routed where required.
6. SIGNAL intelligence later identifies patterns, hotspots, alerts, and learning
opportunities.
Core services:
• Frontend - mobile-first PWA for PULSE, capture, feed, QR, community, and
corporate workflows.
• API Layer - secure REST services.
• Behaviour Signal Service - create draft, update, finalise, retrieve feed, and support
routing.
• Media Service - upload, store, preview, and process media asynchronously.
• Classification Service - map UI selection to SIGNAL type.
• Search & Feed Service - search, filter, and surface SIGNALS.
• QR Context Service - resolve QR codes to PULSE, rescue plans, Learn 5, or other
configured destinations.
• Corporate Workflow Service - assignment, action tracking, closure, and audit trail.
Behavioural Signal data flow:
PULSE / Observation / QR / Community Input -> Behavioural Singal Draft ->
Classification -> Context -> Final signal -> Feed / Workflow -> SIGNAL Intelligence ->
Next PULSE.
Design goal: fast, trusted, resilient, and scalable foundations for safer-by-sharing
behavioural intelligence.

---

## Page 12

12
13. Phase 1 Definition of Acceptance
Phase 1 will be considered complete when:
1. A user can:
• Enter the app
• Capture a Behaviour Signal in under 60 seconds
• Classify it
• See it appear in the feed
2. QR functionality:
• QR routes correctly to PULSE / Rescue Plan / Learn 5
At least one full use case (e.g. confined space) works end-to-end
3. System:
• Backend APIs are operational
• Media upload works
• Data persists correctly
4. Delivery:
• Working staging environment
• Source code handed over

---

## Page 13

13
• Basic documentation provided
14. Phase 1 Success Metrics
The success of Phase 1 will be measured by:
• Users can complete capture in under 60 seconds (Speed and simplicity matter
more than feature depth)
• Repeat usage (same user shares multiple Behaviour Signals)
• Engagement with PULSE and Learn 5
• Initial Behaviour Signal volume generated
These metrics will validate product market fit and usability.
The primary success measure is repeat usage, not feature completion.
15. Human Factors, Ethical Design & Behavioural UX Framework
This section extends the SafeIn5 MVP specification to ensure the platform is designed
around human behaviour, psychological safety, trust, ethical data handling, and
meaningful action workflows. Developers must treat these requirements as core product
principles, not optional UX enhancements.
15.1 Core UX Philosophy
• SafeIn5.ai is not a surveillance or disciplinary platform.
• The system must focus on conditions, behaviours, and emerging risk patterns rather
than identifying and blaming individuals.
• The product should encourage workers to share SIGNALS that help others stay safe.
• UX should reduce fear, reduce friction, and reinforce positive participation.
15.2 Behavioural Design Goals
• Increase workforce trust and engagement.
• Encourage rapid reporting in under 60 seconds.
• Create positive feedback and closure loops.
• Support psychological safety and optional anonymity.
• Avoid creating a ‘snitch culture’ or fear-based reporting behaviour.
15.3 Mandatory Human Factors Questions
• Why would workers trust the platform?
• What discourages reporting in different cultures or industries?
• How do we prevent retaliation or blame behaviours?
• What happens if reports are ignored or unresolved?

---

## Page 14

14
• Who acts on Behaviour Signals and within what timeframe?
• Could AI or scoring systems create unintended bias?
15.4 Ethical Design Principles
• The platform should default to condition first reporting rather than person first
reporting.
• Developers should consider automatic face blurring and identity minimisation for
uploaded images.
• Anonymous and confidential reporting modes should be supported.
• Data handling must comply with GDPR and Corporate privacy requirements.
• Behavioural signals should support organisational learning rather than punishment.
15.5 Behavioural Signal Action Flow
• Signal captured by worker.
• Signal classified into Good Practice / Aware / Needs Attention.
• Signal routed to relevant feed or workflow.
• Trend analysis identifies repeat patterns or hotspots.
• Supervisor or Corporate workflow triggered where required.
• Worker receives acknowledgement or closure feedback.
15.6 Corporate vs Community UX
• Corporate environments require audit trails, workflows, escalation ownership, and
structured governance.
• Community environments require moderation, verification, abuse protection, and
simplified public UX.
• Developers must recognise these are different operational ecosystems even if they
share common platform services.
16. Developer UX/UI Briefing Statement
The success of SafeIn5.ai depends both on technical functionality and workforce trust,
behavioural engagement, psychological safety, and meaningful action workflows. The
UX/UI should prioritise simplicity, fast interaction, non-punitive engagement, and visible
closure of reported concerns. Developers are expected to challenge assumptions,
identify ethical risks, and contribute to a human-centred product design process.
17. Detailed UX/UI Scenario Framework
The following UX/UI scenarios are intended to help developers understand the
behavioural, ethical, operational, and workflow requirements of the SafeIn5.ai platform.
These scenarios should be used during workshops, wireframing, prototyping, and
technical architecture discussions.

---

## Page 15

15
17.1 Corporate UX/UI Scenarios
Scenario 1 — PPE Non-Compliance in High Risk Environment
• Worker observes repeated missing helmets during afternoon shift.
• Worker does not want to identify colleagues directly.
• UX should focus on unsafe condition and environmental context.
• Future SIGNAL intelligence layer may identify heat/fatigue correlations.
• Supervisor receives trend insight rather than individual blame report.
Scenario 2 — Unsafe Scaffold Access
• Worker notices missing handrail before task starts.
• User fears retaliation if management sees their identity.
• Anonymous reporting option should be available.
• Workflow routes signal to supervisor with escalation tracking.
• Closure notification returned to workforce once resolved.
Scenario 3 — Repeated Dropped Object Near Misses
• Multiple users report dropped objects over several weeks.
• System identifies location hotspot and repeated behaviour patterns.
• Dashboard surfaces leading indicators to management.
• Future SIGNAL intelligence layer may identify operational pressure trends.
• Organisation uses insights to review lifting plans and supervision.
Scenario 4 — QR Activated Confined Space Entry
• Worker scans QR before entering confined space.
• QR routes user to PULSE, Rescue Plan, and Learn 5 content.
• User completes behavioural pause before task.
• Signal captured if worker identifies unsafe condition.
• System records contextual risk interaction.
Scenario 5 — Report Black Hole Risk
• Workers repeatedly submit SIGNALS.
• No visible action or feedback is returned.
• Engagement and trust begin to collapse.
• UX must include visible acknowledgement and closure workflows.
• Corporate dashboard should track response and closure times.
17.2 Community UX/UI Scenarios
Scenario 1 — Dangerous Public Infrastructure
• Member of public reports damaged walkway or open manhole.

---

## Page 16

16
• Simple mobile first reporting flow required.
• Geolocation automatically attached where permitted.
• Moderation and verification processes required.
• Potential escalation to local authority or asset owner.
Scenario 2 — Flood Hazard Reporting
• Residents upload repeated flooding concerns.
• Platform identifies geographic clustering.
• Future SIGNAL intelligence may identify recurring infrastructure failures.
• Community feed surfaces warnings to nearby users.
• Potential integration with local resilience teams in future phases.
Scenario 3 — Unsafe Event Crowd Conditions
• Users report overcrowding or blocked exits at public event.
• Rapid capture with optional image upload.
• Signal escalated based on urgency and location density.
• System should avoid public panic or misuse.
• Moderation and escalation ownership required.
Scenario 4 — Malicious Public Reporting
• User repeatedly submits false or abusive reports.
• System requires moderation and abuse detection.
• Confidence scoring and duplicate detection may be required.
• Anonymous mode should not enable harassment.
• Governance policies required for community environment.
Scenario 5 — Positive Community Safety Sharing
• User shares good practice example such as safe temporary barriers.
• Feed reinforces positive safety behaviour.
• Community users engage with constructive examples.
• Platform supports learning and awareness rather than fear.
• Behavioural reinforcement becomes part of the ecosystem.
18. UX/UI Design Direction
Developers should approach SafeIn5.ai as a human centred behavioural platform rather
than a traditional reporting system. UX and UI decisions must prioritise simplicity, trust,
low friction, psychological safety, and visible action outcomes. The platform should feel
supportive and empowering rather than punitive or compliance driven.

---

## Page 17

17
19. Community and Corporate Workflow Examples

---

## Page 18

18

---

## Page 19

19

---

