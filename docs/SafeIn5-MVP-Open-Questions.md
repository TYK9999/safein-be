# SafeIn5 MVP — Open Technical & Logical Questions

> Generated from an exhaustive multi-agent analysis of: SafeIn5 Dev Pack V9 Issue.pdf · SafeIn5 MVP Requirements Specification and Tender Pack v1.0.xlsx · Talentica Proposal- SafeIn5.pptx · SafeIn5.docx (Rigging scenario) · SafeIn5-PRD.md
>
> 142 candidate questions were generated across 8 lenses. Each was then adversarially reviewed by an independent agent instructed to kill it if the documents already answered it, or if it was a routine engineering decision the vendor should simply make. **75 survived.**

**Severity split:** 31 critical · 41 high · 3 medium

**Blocks:** 9 × M1 · 29 × M2 · 11 × M3 · 16 × M4 · 4 × M5 · 6 × Pre-contract

## How to use this

Every question below is decision-forcing and carries a recommended answer. Take them to the client as *decisions to confirm*, not open-ended discovery. Sequence:

1. **Pre-contract** items settle commercial exposure — ask before signature.
2. **M1 (Discovery)** items must be closed at scope freeze.
3. **M2** items are schema/write-time properties — they are not retrofittable and must be answered before the first migration.

---

## Index

| # | ID | Lens | Blocks | Severity |
|---|---|---|---|---|
| 1 | contract-scope-baseline | contradictions | Pre-contract | CRITICAL |
| 2 | wrk022-predictive-alerts | contradictions | M4 | CRITICAL |
| 3 | guest-scan-corporate-feed | contradictions | M3 | CRITICAL |
| 4 | context-taxonomy | contradictions | M2 | CRITICAL |
| 5 | transcription-ai-and-residency | contradictions | M2 | HIGH |
| 6 | geolocation-scope | contradictions | M2 | HIGH |
| 7 | worker-site-cardinality | contradictions | M2 | HIGH |
| 8 | admin-edit-of-worker-signals | contradictions | M4 | HIGH |
| 9 | per-worker-activity-visibility | contradictions | M4 | HIGH |
| 10 | community-moderation-model | contradictions | M4 | HIGH |
| 11 | identity-across-multiple-tenants | datamodel | M2 | CRITICAL |
| 12 | anonymity-true-vs-pseudonymous | datamodel | M2 | CRITICAL |
| 13 | gdpr-erasure-unit-vs-audit-log | datamodel | M2 | CRITICAL |
| 14 | delete-semantics-site-and-user | datamodel | M2 | HIGH |
| 15 | signal-mutability-and-versioning | datamodel | M3 | HIGH |
| 16 | media-and-transcript-residency-retention | datamodel | M2 | HIGH |
| 17 | capture-60s-operational-definition | capture | M1 | CRITICAL |
| 18 | uat-timing-instrumentation-and-cohort | capture | M1 | CRITICAL |
| 19 | stt-provider-blocking-and-cost | capture | M2 | CRITICAL |
| 20 | voice-audio-retention-vs-anonymity | capture | M2 | CRITICAL |
| 21 | ios-pwa-platform-limits-accepted | capture | M1 | CRITICAL |
| 22 | exif-stripping-and-face-mitigation | capture | M1 | CRITICAL |
| 23 | qr-guest-read-corporate | qr | M2 | CRITICAL |
| 24 | qr-cross-tenant-submission | qr | M2 | CRITICAL |
| 25 | qr-context-staleness | qr | M3 | HIGH |
| 26 | qr-landing-routing | qr | M3 | HIGH |
| 27 | qr-admin-scope-reconciliation | qr | M1 | HIGH |
| 28 | qr-dead-code-behaviour | qr | M2 | HIGH |
| 29 | rescue-plan-content-model | qr | M3 | MEDIUM |
| 30 | qr-scan-analytics-definition | qr | M3 | MEDIUM |
| 31 | three-access-modes-capability-matrix | identity | M2 | CRITICAL |
| 32 | role-taxonomy-enumeration | identity | M2 | CRITICAL |
| 33 | deanonymisation-permission-matrix | identity | M2 | CRITICAL |
| 34 | cross-site-and-cross-org-visibility-rules | identity | M2 | CRITICAL |
| 35 | controller-processor-and-dpa-structure | identity | M2 | CRITICAL |
| 36 | erasure-vs-append-only-audit-conflict | identity | M2 | CRITICAL |
| 37 | microsoft-clarity-session-replay-risk | identity | M2 | CRITICAL |
| 38 | session-ttl-and-shared-device-signout | identity | M2 | HIGH |
| 39 | lawful-basis-for-worker-data | identity | M2 | HIGH |
| 40 | retention-schedule-per-data-class | identity | M4 | HIGH |
| 41 | subprocessor-list-approval-and-eu-residency | identity | M1 | HIGH |
| 42 | community-moderation-model-and-sla | identity | M3 | HIGH |
| 43 | workflow-state-machine-ratification | feedworkflow | Pre-contract | CRITICAL |
| 44 | workflow-entry-and-transition-rights | feedworkflow | M2 | CRITICAL |
| 45 | wrk022-notification-requirement-is-corrupt | feedworkflow | Pre-contract | CRITICAL |
| 46 | ios-push-limitation-and-fallback | feedworkflow | M4 | CRITICAL |
| 47 | admin-edit-transparency | feedworkflow | M4 | CRITICAL |
| 48 | community-feed-visibility-boundary | feedworkflow | M3 | HIGH |
| 49 | rule-based-alert-specification | feedworkflow | M4 | HIGH |
| 50 | notification-event-channel-matrix | feedworkflow | M4 | HIGH |
| 51 | moderation-model-and-abuse-reporting | feedworkflow | M4 | HIGH |
| 52 | dashboard-widget-and-export-spec | feedworkflow | M4 | HIGH |
| 53 | community-escalation-to-authority | feedworkflow | M3 | HIGH |
| 54 | cloud-account-ownership-and-readiness-date | nfr | M2 | CRITICAL |
| 55 | production-environment-ownership-and-rollout-scope | nfr | M4 | CRITICAL |
| 56 | rugged-device-audit-and-pwa-install | nfr | M1 | CRITICAL |
| 57 | browser-device-support-matrix | nfr | M1 | HIGH |
| 58 | ios-web-push-viability | nfr | M4 | HIGH |
| 59 | frontend-performance-budget | nfr | M1 | HIGH |
| 60 | definition-of-done-and-uat-defect-model | nfr | M5 | HIGH |
| 61 | test-and-seed-content-dependency | nfr | M3 | HIGH |
| 62 | third-party-running-costs-ownership | nfr | Pre-contract | HIGH |
| 63 | stt-provider-residency-and-subprocessor | nfr | M2 | HIGH |
| 64 | gdpr-retention-export-delete-mechanics | nfr | M2 | HIGH |
| 65 | security-review-before-pilot-golive | nfr | M5 | HIGH |
| 66 | ip-handover-oss-licensing-and-documentation-definition | nfr | Pre-contract | HIGH |
| 67 | availability-target-and-failsafe-rescue-access | nfr | M4 | HIGH |
| 68 | no-pilot-in-plan | delivery | M5 | CRITICAL |
| 69 | wrk-022-predictive-alerts-corrupt-row | delivery | M4 | HIGH |
| 70 | dependency-register-with-dates | delivery | M3 | HIGH |
| 71 | ai-tooling-qa-model-and-ip | delivery | Pre-contract | HIGH |
| 72 | gdpr-in-one-phrase | delivery | M4 | HIGH |
| 73 | worker-onboarding-training-and-rollout | delivery | M5 | HIGH |
| 74 | running-costs-and-third-party-ownership | delivery | M2 | MEDIUM |
| 75 | first-run-empty-state-and-cold-start | ux | M2 | HIGH |

---

## A. Cross-Document Contradictions & Scope Mismatches

### 1. contract-scope-baseline

> **Severity:** CRITICAL  |  **Blocks:** Pre-contract

#### Question

Two refinements to the framing, both strengthening it:

1. Add the strongest citation, which the colleague omitted. The Tender Pack does not merely exist alongside the Dev Pack — it claims the pricing baseline explicitly. Document Control, Issue Note: "Tenderers should use this workbook as the baseline for discovery, pricing, assumptions, delivery planning and clarification questions." Decision Register, Tender Treatment: MUST = "Tenderers should include in MVP pricing unless a clear exception is raised"; SHOULD = "Tenderers should include or provide a clear optional cost/simplification." This makes the question a documented contradiction between the two documents rather than an inference from a missing MoSCoW.

2. Correct "Dev Pack Section 9 lists 7 in-scope items" as an implied clean alternative baseline. It is 7 items, but the Dev Pack is internally inconsistent about its own scope: §9's list is Community-only and puts "Corporate integrations" out of scope, while §5 (Detailed MVP Functional Scope: Corporate Layer) and §7 (Lightweight Admin Panel MVP Phase 1) both describe corporate/admin capability §9 omits. So the choice is not "narrow Dev Pack vs broad Tender Pack" — the Dev Pack does not yield a single determinate scope either, and picking it does not by itself resolve the ambiguity.

SUGGESTED RESTATEMENT:
"Our proposal (Slide 25, Assumption 3) anchors the GBP 45,000 fixed price to the Phase 1 scope in SafeIn5 Dev Pack V9 Issue. The Tender Pack's Document Control states that that workbook is the baseline for pricing, and its Decision Register instructs tenderers to include the 48 MUST and 11 SHOULD rows in MVP pricing. We need one governing baseline confirmed in writing before scope freeze:
(a) Which document controls contractual scope for the GBP 45,000 — Dev Pack V9, or the Tender Pack's 67 WRK/ADM/SCP rows? If both apply, which prevails on conflict?
(b) If the Tender Pack governs, is the GBP 45,000 held (with the 48 MUST / 11 SHOULD set trimmed at Discovery to fit), or is the price re-baselined at Discovery against the full matrix? These are different commitments and we should not enter M1 with them conflated.
(c) Please note that Slide 12's reference to 'items marked MUST and SHOULD' cites a prioritisation that appears only in the Tender Pack, not in Dev Pack V9. We will correct that citation once (a) is settled.
(d) Separately, Dev Pack V9 is not internally consistent on its own scope: §9 lists seven Community-side items and puts corporate integrations out of scope, while §5 (Corporate Layer) and §7 (Lightweight Admin Panel Phase 1) describe admin and corporate capability §9 omits. If Dev Pack V9 is confirmed as the baseline, we need which of §5/§7/§9 is authoritative — particularly whether the admin console and supervisor workflows are inside the priced scope or are change requests.
Our working assumption pending your answer is that both documents are in scope, that M1 produces a single signed requirement-by-requirement scope baseline mapped to WRK/ADM/SCP IDs, and that the GBP 45,000 +/-15-20% applies to that signed baseline rather than to either source document as issued. Please confirm or correct."

#### Why it matters

The two baselines are not the same size. Dev Pack Section 9 lists 7 in-scope items; the Tender Pack lists 67 requirement rows with a Decision Register of 48 MUST / 11 SHOULD. Talentica's price is contractually anchored to the Dev Pack only. If SafeIn5 believes it bought the Tender Pack matrix, every ADM row becomes a change request or an unpriced obligation, and the +/-15-20% variance band is meaningless. This is the single largest commercial exposure in the pack.

#### Evidence

Proposal Slide 25 Assumption 3: 'The cost and timelines proposed are limited to the MVP (Phase 1) scope defined in SafeIn5 Dev Pack V9 Issue.pdf.' Proposal Slide 12: 'The following Features will be included as a part of MVP (Ref. SafeIn5 Dev Pack V9 Issue.pdf). All items that are marked MUST and SHOULD have been included in the scope.' The Dev Pack contains NO MoSCoW markings at all - MUST/SHOULD exist only in the Tender Pack (Legend & Principles sheet, Decision Register: MUST 48, SHOULD 11, COULD 5, WON'T 3). The proposal therefore cites a MoSCoW baseline that does not exist in the document it references.

#### Options

1. Tender Pack v1.0 (WRK/ADM/SCP + CQA rows) is the binding requirements baseline; Dev Pack V9 is context only; price re-baselined at end of Milestone 1 against a signed line-by-line Tenderer Response Matrix.
2. Dev Pack V9 Section 9 is the binding baseline; the Tender Pack is aspirational and every ADM row outside Dev Pack Section 7's 'Lightweight Admin Panel' list is a change request.
3. Both bind; a merged, de-duplicated requirement register is produced as the primary Milestone 1 deliverable and signed before Milestone 2 starts, with the price fixed at that point.

#### Recommendation

Option 3, with Option 1 as the tie-breaker rule. Fill in the empty 'Tenderer Can Deliver? / Estimated Effort / Commercial Notes' columns of the Tenderer Response Matrix (SCP-001..SCP-067) during Milestone 1 and make that signed sheet the contractual annexe. Without this the 15-20% variance band cannot be honoured.

---

### 2. wrk022-predictive-alerts

> **Severity:** CRITICAL  |  **Blocks:** M4

#### Question

WRK-022 / SCP-022 "Predictive Safety Alerts" is flagged MUST / MVP, but the row appears unadjudicated: its Community, Corporate, Decision, Decision Detail and Rationale cells are copied verbatim from WRK-020 (Voice-to-Text) — they discuss voice notes, gloves and goggles, not alerts. We therefore cannot tell whether SafeIn5 intended a worker-facing push alert in MVP at all.

Please confirm one of:
(a) WRK-022's MUST/MVP is a spreadsheet copy-paste error and worker-facing hazard-cluster alerts are Phase 2 (consistent with ADM-041/042 WON'T, CQA-009, and the nudge deferral reasoning in WRK-023: "Predictive alerts should not be in MVP because they imply analytics maturity that the platform will not yet have"); or
(b) a deterministic, non-predictive alert IS wanted in MVP — in which case we need the exact rule and audience. Our proposed scoping: extend ADM-040's admin-side rule ("repeated Needs Attention Now signals in a site/sub-site", "must not be presented as predictive AI") to a configurable per-site threshold (e.g. N Needs Attention Now signals on the same sub-site/asset within T hours) that raises a dashboard flag for the supervisor/admin, with any worker-facing broadcast being supervisor-initiated, not automatic — labelled as a threshold notice, never a prediction or hazard forecast.

We must also record that SafeIn5 accepts a PWA web-push channel offers no delivery guarantee (OS-suppressed, offline, iOS install-dependent) and must not be relied on as a safety-critical warning path. SMS gateway, mentioned in WRK-022's technical consideration, is not in the proposal or the price.

#### Why it matters

This is a MUST that three other documents exclude. If SafeIn5 expects it at UAT, it is unbuilt and unpriced. If it is built as specified ('urgent safety hazard cluster is flagged in their zone'), SafeIn5 ships a safety-critical alerting claim on a pilot with ~60 users and no data volume - a product-liability and trust exposure the Tender Pack itself warns against.

#### Evidence

WRK-022/SCP-022: Priority MUST, Phase MVP, Functional Description 'Automatically pushes direct pop-up alerts or text warnings to the worker's device if an urgent safety hazard cluster is flagged in their zone.' WRK-023 Decision: 'Predictive alerts should not be in MVP because they imply analytics maturity that the platform will not yet have.' CQA-009: AI/predictive analytics 'WON'T / Phase 2'. ADM-040/SCP-064: 'SHOULD, Phase 1 / Phase 2, Discovery Workshop Decision... It must not be presented as predictive AI.' Proposal Slide 13 Out of Scope: 'Automated insights workflow (auto-generated push notifications).'

#### Options

1. No automatic worker alerts in MVP. WRK-022 is corrected to WON'T/Phase 2; only manual/supervisor-triggered messaging exists.
2. Admin-dashboard-only rule-based flag per ADM-040 (e.g. N Needs Attention Now signals in one sub-site in X days changes a dashboard indicator colour) - no worker push at all.
3. Rule-based worker push, explicitly labelled 'Site alert' not 'predictive', with threshold configurable per site - priced as an addition.

#### Recommendation

Option 2. It satisfies ADM-040's Discovery decision, satisfies the SIGNAL narrative without overclaiming, and avoids the iOS push delivery problem (see notifications finding). Formally downgrade WRK-022 to WON'T in writing.

---

### 3. guest-scan-corporate-feed

> **Severity:** CRITICAL  |  **Blocks:** M3

#### Question

Cite the "tenant-based isolation between Community and Corporate data" line as the proposal's NFR / Data Residency & Privacy row rather than "Slide 14". Also broaden the question so it cannot be deflected: the PRD's own §5.6 decision already lets a guest read corporate-tenant content (the site's Rescue Plan and site-specific Learn5), so the real question is where the guest read boundary sits, not whether corporate content is ever guest-visible. Suggested restatement: "PRD §5.6 (still marked 'confirm at Discovery') grants unauthenticated QR scanners read access to PULSE, the site Rescue Plan, site Learn5 and 'the feed'. For a Corporate site QR mounted at a publicly reachable gate, does 'the feed' mean (a) nothing — feed requires an authenticated, site-assigned user; (b) the moderated Community general feed only; or (c) the site's own Behaviour Signal feed, including photos of conditions at your named client's operation? WRK-024 commits that the Corporate feed 'remains private/site-based' but only in the context of not leaking into the Community feed, so it does not tell us whether 'private' also means login-gated. We will build the safe default — corporate feed requires an authenticated site-assigned user — unless you direct otherwise, but we need it confirmed at Discovery because it changes the QR landing page per tenant and the feed authorisation model from Milestone 3."

#### Why it matters

QR codes are physically mounted in publicly reachable locations and are unguessable-URL-at-best. If guest access includes the corporate feed, any passer-by, contractor, journalist or regulator can view photographic records of unsafe conditions at a named client site. That breaches the tenant-isolation NFR, breaches the Corporate 'private/site-based' commitment, and creates GDPR exposure for images of identifiable workers. Conversely, if guests see nothing but PULSE, the community-vs-corporate feed logic and the QR landing page differ per tenant and must be built that way from Milestone 3.

#### Evidence

WRK-003/SCP-003 Corporate column: 'Supported where appropriate for QR-led viewing, but corporate signal submission may require known-user or assigned-user context' - it addresses submission, never viewing scope. WRK-024/SCP-024: 'Corporate feed remains private/site-based; selected anonymised learning may later be shared if permitted.' Proposal Slide 14: 'tenant-based isolation between Community and Corporate data.' Dev Pack Section 7: 'Data segregation (community vs corporate)' via RLS. The PRD (5.6) resolves that guests may 'View the feed' without specifying which feed.

#### Options

1. Guest sees Corporate QR context content only (PULSE, Rescue Plan, Learn5). Corporate feed requires an authenticated user assigned to that org/site. Community feed is public.
2. Guest sees Corporate feed in read-only, media-stripped form (text + classification only, no photos).
3. Guest sees the full Corporate site feed; accepted as a client risk decision, recorded in writing.

#### Recommendation

Option 1, unambiguously. Corporate feed access must be gated on an authenticated user with an org/site grant enforced at the RLS layer, and QR resolution must return a tenant-scoped payload that never includes signal content for anonymous callers. Guessing option 3 is a client-trust and GDPR event, not a bug.

---

### 4. context-taxonomy

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Drop the Asset/Task Zone half — ADM-014 and the WRK-013/014/015 amendment already settle it (one sub-site node type, synonyms only, no asset-management module) and the ADM-012 "Asset/Task Zone dropped" reading is wrong.

Ask instead: "Dev Pack §8.2 requires every QR context object to carry task type and risk type alongside site and asset/location, and §2 lists them as fields of the Behaviour Signal. The Tender Pack does not mention task type or risk type anywhere: ADM-012/ADM-018 auto-generate one QR per site and per sub-site with no task or risk dimension, and WRK-014 specifies feed filtering by classification and sub-site only. Which is authoritative for the MVP?

Specifically:
(a) Are task type and risk type structured, admin-managed enumerations on the QR mapping and denormalised onto the Behaviour Signal — usable as Learn5 / Rescue Plan targeting keys and as analytics grouping dimensions — or are they descriptive labels with no system behaviour attached in Phase 1?
(b) If structured: please supply the starter vocabularies for the pilot (e.g. Heavy Lift, Confined Space Entry; Suspended Load, Confined Space) and confirm whether they are one platform-wide list or defined per tenant.
(c) Does that mean a QR is not simply 'one per site/sub-site' as ADM-018 implies, but a mapping record of (sub-site x task type x risk type x destination set)? This determines the shape of the ~30 pilot QR mappings you will provide.
(d) Should feed filtering and the M4 dashboard group by task type / risk type, or only by classification and sub-site as WRK-014 states?

Our default if we do not hear back: task type and risk type become optional lookup-table references on the QR mapping and are copied onto the Behaviour Signal, but drive no targeting or filtering in Phase 1 beyond display."

#### Why it matters

This is the schema everything else hangs off - QR resolution, feed filtering, Learn5 targeting, rescue plan targeting, analytics grouping. The three documents describe three different shapes: a 2-level hierarchy, a 3-level hierarchy with assets as their own admin module, and a 4-dimension context object with task and risk type. Getting it wrong means re-migrating signals, QR mappings and every filter in Milestone 4. The Tender Pack simultaneously says 'avoid complex asset management' and lists Asset/Task Zone in the hierarchy.

#### Evidence

Tender Pack WRK-013/014/015 Corporate column: 'Required in a simple hierarchy: Organisation > Site > Sub-site/Area/Asset/Task Zone' - one slash-separated level. ADM-014 note: 'A sub-site is treated as a nested child node of the primary site entity.' ADM-012 Corporate column: 'Organisation > Site > Sub-site/Area' (Asset/Task Zone dropped). Dev Pack Section 8.2: QR context object must contain 'site, asset / location, task type, risk type, destination type(s), active / inactive status' - four dimensions. Proposal Slide 12 lists 'Site, Fixtures and other asset setup' as a separate admin item and 'QR Context mapping to site, subsite, assets, learn 5 content, Rescue plan'. SafeIn5.md Step 1: app knows 'Site, Lift zone, Asset ID, Task type = Heavy Lift, Risk type = Suspended Load'.

#### Options

1. Two entities only: Site and Sub-site (self-nesting one level). Asset/Task Zone are just sub-site records with a 'type' enum. task_type and risk_type are enum fields on the QR context and copied onto the signal.
2. Three entities: Site, Sub-site, Asset (asset attached to sub-site), plus task_type/risk_type enums - matches the proposal's 'Fixtures and other asset setup' line.
3. Site + Sub-site only; task type and risk type captured as free-text tags on the QR mapping, not modelled.

#### Recommendation

Option 1. It satisfies the Dev Pack's four-dimension QR context and the SafeIn5.md scenario while honouring 'avoid complex asset management'. Critically, task_type and risk_type must be modelled as structured fields, not free text - they are the grouping keys the future SIGNAL layer depends on, and the architecture is explicitly required not to block it.

---

### 5. transcription-ai-and-residency

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

For anonymous signals, is the raw voice recording retained after transcription, or discarded once the text is produced?

Context: Dev Pack V9 defines anonymity as stripping user metadata at the DB layer (p.212), but a voice recording identifies the speaker regardless of what is stripped from the row — so a retained audio blob on an anonymous signal breaks the anonymity promise. Same question applies to photo/video EXIF and any faces in media.

We need three things from you as data controller:
(a) Discard-after-transcription (default we would assume: audio deleted once text is written, worker sees and can edit the text before submit) or retain-for-playback (supervisors can listen back — requires a DPIA and means anonymous signals are pseudonymous, not anonymous)?
(b) If retained, for how long, and does the retention period differ for anonymous vs attributed signals, and between the Community tenant and Corporate tenants?
(c) Does the same answer apply to photo and video, including EXIF/GPS stripping on capture?

We will process transcription through an EU-region endpoint under a DPA with no-training and zero-retention terms, and voice capture will fall back to plain text if transcription fails, so the signal is never blocked — those are ours to handle. Only (a)–(c) need your decision.

#### Why it matters

Voice-first is the core capture mechanic (CQA-006 MUST), so transcription failure mode is a primary-path concern, not an edge case. Sending frontline worker voice recordings to a non-EU STT endpoint directly breaches the stated EU data residency NFR and creates a GDPR transfer problem on audio that may identify individuals by voice - a serious issue given the anonymity promise. Retention of raw audio also conflicts with anonymity: a voice recording is biometric-adjacent personal data that cannot be anonymised by stripping a user_id.

#### Evidence

WRK-020/SCP-020: MUST/MVP, 'Automatically transcribes spoken voice notes into clean, typed text... using cloud processing.' CQA-009: 'AI, computer vision, predictive analytics and automated classification are not MVP dependencies' - WON'T/Phase 2. Proposal Slide 14: 'EU-based data residency with GDPR compliance... Anonymity enforced at database layer.' Proposal Slide 19 lists an unnamed 'Speech-to-text provider' as a third-party service. Proposal Slide 18: 'True anonymity will require masking of location, non-reversal by the admins etc. which is not considered as a part of MVP.'

#### Options

1. EU-region managed STT (AWS Transcribe eu-west-1 / GCP STT europe-west), raw audio deleted after successful transcription, transcript retained and editable by the worker before submit.
2. On-device Web Speech API only (no audio leaves the device, zero residency exposure) with graceful fallback to attaching the raw audio clip when the browser lacks support - note iOS Safari support is inconsistent.
3. Store and play back the voice note as media with no transcription in MVP; transcription becomes Phase 2 (consistent with CQA-009 treating AI as WON'T).

#### Recommendation

Option 1 with the audio deleted post-transcription, and a hard rule that transcription failure never blocks submit (the clip is attached and the signal still completes, protecting the zero-mandatory-field and sub-60s constraints). Confirm the provider and region in writing as a DPA-relevant sub-processor before Milestone 2.

---

### 6. geolocation-scope

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Dev Pack §5 specifies that optional, permission-gated device geolocation auto-attaches to the PULSE session and resulting Behaviour Signal, for Community capture and Corporate non-QR mobile capture. No Tender Pack requirement row asks for it; the only feature that would consume it (ADM-006/SCP-030 risk heat map) is deferred to Phase 2 on the grounds that "heat maps require reliable location data"; QA-004 puts GPS verification and geofencing outside Phase 1 critical path; and the proposal's NFR table states that location masking is not part of MVP anonymity. Please confirm for MVP: (a) is the coordinate persisted on the Behaviour Signal at all, or only used transiently; (b) at what precision — raw lat/long, or snapped to the nearest site/sub-site so the record carries no finer resolution than the QR context already gives; (c) is it ever displayed or exported to supervisors, admins or the feed, and is it suppressed on signals from anonymous reporters; (d) what retention period applies; and (e) who at SafeIn5 owns the DPIA / lawful basis for processing worker location, given SafeIn5 is the controller. Our recommendation absent direction: capture the permission, store site/sub-site-level granularity only, never display a coordinate, and defer raw coordinates to Phase 2 alongside the heat map.

#### Why it matters

Location is the highest-risk field in the product. A precise GPS fix attached to a signal marked 'anonymous' de-anonymises the reporter in a quarry with a handful of people in that zone - which directly contradicts the anonymity promise the platform is selling to workers. It is also the field with the strongest GDPR footprint. And ADM-006 was deferred partly because heat maps 'require reliable location data', implying the client does not expect location capture. Someone will either build an unrequested privacy liability or omit a Dev Pack mandate.

#### Evidence

Dev Pack Section 5 Community Layer: 'optional device geolocation should automatically attach to the PULSE session and resulting Behaviour Signal where user permissions allow'; repeated for Corporate 'non-QR mobile capture workflows'. Zero WRK/ADM/SCP/CQA rows reference geolocation. Proposal Slide 8 (community flow step 2): 'Geo Location is automatically attached if permissions allow.' Proposal Slide 18: 'True anonymity will require masking of location... not considered as a part of MVP.' ADM-006/SCP-030 deferral rationale: 'Heat maps require reliable location data.'

#### Options

1. No geolocation in MVP. Context comes solely from QR resolution (site/sub-site). Removes the privacy problem and matches the Tender Pack's silence.
2. Community only: geolocation captured for Community signals (where there is no QR context to rely on), never for Corporate; coarse-grained to ~100m; never displayed on anonymous signals.
3. Both models, full precision, permission-gated, stored and visible to admins - requires an explicit privacy decision and worker-facing disclosure.

#### Recommendation

Option 2. Community reporting (open manhole, flood hazard) is meaningless without location, while Corporate already gets context from QR. Coarsen the fix and suppress it entirely on anonymous signals. If Option 3 is chosen, the anonymity claim in worker-facing copy must be reworded before pilot.

---

### 7. worker-site-cardinality

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Sharpen the ask so it targets the policy, not just the schema. Suggested restatement:

"ADM-019 says the site-assignment picker shows only 'workers who are not assigned to any other site', and ADM-023 benches a site's workers on delete — both imply a worker belongs to exactly one site. WRK-015/016/017/018 (all MUST/MVP, Approved) require workers to move between sites/sub-sites/task zones and re-scan a QR to switch context 'without friction'. Please confirm for the pilot:
1. Can one worker be assigned to multiple sites (and multiple sub-sites within a site) at once, or is assignment exclusive as ADM-019 states?
2. When a worker scans a QR for a site they are not assigned to (contractor / mobile plant crew, expected in quarry pilots), what should happen — auto-grant and switch context, switch capture context but keep the feed scoped to their assigned site, or block?
3. Should the ADM-019 'not assigned to any other site' filter be kept as written, or replaced with a multi-select assignment?
4. What does 'on bench' mean operationally — can a benched worker still log in, scan and capture a signal, and whose feed does that signal land in?

Note the citation of 'SCP-043' as carrying the ADM-019 wording is imprecise: SCP-043 is only the scope-matrix line 'Create new sites / Add workers from user base | MUST'; the exclusive-assignment sentence appears only in ADM-019. Also note WRK-016/017/018 are three byte-identical duplicate rows, so they are one requirement, not three independent confirmations."

#### Why it matters

This is a schema decision (FK on user vs a user_site_assignment join table) that is expensive to change later, and it drives feed scoping, RLS policy shape, and what a worker sees after scanning a QR for a site they are not assigned to - the exact scenario WRK-016 makes a MUST. Quarry pilots involve contractors and mobile plant crews who work across sites in one week. If the model is single-site, the very first cross-site scan in UAT produces either a permission error or a silent data leak.

#### Evidence

ADM-019/SCP-043: 'List of workers who are not assigned to any other site will be visible to add with search option' - explicitly single-assignment. ADM-023: on site delete 'workers assigned in site will be updated as on bench' - a single-slot model. Contradicted by WRK-016/017/018 (MUST/MVP, three identical rows): 'Required. Workers may move between sites/sub-sites/task zones' and 'Workers must be able to scan another QR and update the app context without friction.' WRK-015: 'If worker moves to another site/sub-site he can scan the QR and info given in the app will automatically updates to the new site/sub-site.' Proposal Slide 14: '3 organisations x 3 sites'.

#### Options

1. Many-to-many: user_site_assignment join table; a worker may hold assignments to several sites within one organisation; QR scan to an unassigned site within the same org grants read-only context but no submission.
2. Single primary site (per ADM-019) but QR scan temporarily overrides context for the session and signals are stamped with the scanned site, not the assigned one.
3. Single site, hard-enforced: scanning a QR for an unassigned site shows 'not authorised'.

#### Recommendation

Option 1. It costs almost nothing at Milestone 2 and is the only model that survives contractors and multi-site crews. Explicitly decide the cross-organisation case too: a scan of another tenant's QR must never resolve to that tenant's content.

---

### 8. admin-edit-of-worker-signals

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Two evidence fixes. (1) The anonymity sub-clause is overstated: the Talentica proposal (line 434) and SafeIn5-PRD.md §5.5 (line 230) already accept that for MVP "administrators may retain technical means of correlation" and true non-reversibility is out of scope, so "an admin editing an anonymous signal must not be able to resolve the author" is not a live constraint — drop it and the question gets stronger. (2) The "Decision" text is not a standalone decision register entry; it is the Client Decision column applied jointly to ADM-031..034 and SCP-055..058, alongside the comment "Moderation is essential for trust, but over-administration could undermine worker ownership". Suggested restatement: "ADM-033/SCP-057 allows an admin to update a signal's risk classification and caption, and your decision is that this be 'controlled and auditable' — please define the control. Specifically: (a) may an admin change the classification itself, or should MVP limit them to caption fix / hide / delete, with re-classification left to the worker? (b) is the original value preserved and the signal shown as edited in the feed, or is the edit silent? (c) is the author notified when their classification is changed? (d) do ADM-038 category counts and the pilot success metrics use the original or the edited classification, and does downgrading a 'Needs Attention Now' retract an escalation already raised to the supervisor? We will keep an append-only edit history regardless; what we need from you is the visibility and notification policy, because a silent downgrade is the failure mode Dev Pack §17 Scenario 5 warns about."

#### Why it matters

Silently re-classifying a worker's 'Needs Attention Now' down to 'Be Aware' is the single fastest way to destroy the trust the whole product depends on, and the Tender Pack itself flags the risk without resolving it. It also interacts badly with anonymity (an admin editing an anonymous signal must not be able to resolve the author) and with the append-only audit NFR. The proposal's scope slide lists only 'Feed Moderation' and never mentions signal editing, edit history or notification - so as it stands this ships as a destructive in-place update with no trace.

#### Evidence

ADM-033/SCP-057: 'Update observation - update risk classification, caption', Functional Description 'Security action enabling managers to update errant inputs, typos, or double-posts from the mobile view', SHOULD/MVP-Phase 1. Decision: 'Editing worker observations should be controlled and auditable' - control mechanism unspecified. Dev Pack Section 15.1: 'SafeIn5.ai is not a surveillance or disciplinary platform'; Section 17.1 Scenario 5 warns engagement collapses when workers see no honest feedback. Proposal Slide 14: 'Append-only audit logging enabled.' Proposal Slide 12 lists only 'Feed Moderation'.

#### Options

1. Admins cannot edit classification at all; they may hide/delete a signal with a logged reason, and may add an admin note. Caption edits limited to redaction of personal data.
2. Admins may edit; original values retained in an append-only revision table; the signal displays 'edited by site admin'; the worker is notified where the signal is attributable; dashboards count the current value.
3. Admins may edit freely with a back-end audit log only, no worker-visible marker.

#### Recommendation

Option 1 for classification, Option 2's mechanics for caption redaction. Classification is the worker's voice and the unit of the success metric - allowing managers to downgrade it converts SafeIn5 into the compliance system it defines itself against. Reject Option 3 outright.

---

### 9. per-worker-activity-visibility

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Corrected restatement: "ADM-024 (MUST) requires a worker directory showing each registered crew member's 'activity volume metrics', i.e. a per-worker submission count. ADM-039's approved amendment rules that activity be shown 'by site and crew only… avoid language that implies worker performance scoring'. Which governs ADM-024? Specifically: (a) does the MVP worker directory show a per-worker signal count at all, or only last-active / status, with volume shown at site and crew level only? (b) if per-worker counts exist, do they include that worker's anonymous submissions — because in a 6-person crew a supervisor can subtract named signals from the feed and attribute the anonymous remainder, which defeats the anonymity promise without any admin access? (c) is this visible only to Corporate admins, or also to site supervisors — ADM-024/039 are admin-console rows and supervisor visibility is unstated? (d) 'Repeat usage by user/site' (QA-003, CQA-016) is a MUST metric that requires per-user counting somewhere: is it acceptable for that to exist as aggregate/exportable analytics (e.g. % of users with 2+ signals) without any per-named-worker figure appearing in a UI? Note this is worker monitoring under UK GDPR and, at real corporate clients, likely a DPIA trigger — no DPIA effort is priced in the £45k."

#### Why it matters

Per-worker counts turn a non-punitive platform into a participation league table, which the Dev Pack explicitly forbids and which invites the exact retaliation dynamic Scenario 2 describes. It also silently breaks anonymity arithmetic: if a supervisor sees 'Dave: 4 signals' while five anonymous signals sit in a 6-person crew's feed, attribution becomes trivial. Under GDPR this is worker monitoring and would likely require a DPIA and works-council-style consultation at real clients - legal exposure created by two dashboard widgets nobody has costed as a privacy decision.

#### Evidence

ADM-024/SCP-048: 'Comprehensive directory table tracking all registered crew members, their site assignments, and their activity volume metrics.' ADM-039/SCP-063 'Crew Performance Summary': 'total active worker counts and the absolute frequency of logged behavioral signals'; Decision: 'Show activity by site and crew only as engagement/learning indicators. Avoid language that implies worker performance scoring' - it changes the labels but not the data. Dev Pack Section 15.1: 'The system must focus on conditions, behaviours, and emerging risk patterns rather than identifying and blaming individuals.' Section 15.2: 'Avoid creating a snitch culture.' Proposal Slide 18: anonymity 'enforced at the data layer... masked in audit logs'. QA-003 metric: 'Repeat usage by user/site'.

#### Options

1. No per-worker counts anywhere in the corporate UI. Aggregate only, by site/sub-site/crew, with a minimum-cohort threshold (suppress any group under ~5 users). Repeat-usage metrics computed platform-side for SafeIn5, not exposed to client admins.
2. Per-worker counts visible only to the SafeIn5 platform administrator (for pilot evaluation), never to client corporate admins or supervisors.
3. Per-worker counts visible to corporate admins as specified, with anonymous signals excluded from the counts.

#### Recommendation

Option 1, with Option 2 as the mechanism for measuring the pilot's own success metric. Option 3 is the default a developer will build from ADM-024's text and it is the one that fails a DPIA. Get this decided before the analytics work in Milestone 4 starts.

---

### 10. community-moderation-model

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Restate as two parts, with the moderation half posed as confirmation rather than an open choice:

(a) CONFIRM (we will proceed on this assumption unless told otherwise): Community moderation in MVP is post-publish and reactive — signals appear in the Community feed immediately, and a SafeIn5 admin can view, filter, edit (audited) or hide/delete inappropriate content afterwards, per the approved amendment on ADM-031–034 ("hide/delete inappropriate content", "over-administration could undermine worker ownership"). There is no pre-publish hold queue, no moderator SLA, no worker-facing "pending review" state, and no automated abuse/duplicate detection or confidence scoring (Dev Pack 17.2 Scenario 4) in MVP. Please confirm, and confirm who performs moderation (SafeIn5 staff vs a delegated Community moderator role) and whether a worker-facing "report this post" control is required in MVP — no requirement row provides one, and without it reactive moderation depends entirely on an admin noticing.

(b) DECIDE: is "escalation / notification to local authority or asset owner" in MVP scope at all? It appears in Dev Pack 17.2 Scenarios 1 and 3 and as numbered step 5 of the community journey in our own proposal, with step 6 promising "status updates shared back with the community" — yet no WRK/ADM/SCP row anywhere describes it, so it is currently unpriced and unbounded. Our recommendation is to exclude it from MVP and record it as Phase 2, because (i) it requires a recipient directory, an outbound channel, delivery/acknowledgement tracking and a resolution status loop, and (ii) if the UI implies an authority was notified when no notification was actually sent, that creates a duty-of-care exposure neither party has assessed. If the client wants any part of it in MVP, we need the minimum viable form defined — most likely a manually-triggered "flag for external referral" state visible only to a SafeIn5 admin, with wording in the public UI that explicitly does not promise that any authority has been contacted.

#### Why it matters

The Dev Pack devotes five community scenarios to moderation, abuse, duplicate detection and authority escalation, and the proposal's community journey slide includes both moderation and authority notification as numbered steps - yet the Tender Pack contains not one requirement row for any of it, and 'Feed Moderation' is a single bullet on the scope slide. Pre- vs post-publish is a different product (queue, SLA, moderator role, worker-facing 'pending' state). Authority escalation is an entire outbound workflow with legal implications - a member of the public reporting an open manhole reasonably believes the council was told. If nobody was told and someone is injured, that is a liability nobody has priced.

#### Evidence

Dev Pack Section 15.6: 'Community environments require moderation, verification, abuse protection, and simplified public UX.' Section 17.2 Scenario 1: 'Moderation and verification processes required. Potential escalation to local authority or asset owner.' Scenario 4: 'System requires moderation and abuse detection. Confidence scoring and duplicate detection may be required. Anonymous mode should not enable harassment.' Proposal Slide 8 community journey steps 4 and 5: 'Moderation and Verification - Shared content is reviewed and duplicates removed' / 'Authority / Owner notification - Signal is escalated to concerned authorities wherever applicable'. Tender Pack: only ADM-031 to ADM-034 (SHOULD, 'hide/delete inappropriate content'); WRK-024 'must be moderated and learning-focused' (SHOULD). No row mentions escalation, duplicate detection or abuse reporting.

#### Options

1. Post-publish moderation only: signals go live immediately; workers/public can report a signal; admin queue for reported items; hide/delete with reason. No authority escalation, no duplicate detection, no confidence scoring in MVP - proposal Slide 8 step 5 removed from the MVP narrative.
2. Pre-publish moderation for Community only: all Community signals held in a queue until a SafeIn5 moderator approves. Safer reputationally, but breaks the immediacy of the feed and needs a moderation SLA.
3. Post-publish plus a manual 'forward to authority' action that generates an email to a configured contact, with explicit worker-facing wording that SafeIn5 does not guarantee an emergency response.

#### Recommendation

Option 1, and remove authority escalation from all client-facing material for the MVP. If SafeIn5 wants Option 3, the disclaimer wording ('this is not an emergency service - call 999') must be designed into the Community capture flow, not bolted on. Also confirm who staffs Community moderation during the pilot - no role for it exists in either document.

---

## B. Data Model, Multi-Tenancy & SIGNAL Readiness

### 11. identity-across-multiple-tenants

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Two evidence corrections before this goes out.

(a) WRK-015/016/017 mobility is scoped *inside one organisation*. The amendment text on WRK-015 fixes the hierarchy as "Organisation > Site > Sub-site/Area/Asset/Task Zone" and the SafeIn5 response is about sub-site context, so these requirements contradict ADM-019 on the *intra-org multi-site* case; they are not evidence about cross-organisation membership, which no requirement addresses at all. Presenting them as cross-org evidence will let the client answer "workers move between our own sites, next question" and close the real gap unanswered. Split the two cases explicitly.

(b) The "Talentica proposal auth is magic-link + email OTP with no tenant-selection step" point is accurate but is a vendor gap, not a client contradiction — do not frame it as something the client got wrong.

Suggested restatement:

"Two questions about how a worker relates to sites and organisations.

1. Within one organisation, ADM-019 (MUST) filters the site-assignment picker to 'workers who are not assigned to any other site', and ADM-023 (MUST) puts workers 'on bench' when a site is deleted — i.e. one worker sits in exactly one site at a time. But WRK-015/016/017 (MUST) require that a worker moving to another site or sub-site can scan its QR and have context update without friction. Please confirm the intended behaviour: is site assignment a single 'home site' that governs feed visibility and reporting, while QR scanning may legitimately give a worker context at any site in their organisation? Or should a worker be assignable to several sites?

2. Across organisations, the documents are silent. In UK quarrying, contractors, plant-hire operators and agency riggers routinely work for more than one operator, so the pilot's three organisations may well share people. For the pilot, should one human be able to hold access to two Corporate organisations at once? If yes, we need three policy decisions from you, because they are data-protection commitments rather than build choices: (i) may Org A's admin see that this person exists or has any history outside Org A — our default is no, hard tenant isolation with nothing crossing the boundary; (ii) does that person count once or twice against the ~50–60 pilot user target and the 'repeat usage by same user' success metric; (iii) is it acceptable that they see two organisations after login and pick one, since our proposed magic-link/OTP sign-in currently assumes a single destination.

If the answer is 'not in the pilot', we will still build the underlying model as one person with one or more organisation memberships (this costs nothing extra now and avoids re-keying user↔site↔signal later), and simply constrain the admin UI to one organisation and one site per worker. We only need your answer on the policy points and on question 1; we do not need you to decide the schema. This affects Milestone 2, so a steer before Foundation build starts is what matters."

#### Why it matters

ADM-019 explicitly filters the assignment picker to workers 'not assigned to any other site', which hard-codes a one-user-one-site model into the schema. If the pilot includes any contractor working two of the three pilot organisations - highly likely in extractive/quarry operations - a one-site model forces duplicate accounts sharing an email, which breaks email/OTP login (which tenant does the magic link resolve to?), breaks unique constraints on email, double-counts active users, and makes repeat-usage metrics wrong. Fixing this after M2 means changing the primary key relationship between user, site, and signal.

#### Evidence

ADM-019 / SCP-043 (MUST): 'List of workers who are not assigned to any other site will be visible to add with search option.' ADM-023 / SCP-047: deleting a site means 'workers assigned in site will be updated as on bench' - a single-slot assignment model. Contrast WRK-015/016/017 and SCP-015-018 (MUST): 'Workers may move between sites/sub-sites/task zones' and 'If worker moves to another site/sub-site he can scan the QR.' Talentica proposal auth is 'Custom magic-link + email OTP + JWT' (Slide 19) with no tenant-selection step described.

#### Options

1. One person row; many memberships (person x tenant x role); many site assignments per membership. ADM-019's 'not assigned to any other site' becomes a UI default filter, not a constraint.
2. One person row; exactly one tenant; many sites within it. Contractors across orgs need separate accounts with separate emails.
3. N user rows, one per tenant, email unique per tenant. Login requires a tenant/org selection step after OTP.
4. One person, one tenant, one site (literal ADM-019). Simplest; breaks on the first contractor.

#### Recommendation

Option 1, with the login flow resolving email -> person -> memberships and presenting a tenant picker only when a person has more than one membership (so the common single-tenant case keeps zero extra friction and the sub-60-second target). ADM-019 should be reclassified as a UI convenience filter with an 'include already-assigned' toggle. Please confirm whether any pilot participant is a contractor working across two or more of the three pilot organisations - a yes makes this critical rather than high.

---

### 12. anonymity-true-vs-pseudonymous

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Corrected framing to send to the client:

"Dev Pack §7 says anonymity is enforced by 'stripping user metadata at the DB level'. The Talentica proposal says true anonymity — including 'non-reversal by the admins' — is out of MVP scope. These describe two different products. Please confirm which one SafeIn5 is committing to for the pilot:

(a) Write-time severance — the signal row carries no author reference at all. Truly unattributable, admin-irreversible. Consequence: anonymous signals cannot contribute to the 'repeat usage (same user shares multiple Behaviour Signals)' MUST metric, and per-author abuse throttling (Dev Pack §17 Scenario 4) is not possible for them.

(b) Read-time masking — the author link is retained (directly, or as a per-tenant one-way token) and suppressed everywhere it is displayed, including audit logs. Repeat usage, anonymous-usage counts and abuse blocking all work. Consequence: an administrator or a DBA can in principle correlate; the worker-facing wording must therefore say 'your name is not shown', not 'anonymous', and the privacy notice must reflect that a personal-data link persists.

Two dependent points we need in the same answer:
1. If (b), who — if anyone — is permitted to reverse it, under what trigger (e.g. credible harassment or safeguarding), and is that reversal itself audited? If nobody may, we prefer a per-tenant one-way token that supports counting and blocking but not identification.
2. Confirm the worker-facing label and consent text for the toggle, since PRD §5.5 already commits to stating the limits honestly to pilot workers.

Note for the record: the current PRD §5.5 lists 'pseudonymous link' as Rejected while also stating 'administrators may retain technical means of correlation'. Whichever way you answer, one of those two lines must be struck."

#### Why it matters

This is the highest-consequence trust decision in the schema and it is currently self-contradictory. Repeat usage - 'same user shares multiple Behaviour Signals' - is the stated PRIMARY success measure of Phase 1; if anonymous signals carry no stable author reference, every anonymous submission is invisible to that metric, and if anonymity is an account-level setting (per the current PRD), a worker who enables it disappears from the pilot's headline number entirely. Equally, the Community abuse scenario (repeat false/abusive reports) cannot be mitigated without a per-author counter. Choosing (b) but describing it to workers as 'anonymous' is a trust and arguably a GDPR-transparency exposure; choosing (a) forfeits the metric. Either way the answer determines the shape of the signals table on day one.

#### Evidence

Dev Pack s7: 'Anonymity must be handled by stripping user metadata at the DB level when the "Anonymous" flag is active.' Dev Pack s14: 'The primary success measure is repeat usage, not feature completion' and s14 metric 'Repeat usage (same user shares multiple Behaviour Signals)'. Success Metrics sheet: Repeat Usage = MUST. Dev Pack s17.2 Scenario 4: 'User repeatedly submits false or abusive reports. System requires moderation and abuse detection... Anonymous mode should not enable harassment.' Talentica Slide 18: 'Anonymity is enforced at the data layer for MVP purposes and masked in audit logs. True anonymity will require masking of location, non-reversal by the admins etc. which is not considered as a part of MVP.' Slide 18 also promises to collect 'Anonymous usage' as a metric - which requires a counter. PRD s5.5 records the account-level decision but flags the enforcement mechanism as inherited, unresolved.

#### Options

1. True anonymity: author_id NULL, no token. Rate limiting falls back to IP/device fingerprint only. Repeat usage unmeasurable for anonymous users; abuse blocking is per-device.
2. Pseudonymity: author_id NULL for display and for all admin-facing queries, plus author_pseudonym = HMAC(server_secret, person_id, tenant_id) stored on the signal. Enables counting, rate limiting and blocking a pseudonym; not reversible without the secret; secret held in KMS and not accessible to tenant admins. Disclosed to workers in plain language.
3. Retain author_id but hide it in the UI and mask it in audit logs (display-level anonymity only). Simplest, weakest, and the easiest to be accused of misrepresenting.
4. Hybrid: pseudonym for Corporate (governance needs counting), true anonymity for Community (abuse handled by moderation queue).

#### Recommendation

Option 2, with mandatory plain-English disclosure in the app: 'Your name is not shown and site managers cannot see who you are. SafeIn5 keeps a scrambled code so we can count how often the app is used and stop abuse.' This is the only option that simultaneously preserves the MUST repeat-usage metric, makes the abuse scenario solvable, and keeps the promise defensible under GDPR transparency obligations. Option 3 must be explicitly rejected in writing - it is what 'masked in audit logs' currently implies, and it is the version that damages worker trust most if it ever leaks.

---

### 13. gdpr-erasure-unit-vs-audit-log

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Two evidence fixes. (1) The strongest citations are SCP-052 "Delete/Block User | MUST" and, more pointedly, SCP-058 "Delete observations | SHOULD" (Tender Pack scope matrix) — both stated as bare capability names with no consequence, retention rule, or lawful-basis note; ADM-028 as cited could not be located and should be dropped in favour of SCP-052/SCP-058. (2) The third sub-question's premise needs softening: SafeIn5-PRD.md §5.5 has already decided that MVP anonymity is display-level and data-layer enforced, and explicitly records that "administrators may retain technical means of correlation" and that true non-reversibility is out of MVP scope. So the data subject almost certainly CAN be re-identified in the MVP build; the real question is not "how do they prove it is theirs" but "the retained correlation capability means anonymous signals are still personal data, so they are in scope for erasure and DSAR — is that accepted, and what does the pilot privacy notice say?" Restated ask: "For MVP, what is the unit of erasure on SCP-052 delete-user and SCP-058 delete-observation — de-identify and retain the signal content, or hard-delete signal and media? What retention period applies to signals, media and audit logs? Given PRD §5.5 states admins retain technical means of correlation, anonymous signals remain personal data and are erasable — is that the accepted position for the pilot privacy notice? And what carve-out is intended for the append-only audit log, which by construction cannot be erased? We need this before the M2 schema is fixed, not at M4."

#### Why it matters

Erasure and append-only audit are in direct architectural conflict and the proposal commits to both. Deleting a worker's signals destroys the site's safety-learning record and the pilot's evidence base; retaining them requires a lawful basis for keeping the content after erasing the identity, which is defensible but must be decided and documented before the first row is written, not at UAT. The anonymous case is worse: under a pseudonymous model erasure is technically possible (delete by pseudonym) but under true anonymity the data subject cannot be identified, so the request cannot be honoured - a position SafeIn5 must consciously adopt and publish in its privacy notice. Getting this wrong is legal exposure, not rework.

#### Evidence

Talentica proposal Slide 14: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies... Append-only audit logging enabled.' Dev Pack s7 Requirements: 'Audit logging' and 'Security and GDPR compliance'; Objects include 'Audit Log' with 'Full audit trail maintained'. Dev Pack s15.4: 'Data handling must comply with GDPR and Corporate privacy requirements.' ADM-028 / SCP-052 (MUST): 'Delete/Block User' - no statement of what happens to that user's signals. Milestone 4 lists 'GDPR compliance' as a build activity, i.e. after the schema is fixed in M2.

#### Options

1. Erasure = de-identification. person row deleted/tombstoned; signals retained with author reference nulled, media retained (media may still contain the person - see below); audit log rows retain only the pseudonym. Documented lawful basis: legitimate interest in workplace safety records.
2. Erasure = full cascade. Person, signals, media and audit entries all hard-deleted. Cleanest legally, destroys site safety history and the pilot dataset.
3. Configurable per tenant, defaulting to (1) for Corporate and (2) for Community.
4. Defer entirely to Milestone 4 (current implicit plan).

#### Recommendation

Option 1, decided now and reflected in migration 0001 (nullable author reference, tombstone columns, audit rows keyed by pseudonym rather than by person). Two follow-ons SafeIn5 must also rule on: (i) whether uploaded photos/video are in scope for erasure, since a photo of a rigging setup can contain the reporter's own hands, hi-vis with a name, or a vehicle plate - and automatic face blurring is explicitly out of scope per the Talentica proposal; (ii) confirmation that erasure requests for anonymously-submitted signals will be handled via the pseudonym under the model recommended above, and that this is stated in the privacy notice. Option 4 is not acceptable: GDPR behaviour is a schema property, not a Milestone 4 feature.

---

### 14. delete-semantics-site-and-user

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

ADM-023 states deleting a site "will remove the site completely", yet the Talentica proposal commits to append-only audit logging and GDPR export/delete/retention, and ADM-004/ADM-038 make classification counts and category breakdown MUST dashboard items. We propose to implement site deletion (ADM-023), user deletion (ADM-028) and observation deletion (ADM-034) as deactivation/archival, never physical row removal: historical Behaviour Signals, their feed entries and their contribution to dashboard counts are all preserved and remain reproducible; deleted sites and blocked users are simply removed from pickers, assignment and new capture, and their QR codes resolve to the existing "inactive" state (Dev Pack §8.2) rather than erroring. Please confirm two client-side policy points: (1) is that interpretation of "remove completely" acceptable, or does the client require a genuine purge path — and if so, what retention period applies to safety records before purge is permitted? (2) when an individual exercises a GDPR erasure request, do their Behaviour Signals stay in the feed and counts in de-identified form, or must the signal content itself be destroyed?

#### Why it matters

A hard delete of a site either cascades and destroys safety history (making 'Needs Attention Now' signals vanish along with the evidence they were raised), or it orphans signals with a dangling site_id and breaks every feed and dashboard query. Neither is acceptable. The dashboard behaviour matters commercially: if deleting a site retroactively changes historical counts, the pilot's success metrics become non-reproducible between two runs of the same report, which undermines the evidence base SafeIn5 needs for Phase 2 funding. This also interacts with QR: a 'deleted' site's printed QR stickers are still physically on a quarry face and will be scanned - the scan must resolve to a defined state, not a 500.

#### Evidence

ADM-023 / SCP-047 (MUST): 'Deleting will remove the site completely, QR codes will not work and workers assigned in site will be updated as on bench.' ADM-028 / SCP-052 (MUST): 'Delete/Block User' with no elaboration. ADM-034 / SCP-058: 'Delete observations' (SHOULD). Dev Pack s8.2 requires QR 'active / inactive status'. ADM-004/ADM-038 require classification counts and category breakdown as MUST dashboard items. Talentica Slide 14 commits to 'Append-only audit logging'.

#### Options

1. Soft delete everywhere: deleted_at tombstone on sites, sub-sites, users and signals. Signals retained and still counted in historical dashboards; site hidden from admin lists and from new capture; QR resolves to a friendly 'this location is no longer active' page; workers unassigned.
2. Hard delete sites but block deletion when the site has any signals (force archive instead). Simple, and forces the right operator behaviour.
3. Hard delete with cascade (literal ADM-023). Destroys history.
4. Soft delete + explicit 'purge' action restricted to SafeIn5 platform admins, used only to service GDPR erasure.

#### Recommendation

Option 1 plus Option 4's purge escape hatch, and reframe the admin UI verb from 'Delete' to 'Archive' so ADM-023's user-visible promise ('QR codes will not work, workers benched') is still met without data loss. Soft delete is also the only model compatible with the append-only audit commitment. Two sub-decisions to confirm: whether a blocked user's existing signals remain visible in the feed (recommend yes - removing them retroactively punishes the crew that learned from them), and whether archived-site signals continue to appear in org-level dashboard totals (recommend yes, with a filter).

---

### 15. signal-mutability-and-versioning

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Drop the storage-mechanism half and lead with a default. Suggested restatement:

"ADM-033 (SHOULD, MVP/Phase 1) allows an admin to update a signal's risk classification and caption, and ADM-034 to delete it. Your amendment on ADM-031–034 says editing 'should be controlled and auditable' but also that 'over-administration could undermine worker ownership' — we'd like to close that tension explicitly.

Our default: the original worker classification is always retained alongside the admin value in an append-only audit record (this is a build decision on our side, no input needed). What we do need from you are three policy calls:

(a) Reported numbers. ADM-038 (Basic Category Breakdown, MUST) shows the Good Practice / Be Aware / Needs Attention split. Do the dashboard and Success Metrics report the admin-corrected classification, the worker's original, or both side by side? Pilot success is measured off this number.

(b) Visibility to the worker. When an admin changes a classification or caption, should the worker be notified, and should the feed item visibly show it was edited/moderated? Silent downgrade of a 'Needs Attention Now' is the case Dev Pack §15.1 ('not a surveillance or disciplinary platform') seems to rule out, but nothing states a requirement. Our default would be: caption edits and classification changes are both flagged 'edited by site admin' on the item, with no worker notification in MVP.

(c) Worker self-service. No WRK requirement covers a worker editing or deleting their own signal after submission. Is that in MVP (and if so, time-limited, and does delete mean hard-delete or withdraw-from-feed), or out of scope for the pilot? Our default is out of scope, with GDPR erasure handled as an admin-actioned request.

Also worth confirming: does ADM-034 delete apply to Corporate as well as Community, or is Community moderation the primary case?"

#### Why it matters

Classification is the single most important structured field in the whole dataset and the one Phase 2 ML would train on. If admin edits overwrite in place, the original human judgement - the actual behavioural data SafeIn5 says is its defensible asset - is destroyed and can never be recovered for training or for measuring classifier drift. It is also a trust issue with a direct line to the product's core principle: if a worker's 'Needs Attention Now' can be silently downgraded to 'Be Aware' by a site manager and the worker cannot tell, the platform becomes exactly the compliance-massaging tool the Dev Pack says it must not be. Retro-fitting versioning after signals exist means the pre-change history is simply gone.

#### Evidence

ADM-033 / SCP-057 (SHOULD): 'update- risk classification, caption. Security action enabling managers to update errant inputs, typos, or double-posts from the mobile view.' SafeIn5 amendment on ADM-031-034: 'Editing worker observations should be controlled and auditable' and 'Moderation is essential for trust, but over-administration could undermine worker ownership.' Dev Pack s15.1: 'SafeIn5.ai is not a surveillance or disciplinary platform.' Dev Pack s11: 'The Phase 1 architecture must capture clean SIGNAL data and preserve the structure needed for future SIGNAL intelligence' and 'Future AI must remain explainable, human-overseen.' Nothing states whether the original classification is preserved.

#### Options

1. Immutable original + signal_revisions append-only table recording every admin change with actor, timestamp, before/after. Feed and dashboards show current value; the original is always recoverable and is what Phase-2 training uses.
2. Mutable row + generic audit_log entries (no typed before/after). Cheaper; reconstructing original classification later requires parsing audit payloads.
3. Mutable row, no history (literal minimum). Rejected by SafeIn5's own 'controlled and auditable' amendment.
4. Immutable original, and admin corrections stored as a separate reviewed_classification column alongside worker_classification - both first-class, both queryable.

#### Recommendation

Option 4, which is Option 1 plus one extra column and is the most valuable for Phase 2: keeping worker_classification and reviewed_classification as separate first-class fields turns admin corrections into labelled training data (human judgement vs expert correction) rather than data loss. Combine with an append-only revisions table for caption edits. Also please decide whether workers can delete their own signal post-submission - currently unstated, and 'I want to take that back' is a real field behaviour that needs a defined state (recommend: withdraw = soft-hide from feed, retained for the record).

---

### 16. media-and-transcript-residency-retention

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Replace the four-part question with the narrowed client-owned version, and drop parts (a) and the transcript-column half of (b) into the vendor's own design decisions:

"Voice notes are the preferred capture method (CQA-006 MUST) and are transcribed via a cloud provider (WRK-020 / SCP-020 MUST), so the system will hold recordings of workers' own voices — the most identifying artefact in a platform that promises optional anonymity. The proposal commits to 'EU-based data residency ... including export, delete, and retention policies' (Slide 14) but no period or media-lifecycle rule appears in the Dev Pack, the tender pack, or the Decision Register. We need three decisions from you before we contract a transcription sub-processor in Milestone 2:

1. Retention. What retention period applies to captured media (photo, 30-second video, voice audio) and to Behaviour Signal records — per Corporate tenant, and for the Community tenant? Do any of the three pilot organisations impose their own contractual retention or data-processing terms we must inherit? We need a number to build the deletion job and the GDPR export/delete flows against.

2. Raw voice audio. Once a voice note is transcribed, should the original recording be discarded (transcript only) or retained? Retaining it is more defensible for evidential/audit purposes; discarding it materially strengthens the anonymity position you have said must be stated honestly to pilot workers (PRD §5.5). This interacts with automatic face-blurring being out of scope — with blurring deferred and no retention period set, identifiable faces and voices would otherwise persist indefinitely. Please confirm you accept that combination or want it constrained.

3. Residency constraint on the transcription sub-processor. Do you require that voice audio is processed and stored only in EU regions, and that the provider is contractually barred from retaining audio for model training? Most major providers default to non-EU regions and to retention-for-improvement unless explicitly disabled, and the compliant EU configurations are a smaller set. Confirming this as a hard constraint lets us select accordingly; if you also need to approve the named provider or add it to a sub-processor register, tell us now.

For our part, we will implement per-tenant key prefixes in the object store with all media served through short-lived signed URLs issued only after a tenant-scoped authorisation check (never a public bucket), and store machine transcripts in a column distinct from worker-typed text so transcription quality can be measured and re-transcription remains possible. Flagging these as our design decisions rather than questions — tell us if either conflicts with an expectation on your side."

#### Why it matters

EU data residency is a stated hard NFR, and the proposal names an unspecified 'Speech-to-text provider' as a third-party dependency on the critical path of a MUST requirement (WRK-020). Most major STT providers default to non-EU regions and several retain audio for model improvement unless contractually disabled - which would breach the residency commitment on the most personally identifying artefact in the system, a recording of the worker's own voice. Voice is also uniquely de-anonymising: a colleague recognises a voice instantly. Separately, if the transcript and typed text share one column, Phase 2 cannot distinguish machine-transcribed text from human-typed text when training or when measuring transcription quality, and cannot re-transcribe with a better model. Signed-URL vs proxy determines whether media access is subject to RLS at all - a naive public bucket makes tenant isolation cosmetic.

#### Evidence

Talentica proposal Slide 14: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies.' Slide 19 Third Party Services: 'Speech-to-text provider - Voice-first capture transcription' (unnamed). Slide 19 Data and Platform: 'Object / media store: S3-compatible (S3 / GCS)' with no residency or partitioning statement. WRK-020 / SCP-020 (MUST): 'AI Audio Transcription - Automatically transcribes spoken voice notes into clean, typed text within the message box using cloud processing.' CQA-006 (MUST): 'Voice memo should be treated as the preferred capture method.' Slide 14: 'Maximum video duration of 30 seconds per clip.' Dev Pack s15.4: 'Developers should consider automatic face blurring' - explicitly out of scope per Slide 13, so raw faces persist in stored media indefinitely.

#### Options

1. EU-region bucket, per-tenant key prefix, authenticated proxy with RLS check on every media fetch, short-lived signed URLs issued only after authorisation. Raw audio discarded after successful transcription; transcript stored in transcript_text with source='stt' and confidence, separate from caption_text. STT provider contractually EU-processing with retention disabled.
2. Same storage model but retain raw audio indefinitely (better for Phase-2 re-transcription and for disputes; worse for anonymity and GDPR).
3. Direct signed URLs from the bucket with long expiry, no proxy. Cheapest; media access effectively bypasses tenant isolation.
4. On-device / browser Web Speech API transcription with no cloud audio egress. Removes the residency problem entirely; quality is poor in high-noise industrial environments and iOS Safari support is inconsistent - which is a problem given Safari iOS is a named supported browser.

#### Recommendation

Option 1. Discard raw audio after transcription by default: it is the single most identifying artefact in the system and retaining it undercuts the anonymity promise more than any other field. Store transcript_text separately from caption_text with a source flag - one extra column that keeps Phase-2 re-transcription and quality measurement possible. Three items need SafeIn5 decisions in Milestone 1 because they carry cost and legal weight: naming the STT provider and confirming an EU processing region with retention disabled (this is a DPA to be signed, not a config flag); confirming media retention period (recommend: same lifetime as the parent signal, purged on erasure); and confirming that faces will appear unblurred in stored media, since face blurring is explicitly out of scope while workers appear in their own photos.

---

## C. The <60s Capture Path, Media & Connectivity

### 17. capture-60s-operational-definition

> **Severity:** CRITICAL  |  **Blocks:** M1

#### Question

Two parts of the stated evidence are already settled by the documents and should be dropped from the ask, otherwise it invites re-litigation of closed points. (1) "Media upload completion" is NOT a candidate stop event — Dev Pack §4 explicitly states media uploads "must handle asynchronously in the background to allow the user to proceed to classification without waiting for upload completion", so upload time is already excluded by spec. (2) Classification is already carved out with its own separate budget — Dev Pack §4 line 110 "Classification must take <10 seconds" and §2 glossary line 37 — so it is not inside the 60s, which is consistent with SafeIn5.md Steps 3-4. Restate the question as: "Dev Pack §4 gives capture a bare <60s budget while §13.1 lists 'Enter the app / Capture ... / Classify it / See it appear in the feed' as one acceptance chain. Please confirm the operational definition we will be measured against at UAT: we propose the clock STARTS at first paint of the capture screen (whether reached by QR scan or app icon) and STOPS when the signal is committed and the user is shown the classification prompt — explicitly excluding PWA cold-start/install, QR scan and context resolution, the separate <10s classification step, background media upload, and feed refresh. If SafeIn5 instead requires QR-scan-to-feed-visible inside 60s, confirm now, plus the reference device, network profile (e.g. 3G/low-signal quarry) and warm/cold-start assumption, and whether it is a median or 95th-percentile target across pilot users."

#### Why it matters

This is the single acceptance criterion the whole MVP is validated on (Dev Pack §13.1 and §14). Without a signed operational definition it is untestable and unarguable at UAT: SafeIn5 can reject the build by including cold-start + QR scan + network upload, while Talentica can pass it by timing only the capture screen. Guessing wrong risks a failed M5 sign-off on a fixed-price contract with the final 15% payment attached.

#### Evidence

Dev Pack §4 "Capture must be completable in under 60 seconds"; §13 Definition of Acceptance "Enter the app / Capture a Behaviour Signal in under 60 seconds / Classify it / See it appear in the feed" (which reads as if entry, capture, classification AND feed appearance are all inside the envelope); §14 "Users can complete capture in under 60 seconds". SafeIn5.md Step 3 says "Capture takes under 30 seconds" and Step 4 adds classification afterwards. QA-001 says "Workers can complete the core PULSE / behaviour signal flow in under 60 seconds" — 'the core PULSE flow' is a much larger envelope than 'capture'. Talentica Slide 11 says "Frictionless capture in <60s"; Slide 18 attributes it to "single-screen capture experience".

#### Options

1. A) Clock = first tap on 'Share Observation' (or capture entry) → confirmation screen rendered. Excludes QR scan, app load, network/upload time. Measured on warm app.
2. B) Clock = QR scan resolved → confirmation screen rendered. Includes context routing and PULSE skip, excludes upload.
3. C) Clock = app cold-start/QR scan → signal visible in feed with media rendered. Includes upload completion.
4. D) Two separate budgets: 'capture-to-confirmation ≤60s' (excludes upload) plus a separate 'time-to-feed-visible' target measured but not contractually binding.

#### Recommendation

D, with A as the binding number. Upload completion must be outside the clock because Dev Pack §4 itself mandates that media uploads "handle asynchronously in the background to allow the user to proceed... without waiting for upload completion" — including upload time in the 60s directly contradicts that rule and makes the criterion a test of the worker's cellular signal, not of the product. Recommend the binding definition be: first interaction on the capture entry point → confirmation screen painted, warm app, on the agreed UAT device matrix, excluding QR scan, app cold-start and media upload. Time-to-feed-visible instrumented and reported but non-binding.

---

### 18. uat-timing-instrumentation-and-cohort

> **Severity:** CRITICAL  |  **Blocks:** M1

#### Question

Corrected restatement:

"Dev Pack §13 makes 'capture a Behaviour Signal in under 60 seconds' a Phase 1 Definition of Acceptance item, and §4 makes both <60s capture and <10s classification MANDATORY design rules whose failure 'invalidates the product model'. However the target appears only once in the Tender Pack (QA-001) and appears in no WRK row, no SCP row, and no Success Metrics row — the metrics sheets and QA-003 list adoption, repeat usage, submissions, QR scans and Learn5 engagement, but no task-duration metric. Milestone 5 sign-off (15% of the fee) therefore currently rests on an undefined criterion.

We propose the following and ask SafeIn5 to ratify it as the acceptance definition:
(a) EVIDENCE: primary evidence is client-side instrumented timing telemetry — timestamped events for capture-start → draft-created → classification-selected → signal-finalised, tagged with device, connection type and tenant — built in Milestone 2 and reported via the analytics stack. Microsoft Clarity session replay is supporting/diagnostic evidence only, not the measurement of record. A supervised field observation session at one pilot site during UAT provides corroborating evidence.
(b) SCOPE: the 60s clock covers capture-to-finalise excluding media upload completion (async by design, per Dev Pack §4) and excluding first-time authentication; the 10s clock covers the classification screen only. PULSE session duration is measured separately against its own <5-minute budget (Dev Pack §3) and is NOT part of this criterion.
(c) PASS BAR: propose p90 ≤ 60s and p90 ≤ 10s across all UAT sessions, rather than median (too weak) or every-participant (fails on a single outlier or one worker's unfamiliarity).
(d) POPULATION AND CONDITIONS: propose N participants (please confirm a number — we suggest at least 10 real pilot workers, not SafeIn5 or Talentica staff), on their own devices as used on site, in normal working PPE including gloves, on live site connectivity rather than office WiFi.

Please confirm (a)–(d), or state the alternative bar. Two dependencies follow from the answer: if telemetry is the evidence of record, the timing event schema must be scheduled in Milestone 2; if observed field testing is required, SafeIn5 must commit to participant recruitment, site access and PPE at a named pilot site during the 2-week M5 window."

#### Why it matters

There is no agreed evidence artefact for the MVP's headline criterion. A stopwatch test with 5 gloved quarry workers on 3G will produce very different results from an instrumented p50 measured by the dev team on office WiFi. This determines whether M5 sign-off is achievable and whether re-work sits inside or outside the fixed price. It also determines build cost: client-side timing instrumentation and a telemetry event schema is a real (small but non-zero) engineering task that must be in M2, not discovered in M5.

#### Evidence

Talentica Slide 19 lists "Microsoft Clarity, MixPanel" for "Usage Metrics – Telemetry Capture"; Slide 16 "Build – Measure - Learn: Instrument the platform to capture usage metrics". QA-003 lists metrics to capture but capture DURATION is not among them. Tender Pack Success Metrics sheet lists Adoption/Repeat Usage/Signal Submissions/QR Scans/Learn5 — no timing metric. Every WRK/SCP row's Acceptance Intent says "describe how it will be delivered, tested and validated during UAT" but no UAT protocol exists.

#### Options

1. A) Instrumented client-side timers (capture_started / signal_finalised events to Mixpanel), pass bar = p50 ≤60s across ≥20 real pilot sessions.
2. B) Stopwatch observation in a moderated field session: ≥8 of 10 gloved workers complete in ≤60s on first unaided attempt.
3. C) Clarity session replay reviewed jointly, qualitative sign-off.
4. D) A + B: instrumentation is the ongoing metric; a one-off moderated field test with a defined device/network matrix is the contractual acceptance event.

#### Recommendation

D. Make the instrumented timer the always-on evidence (it also feeds the post-pilot product decisions SafeIn5 wants per QA-003) and define ONE moderated acceptance test with a named device list, named network condition, gloved participants and a stated pass bar in the M1 scope-freeze document. Add the capture-duration metric to the Success Metrics sheet, which currently omits it.

---

### 19. stt-provider-blocking-and-cost

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

WRK-020 (voice-to-text) is a MUST and CQA-006 makes voice the preferred capture method, but no accuracy or acceptance criterion exists in any document, while the tender requires us to state how it will be "validated during UAT". We propose the following as the UAT acceptance criterion for WRK-020, and ask you to confirm or amend it: (i) transcription is asynchronous and never blocks submission — a signal is submitted with the audio attached and the transcript appears afterwards; (ii) the original audio is always retained and playable by supervisors, so a poor transcript never loses the observation; (iii) the transcript is always editable by the author before finalisation; (iv) acceptance is judged on this behaviour, not on a word-error-rate threshold, given UK regional accents, dust masks and plant noise. If you instead require a measured accuracy figure, we need you to define the target and supply a representative audio sample set from a pilot site during M1 to measure against, as this becomes a fixed-price acceptance risk.

(Note for the asker: do not ask which STT technology or whether it is blocking. WRK-020's functional description already specifies "using cloud processing", Slide 19 already names a cloud "Speech-to-text provider" and an async "transcription dispatch" worker, and Slide 14's EU data-residency requirement already constrains region. Ask STT cost only as part of one consolidated question about who owns and pays for all third-party service accounts after the pilot.)

#### Why it matters

WRK-020 is a MUST and voice is designated the PREFERRED capture method (CQA-006), so this is on the critical path of the headline flow — yet the technology choice is completely open and the two options have wildly different properties. Web Speech API is free but Chrome-centric, unavailable/unreliable in iOS Safari (one of only two supported browsers), and degrades badly with accents and noise. Cloud STT works but adds latency, per-minute cost with no named payer, and a GDPR sub-processor with a data-residency obligation. If transcription is blocking, a 4-second round trip on a bad link torpedoes the 60s budget.

#### Evidence

WRK-020 Functional Description: "Automatically transcribes spoken voice notes into clean, typed text within the message box using cloud processing"; Assumption column: "Integrates with native mobile device speech engines OR a cloud transcription API" — both options left open. Priority MUST/MVP. CQA-006: "Voice memo should be treated as the preferred capture method for frontline workers." Talentica Slide 19 lists a generic "Speech-to-text provider" third-party service and an in-process background worker for "transcription dispatch" (implying async), and Slide 14 restricts browsers to "Safari (iOS) and Chrome (Android)". Slide 14 requires "EU-based data residency with GDPR compliance". No accuracy target, cost, or payer appears anywhere.

#### Options

1. A) Web Speech API only — zero cost, zero GDPR sub-processor, but effectively Android/Chrome-only and poor in noise; iOS users get voice-note-without-transcript.
2. B) Cloud STT (EU region, DPA signed) for all voice notes, dispatched ASYNC after signal finalisation; transcript appears on the feed card a few seconds later.
3. C) Cloud STT invoked synchronously in the capture screen so the worker can review/edit the text before finalising.
4. D) Web Speech API where available, cloud STT fallback for iOS — two code paths, two quality profiles.

#### Recommendation

B, explicitly async and explicitly never blocking finalisation. Rationale: it is the only option that works identically on both supported browsers, keeps the 60s budget safe, and matches the 'transcription dispatch' worker already in the proposed architecture. Required client decisions attached to B: (i) name the provider and confirm an EU processing region + DPA, since it becomes a GDPR sub-processor handling voice — SafeIn5 must add it to its processing records; (ii) confirm SafeIn5 owns the per-minute STT cost as a pass-through running cost, NOT inside the £45k fixed price (at 30s clips and pilot volumes this is small, but it must be assigned); (iii) accept that no accuracy SLA is offered — transcription is a convenience layer over the audio, which is why the audio-retention question below matters. Reject C outright: synchronous cloud STT on a quarry link is the fastest way to fail the 60s criterion.

---

### 20. voice-audio-retention-vs-anonymity

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Two citation fixes, then ask it sharper.

(1) The Dev Pack does not treat voice as media at all — it never uses the words "audio" or "voice". Its media model is photo/video only (§7: "media - optional photo/video upload"; "media (image/video)"). Voice is a Tender Pack requirement (WRK-009, WRK-020, SCP-020, CQA-006), so the gap is bigger than "nothing states whether audio is stored" — the authoritative dev spec has no audio field in the schema.

(2) Dev Pack §17.1 Scenario 2 is "Unsafe Scaffold Access" (the missing-handrail case), and it does contain "User fears retaliation if management sees their identity" — but note its risk framing is management-facing, whereas the voice-playback leak is peer-facing, which is the stronger argument.

Restated question: "The Dev Pack's signal media model is photo/video only, while WRK-009/WRK-020 make voice capture a MUST and describe transcription 'into the message box'. Please confirm the intended treatment of the voice recording itself: (a) is the audio file persisted at all, or discarded once transcribed; (b) if persisted, is it playable by other workers in the site feed, or retained internally only for transcription-correction/audit; and (c) for signals submitted anonymously, do you want audio playback suppressed entirely? A worker's voice identifies them to their own crew far more reliably than a username, so DB-level metadata stripping does not deliver the anonymity promised in §15.2/§15.4 and Scenario 2. Your answer also fixes the GDPR export/delete scope and object-store sizing."

#### Why it matters

This is a GDPR and trust landmine sitting at the intersection of the two features the client has flagged as most important (voice-first capture, and anonymity for psychological safety). If Dave submits anonymously but his voice note plays on the site feed, every colleague knows exactly who reported the shackle problem — and the Dev Pack's entire anti-retaliation premise (§15.2, §17.1 Scenario 2) fails in practice while the system claims to be protecting him. Discarding audio, conversely, means any transcription error is unrecoverable and the worker's actual words are lost. Also determines storage sizing and the delete/export scope for GDPR SARs.

#### Evidence

Dev Pack §15.2 "Support psychological safety and optional anonymity"; §15.4 "Anonymous and confidential reporting modes should be supported"; §17.1 Scenario 2 "User fears retaliation if management sees their identity." Dev Pack §7: "Anonymity must be handled by stripping user metadata at the DB level when the 'Anonymous' flag is active" — metadata stripping does nothing about voice content. Talentica Slide 18 already flags the gap: "True anonymity will require masking of location, non-reversal by the admins etc. which is not considered as a part of MVP." WRK-009/WRK-020 make voice a MUST; PRD §5.5 records anonymity as an account-level setting. Nothing anywhere states whether audio is stored.

#### Options

1. A) Transcript only — audio transcribed then immediately discarded; nothing playable in the feed.
2. B) Audio retained and playable for all signals, including anonymous ones (with the anonymity limitation disclosed to workers).
3. C) Audio retained and playable for attributed signals; for anonymous signals the audio is transcribed then discarded and only the transcript is shown.
4. D) Audio retained but never played back to other users — accessible only to the author and to admins for correction/moderation.

#### Recommendation

C. It preserves the fidelity benefit of voice for the normal case while making the anonymity promise actually true for the case where it matters. It is also cheap to implement (a conditional purge keyed on the same anonymous flag that already drives DB-level metadata stripping). If SafeIn5 prefers B, the app MUST tell the worker at capture time, in plain words, that their voice will be audible to others — an unstated voice leak under an 'anonymous' label is the kind of thing that ends a pilot and creates ICO exposure.

---

### 21. ios-pwa-platform-limits-accepted

> **Severity:** CRITICAL  |  **Blocks:** M1

#### Question

Two fixes to the framing. (a) Drop sub-point (5), biometric unlock — no document requires biometrics; auth is magic-link/email-OTP/JWT (Slide 19), so this is invented scope and weakens the ask. (b) Sharpen the WRK-022 characterisation: the Detailed Requirement Statement for WRK-022 is correctly about push ("Automatically pushes direct pop-up alerts or text warnings... if an urgent safety hazard cluster is flagged in their zone"); it is the Community/Corporate requirement columns and the "Approved with Amendment" note that are the copy-paste error about voice-first captions. So the defect is that a MUST/MVP push requirement has been approved with an amendment that says nothing about push. Suggested restatement: "Dev Pack §4 mandates asynchronous background media upload and §10 requires PWA 'Add to Home Screen' and offline capabilities, while WRK-022 (MUST/MVP) requires pushed hazard alerts. On iOS Safari — one of the two supported browsers, and the phone most workers will bring — the platform does not permit uploads to continue once the tab is backgrounded or the phone is locked, provides no Background Sync API so queued signals flush only on reopen, delivers web push only to a PWA installed via Add to Home Screen, and may evict IndexedDB/cache under storage pressure. Does SafeIn5 accept these in writing as Apple platform constraints rather than defects — i.e. they will not be raised as UAT bugs — and does SafeIn5 own the site-level onboarding task of getting iOS workers to install to Home Screen, since without it they receive no notifications and have weaker local durability? Also please confirm the WRK-022 amendment text, which currently describes voice captions rather than push alerts."

#### Why it matters

iOS Safari is one of only two supported browsers and workers are on personal phones. Every one of these limitations will present at UAT as a bug ('I shared it and it never appeared'), and without prior written acceptance each becomes a defect the vendor must fix inside a fixed price — which is impossible, because they are platform constraints Apple imposes. This is the classic PWA fixed-price blow-up. It also has a product consequence: the 'Add to Home Screen' step is effectively mandatory for iOS workers to get notifications and durable storage, which turns onboarding into an operational task SafeIn5 must run at each pilot site.

#### Evidence

Talentica Slide 14: "Supported Browsers: Safari (iOS) and Chrome (Android)"; Slide 13 out-of-scope "Native iOS / Android apps"; Dev Pack §9 OUT OF SCOPE "Native apps". Dev Pack §10 requires "a line item for Progressive Web App (PWA) implementation to support the 'Add to Home Screen' and offline capabilities." WRK-022 (Live Worksite Warnings / push alerts) is marked MUST/MVP — though note its Detailed Requirement Statement is a copy-paste error about voice captions, so the actual push requirement has never been properly specified. Talentica Slide 19 lists "web-push (VAPID)". SafeIn5.md device profile: "Personal mobile phone or company-issued rugged device."

#### Options

1. A) Formal written acceptance of the iOS limitations as constraints, recorded in the M1 scope-freeze; UAT defects arising from them are not vendor defects.
2. B) Acceptance plus mitigation: make 'Add to Home Screen' a guided, instrumented onboarding step and make SafeIn5 responsible for walking pilot workers through installation at site induction.
3. C) Restrict the pilot's iOS cohort to installed-PWA users only, and measure Android/iOS split so results are interpretable.
4. D) Re-open the native-app question (explicitly out of scope in both documents, and unaffordable at £45k).

#### Recommendation

B, with A as its foundation, and add C as a measurement discipline. Also flag WRK-022 for re-specification: it is marked MUST but its requirement text is a copy-paste of the voice-caption row, so nobody has actually agreed what a 'Live Worksite Warning' does — and on iOS it will only reach installed users, which likely makes it a partial-coverage feature at best in the pilot. That needs to be settled at M1, not discovered in M4 when notifications are built.

---

### 22. exif-stripping-and-face-mitigation

> **Severity:** CRITICAL  |  **Blocks:** M1

#### Question

Drop (a) and ask (b) alone, framed as a control decision rather than a technology one:

"Automatic face-blurring is excluded from MVP (Talentica, Features Not Required), while Dev Pack §15.4 asks developers to consider face blurring and identity minimisation, and §17.1 Scenario 1 is itself a PPE-non-compliance photo case where 'Worker does not want to identify colleagues directly.' With blurring off the table, which control do you want in MVP for photos containing identifiable people?
 (i) Capture-time only — a standing instruction/on-screen prompt to photograph the condition not the person, plus admin delete after the fact (ADM-031/034). No build cost.
 (ii) Media held pending review — images do not enter the feed until an admin/supervisor releases them. New build, and it breaks the 'capture → see it in the feed' immediacy that PULSE trust depends on.
 (iii) Photos on Needs Attention Now signals visible to supervisor/admin only, not the site-wide feed.
This also needs your position on feed visibility: the current working assumption is that feed reads are fully unauthenticated, which means any released photo is readable without a login. Is that acceptable for photographic media, or should media (not text) require an authenticated in-tenant viewer? We need your answer, plus whoever owns the DPIA and the pilot orgs' workforce agreements, before Milestone 2 builds media upload — option (ii) is a scope change, not a detail.

Separately, for the record and not requiring an answer: we will strip all EXIF (GPS, device identifiers, timestamps) from uploaded images at ingest and will not derive signal location from EXIF — location comes only from the device geolocation permission per Dev Pack §4."

#### Why it matters

Direct GDPR and trust exposure. A photograph of an identifiable worker in a PPE-non-compliance context, published to a site-wide feed, is personal data processed for a purpose that individual never consented to — and Dev Pack §15.1 promises the platform is "not a surveillance or disciplinary platform" and focuses on "conditions... rather than identifying and blaming individuals." One such photo reaching a supervisor is enough to end a pilot and trigger a union or ICO issue. Meanwhile retained EXIF GPS silently undermines the anonymity model at the file level, where nobody thinks to look. Neither is specified anywhere.

#### Evidence

Dev Pack §15.4: "Developers should consider automatic face blurring and identity minimisation for uploaded images." Talentica Slide 13, Features Not Required: "Automatic face-blurring." Dev Pack §17.1 Scenario 1 is literally a PPE-non-compliance photo scenario: "Worker does not want to identify colleagues directly. UX should focus on unsafe condition." Dev Pack §7: "Anonymity must be handled by stripping user metadata at the DB level" — silent on file-embedded metadata. Talentica Slide 14: "EU-based data residency with GDPR compliance." ADM-031/ADM-034 give admins view/delete of observations but no pre-publication review. Nothing states EXIF handling.

#### Options

1. a1) Strip ALL EXIF server-side on ingest (and client-side as a by-product of downscaling); take location only from the device Geolocation API, never from EXIF. / a2) Strip EXIF but first extract GPS into the signal record. / a3) Retain EXIF as-is.
2. b1) Pre-publication moderation: any photo-bearing signal is held for admin review before it enters the feed (kills the immediacy the product is built on).
3. b2) In-capture nudge: a one-line reminder on the camera screen — 'Photograph the condition, not the person' — plus a post-publication report/remove path with a stated removal SLA and audit trail (ADM-031/034 already provide the removal tooling).
4. b3) Manual redaction tool in the admin console (draw-a-box blur) — small build, not currently priced.
5. b4) Do nothing; rely on existing site photography policy.

#### Recommendation

a1 + b2, and add b3 only if the client will fund it. a1 is nearly free (client-side downscale already discards EXIF) and closes a silent anonymity leak — critically, do NOT harvest EXIF GPS into the record, because that would attach precise location to signals the worker believes are anonymous. For faces, b1 is incompatible with the product (a hazard photo held for review is not shared awareness), and b4 is not a defensible GDPR position given the client's own §15.4. b2 is the honest minimum: a design-level nudge plus a fast, audited takedown route. This decision must also be reflected in SafeIn5's privacy notice and worker-facing pilot briefing — which is SafeIn5's responsibility, not the vendor's, and should be named as such.

---

## D. QR Context Routing

### 23. qr-guest-read-corporate

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Two fixes before sending.

(a) WRK-024/SCP-024 is weaker than claimed. "Corporate feed remains private/site-based" and "must not expose corporate/client content unless explicitly approved" appear in the **General Feed** row (SHOULD, MVP/Phase 1), and both statements constrain what the *Community general feed* may surface — a cross-tenant-sharing rule, not a statement about anonymous scanners. Do not present it as the direct contradiction of WRK-003. Present it as the client's clearly stated *intent* that corporate content is private, which makes the unaddressed anonymous-scan path an intent-versus-mechanism gap.

(b) PRD §5.6 says "View the feed — **None**" (i.e. it currently assumes fully unauthenticated feed reads), not "feed: none required." Cite it as an unconfirmed vendor assumption that must be ratified or overturned, since it is the risky branch.

Suggested restatement:

"WRK-003/SCP-003 makes credential-free QR access a MUST and states the app 'will directly show content'; your amendment deferred only whether *submissions* need a named worker, and did not address what a guest may *read*. WRK-013 then makes the scan itself the filter key for the site/sub-site signal feed. Our current working assumption is therefore that a Corporate QR scan returns PULSE, Rescue Plan, Learn5 **and** that sub-site's Behaviour Signal feed to an unauthenticated device.

Please confirm or overturn that for Corporate tenants, taking each separately: PULSE prompt, Rescue Plan, Learn5 content, and the Behaviour Signal feed (including worker-captured photos).

Our recommendation is: Rescue Plan, PULSE and Learn5 fully unauthenticated for any tenant — the safety journey must never sit behind a login; the Behaviour Signal feed for a **Corporate** tenant requires an authenticated user assigned to that org (Community feed stays open). We would implement this per-endpoint in Milestone 2, so we need the answer before M2 begins.

Two consequences to note: (i) a QR URL is a permanent, transferable, worldwide credential to whatever it exposes — anyone who photographs the sticker holds it forever, so 'unauthenticated' means genuinely public, not 'people on site'; (ii) if you want the feed open to guests, we will need your GDPR position on the lawful basis for publishing worker-captured operational imagery to unauthenticated third parties, and confirmation that your three pilot clients have agreed to it in writing. QR rotation/expiry is not a substitute — it changes the window, not the model."

#### Why it matters

A QR sticker on a lifting-zone barrier is public. Anyone who photographs it — a visitor, a contractor, a journalist, a competitor, a claimant's solicitor — holds a permanent, transferable, worldwide-usable credential to whatever that URL exposes. If the feed is included, SafeIn5 has built an unauthenticated public window into a paying client's incident-adjacent photography, which is a contract-losing and potentially GDPR-reportable event the first time it is noticed. This is a direct, unresolved collision between two MUSTs: WRK-003 (guest access) and the tenant-isolation NFR. It must be answered before the authorization model is coded in M2, because 'is this endpoint public?' is a per-endpoint architectural decision, not a switch.

#### Evidence

WRK-003 (MUST, Approved): 'No Requirement of any credentials, app will directly show content. When user scan QR at that time as well we are considering guest login.' Its own amendment hedges: 'Supported where appropriate for QR-led viewing, but corporate signal submission may require known-user... SafeIn5 should decide during discovery.' WRK-024/SCP-024: 'Corporate feed remains private/site-based' and the community feed 'must not expose corporate/client content unless explicitly approved.' WRK-013 (MUST) requires the feed to auto-filter to 'Sub Site specific observations in which worker currently is (by scanning QR)' — which reads as scan-grants-feed. Talentica NFRs: 'tenant-based isolation between Community and Corporate data' (Slide 14). PRD §5.6 assumed 'guest reads, feed: none required' but flagged it unconfirmed.

#### Options

1. Guest scan of a Corporate QR returns SAFETY CONTENT ONLY (PULSE prompt, Rescue Plan, Learn5). Feed requires an authenticated user assigned to that org/site. Unassigned authenticated users also get no feed.
2. Guest scan returns safety content + a redacted feed (classification, context, timestamp and text only — no photos, no video, no author).
3. Guest scan returns full read access to the site feed for the scanned sub-site; corporate tenants accept this as the price of frictionless access, recorded as an explicit written client decision.
4. Corporate QR codes require a one-time device claim: first scan asks for a site access code (printed on the sticker or given at induction) which is exchanged for a device-bound token; guest gets Rescue Plan immediately, feed after claim.

#### Recommendation

Option 1 for MVP, and get it signed off in writing by each of the 3 pilot organisations. The safety-critical journey (scan at a confined space entry, read the rescue plan) genuinely must not sit behind a login — but nothing in Dev Pack §8.3 or the Rigging scenario requires the FEED to be unauthenticated. WRK-013's auto-filtering is fully satisfiable for logged-in workers. Option 3 is the answer a literal reading of WRK-003 produces and it is the one that will cost SafeIn5 a corporate pilot. If SafeIn5 insists on guest feed access, Option 2 at minimum — the photos are the exposure, not the classifications.

---

### 24. qr-cross-tenant-submission

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

The question is directionally right but two pieces of its evidence are overstated and it asks for more than it needs. Corrected restatement:

"WRK-003/SCP-003 defers to Discovery whether Corporate signal submissions must be linked to a named worker. A related case is undefined anywhere: an authenticated user whose account sits in Organisation A's tenant (or in Community only) scans a QR mapped to Organisation B's site. Note that read access is not in question — PULSE, Rescue Plan and Learn 5 are unauthenticated on QR scan, so the contractor safety journey works regardless. The undefined case is submission. Three options, please pick one:
(a) Block submission outside your own org — the contractor's observation is lost;
(b) Allow it, and the signal is owned by Organisation B (the site owner), with the submitter recorded as an external/visitor participant rather than as an Org B user;
(c) Allow it, and the signal is owned by the Community tenant with Org B context attached but no Org B feed/dashboard presence.
Whichever you choose, please confirm the GDPR position that follows: if Organisation A later erases that user, does Organisation B's safety record survive (anonymised) or is it destroyed? And confirm whether Organisation B's admin can delete a record authored by someone outside their organisation.

Two evidence corrections vs. the original draft: (1) ADM-019's 'workers who are not assigned to any other site' constrains site assignment within an organisation's own user base; it does not state that a worker belongs to exactly one organisation — that is an inference, though the one-worker-one-site assumption it encodes is still a real conflict with the contractor case and worth raising alongside. (2) Dev Pack §7's RLS sentence describes the Community-vs-Corporate boundary specifically, not inter-organisation isolation; the inter-org isolation claim comes from the Talentica proposal's 'Data segregation at tenant level', not from the Dev Pack."

#### Why it matters

This is not a hypothetical: contractors, hauliers, plant-hire operators and SafeIn5's own pilot lead will all scan QRs at sites they are not assigned to, and the pilot deliberately runs 3 organisations on one platform. If the answer is not decided, the default implementation will either (a) reject them, breaking the contractor use case and the 'safer by sharing' pitch, or (b) silently write a row into Org B's tenant with a user_id from Org A's tenant — a cross-tenant foreign key that breaks the RLS model, breaks GDPR erasure (deleting the Org A user destroys an Org B safety record), and cannot be unwound after data exists. Also note ADM-019 assumes a worker belongs to exactly one site ('workers who are not assigned to any other site'), which the contractor case contradicts.

#### Evidence

Dev Pack §7 Storage: 'utilise row level security (RLS) to ensure strict data segregation between community and corporate layers.' WRK-003 amendment: 'For Corporate pilots, SafeIn5 should decide during discovery whether all signal submissions must be linked to a named worker.' ADM-019/SCP-043: 'List of workers who are not assigned to any other site will be visible to add' — implies a single-site, single-org membership model. ADM-023: deleting a site sets 'workers assigned in site... as on bench'. CQA-001 requires one platform, two operating models, without a rebuild. Nothing in any document addresses a user scanning outside their own tenant.

#### Options

1. Hard reject: scanning another org's QR shows safety content (per qr-guest-read-corporate) but the 'Share Observation' action is disabled with an explanatory message. Simplest, safest, breaks the contractor journey.
2. Allow submission; signal is owned by the QR's tenant (Org B); the author is stored as a foreign/visitor reference, flagged 'external contributor', and is excluded from Org B's user-level analytics.
3. Allow submission; signal is owned by the AUTHOR's tenant (Org A) with Org B context attached; Org B never sees it. Preserves privacy, defeats the purpose.
4. Dual-write / mirrored visibility: owned by Org B, mirrored read-only into the author's own activity history.

#### Recommendation

Option 2, with 'external contributor' as an explicit first-class concept in the user–site model from M2. The QR's tenant owns the data because the data is about that tenant's site; the author gets a device-local record so their own history is not lost. Critically, this requires the data model to allow a user to have relationships with MULTIPLE orgs/sites from day one — which directly contradicts ADM-019's single-assignment assumption. That contradiction must be resolved in M1 or the user/site schema will be rebuilt in M3.

---

### 25. qr-context-staleness

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Two citation fixes. (1) The "update the app context without friction" wording is SafeIn5's *decision-column* text on WRK-016/017/018 (whose requirement cells are blank); the substantive requirement is WRK-015: "If worker moves to another site/sub-site he can scan the QR and info given in the app will automatically updates to the new site/sub-site." (2) Geolocation is a weaker mitigation than stated — Dev Pack §5 scopes the Corporate bullet to "non-QR mobile capture workflows" and marks it optional/permission-dependent, so it cannot be relied on to correct a stale QR context. Restated question: "QR context has no stated lifetime. We propose: context persists until the next scan or until a staleness window elapses, and the capture screen always shows the active context as an editable chip so the worker can confirm or clear it in one tap (no mandatory field, no re-scan forced). We need two things from you: (a) what staleness window is operationally right — end of shift, a fixed 2-4h, or per-visit — given how often your quarry workers move between sub-sites; and (b) when context is stale or absent, should the signal still be submittable with sub-site unset (feed/hotspot data then shows 'site-level, unattributed'), or must the worker re-scan? We would rather record 'unknown sub-site' than a wrong one, because ADM-040 threshold alerting and supervisor hotspots act on that field."

#### Why it matters

Context is the entire value of the QR feature — it is what lets the worker type nothing (Dev Pack §1.1: 'Context: Specific data... automatically attached to a signal or session via a QR code scan'). But if context persists indefinitely, a worker who scans at the confined space at 07:00 and captures a signal at the crusher at 15:00 files a signal geotagged to the wrong sub-site. That silently poisons the sub-site hotspot data that supervisors are meant to act on (SafeIn5.md Step 7) and that ADM-040's threshold alerting would fire on. Wrong-location safety data is worse than no location data — it sends a supervisor to the wrong place. Conversely, an aggressive TTL forces re-scanning and breaks the frictionless promise.

#### Evidence

Dev Pack §8.2: context 'must be passed into PULSE (Take 5) sessions, Behaviour SIGNAL creation, Rescue Plan display' — with no lifetime stated. WRK-013 (MUST) makes the FEED depend on live context: 'Sub Site specific observations in which worker currently is (by scanning QR) will be shown' — 'currently is' is the unanswered question. WRK-016 (MUST): scanning another QR 'update[s] the app context' — defines replacement, not expiry. Dev Pack §5 offers a partial mitigation: 'optional device geolocation should automatically attach... where user permissions allow.' Talentica Slide 18: 'automatic attachment of site/sub-site/asset/task context'.

#### Options

1. Context persists until the next scan or explicit clear — no expiry. Maximum convenience, maximum mis-attribution risk.
2. Fixed TTL (recommend 4 hours ~ half a shift), after which the app shows context as 'stale' and prompts re-scan before capture, but never blocks capture (zero mandatory fields).
3. Session-scoped: context dies when the PWA/tab is backgrounded past a threshold or closed.
4. TTL + optional geolocation cross-check: if device GPS is available and the worker is >Xm from the sub-site's recorded coordinates, downgrade context to 'unconfirmed' and surface a one-tap confirm/clear.

#### Recommendation

Option 2 as the MVP rule, with the context chip ALWAYS visible on the capture screen ('Brackley Quarry · Lifting Zone 3 · change') so the worker can see and correct it in one tap without typing. Record `context_source` (qr_scan / manual / carried_over) and `context_age_seconds` on every signal — without those two fields SafeIn5 cannot later tell clean context data from stale, and the SIGNAL corpus is permanently ambiguous. Option 4 is the right Phase 2 evolution and QA-004 already parks geofencing there; do not build it now, but do capture site coordinates in M3 so it is possible.

---

### 26. qr-landing-routing

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Dev Pack §8.1 says a QR routes to "one or more" of PULSE / Rescue Plan / Learn 5, and §8.2 makes "destination type(s)" plural — but no document says what the worker SEES on landing. The Rigging scenario (SafeIn5.md Step 1) auto-opens PULSE and never surfaces the Rescue Plan at all; your proposal (Slide 7) puts Rescue Plan Review after PULSE; §8.3 lists three parallel destinations. Please confirm:

1. On scanning a multi-destination QR, does the worker land on a short context header listing the available destinations (PULSE / Rescue Plan / Learn 5 / confined space survey), or auto-route into the single destination configured on the mapping, with the others reachable from within it?
2. If auto-routing: we assume the mapping's configured primary destination_type decides, not risk type — please confirm.
3. Emergency case, and the reason we are asking: our current PRD position is that PULSE always plays its full sequence. If someone is already down inside a confined space and a colleague scans the entrance QR, must the Rescue Plan be reachable in one tap without completing PULSE? We propose a persistent "Rescue Plan" control visible from the first PULSE screen on any QR whose context carries a rescue plan. Confirm this is acceptable to your safety argument.
4. Dev Pack §8.6 names a "confined space survey" as a fourth thing on the same QR — this appears in no other list (§8.1, §8.3, §8.5). Is that a distinct destination type we must build, or the Rescue Plan / a PULSE variant under another name?

#### Why it matters

An interstitial menu costs one extra tap and one extra decision on the single most-measured path in the product, against a hard sub-60-second budget and a 'no multiple clicks' commitment. But auto-routing into PULSE buries the Rescue Plan — and the Rescue Plan is the one screen that matters when something has already gone wrong at a confined space entry. Getting this wrong in either direction is a UX rebuild in M3 and, in the Rescue Plan direction, a genuine safety-argument exposure. The two source documents describe different journeys: Dev Pack §8.3 lists three parallel destinations; the Rigging scenario auto-opens PULSE.

#### Evidence

Dev Pack §8.6: 'The confined space survey, rescue plan, PULSE, Learn 5 should link to the same QR code.' Dev Pack §8.2 lists 'destination type(s)' — plural — as a context field. Dev Pack §8.3: a confined-space QR 'should route the user to: Confined Space PULSE prompt, Associated Rescue Plan, Relevant Learn 5 content.' But SafeIn5.md Step 1: 'The system immediately opens the SafeIn5 PULSE screen' — a single auto-route. Talentica Slide 7 sequences them: 1 QR scan, 2 PULSE, 3 Rescue Plan Review, 4 Signal Capture. Talentica Slide 16 UX principle: 'Show Learn5, Rescue Plan etc. specific to the context... to avoid scroll, click.' Talentica Slide 9: 'No multiple clicks.'

#### Options

1. Interstitial menu: three large cards (Start PULSE / Rescue Plan / Learn5) with the context banner at top. One extra tap, zero ambiguity, obvious emergency access.
2. Auto-route to PULSE, with a persistent, always-visible Rescue Plan affordance (a fixed red bar) on every screen of the contextual session.
3. Single scrolling context page: context header, primary PULSE CTA above the fold, Rescue Plan and Learn5 as inline sections below.
4. Configurable per mapping: the admin sets a primary destination per QR (default PULSE), others reachable from a secondary nav.

#### Recommendation

Option 2. It honours the Rigging scenario (which is the client's own canonical journey and the M5 UAT script), keeps the 60-second path at zero extra taps, and makes the Rescue Plan reachable in one tap from ANY screen rather than only from a landing page the worker has already navigated past. Emergency content must never be behind 'go back'. Note that Rescue Plan is only SHOULD (WRK-006/SCP-006) while PULSE is MUST — so PULSE-primary is also the correct priority read. Option 4 is the seductive one; resist it, as configurability here means four routing paths to test in M5 for 30 mappings.

---

### 27. qr-admin-scope-reconciliation

> **Severity:** HIGH  |  **Blocks:** M1

#### Question

Drop the "contradiction" framing — QA-004 already resolves it in favour of a minimal admin UI, and Dev Pack §8.6 only rules out a *complex* one. Ask instead:

"QA-004 confirms admins create a site/sub-site/task area and the QR is auto-generated, with a basic admin view showing which QRs exist and their linked context. We are building exactly that, not a config-file/seed-script approach. Two things the requirements do not cover, and they change the M3 build:

(a) Non-site QRs. ADM-012/ADM-018/SCP-036/SCP-042 only generate a QR from a site or sub-site record, but Dev Pack §8.6 budgets up to 30 unique context mappings for the pilot and §8.2 requires context to include task type, risk type and asset plus links to PULSE, Rescue Plan and a specific Learn5 item. For the pilot, will every QR correspond 1:1 to a site/sub-site record, or do you need to create standalone QRs for specific assets/task areas (e.g. a named confined-space vessel) and choose which Learn5 item and Rescue Plan each one points at? If the latter, that is a context-mapping editor, not just an auto-generated code on a site record.

(b) Mutation. During the pilot, when a QR is placed at the wrong asset, or the Learn5 content behind it is replaced, does your pilot lead need to re-point that QR's context themselves in the admin console, or is it acceptable for Talentica to action those changes on request during the pilot window? Same question for deactivating a retired QR and re-downloading a QR image for reprinting.

Our assumption if we hear nothing: auto-generate on site/sub-site create; read-only list of QR → context with a download/print action; re-pointing and deactivation handled by Talentica on request during the pilot; no QR tested/active status (per QA-004, not essential). Confirm or correct — full self-service context editing is a material addition to Milestone 3."

#### Why it matters

This is a direct scope and money question against a fixed-price GBP 45,000 with a stated ±15–20% tolerance. 'Simple backend setup' is roughly a day of seed-script work; a QR management UI with create/list/re-point/activate/deactivate/preview/export is a multi-day admin module inside M3, the milestone already carrying QR routing, Learn5 management, feed management and search. Worse, a config-only approach means SafeIn5 cannot re-point a mispositioned QR without raising a ticket with Talentica — which collides directly with finding `qr-repoint-indirection` and with QA-004's premise that SafeIn5's pilot lead manages placement operationally.

#### Evidence

Dev Pack §8.6 (verbatim): 'QR codes do not require a full admin interface in Phase 1 • QR codes can be pre-generated. Mapping to context can be managed via configuration or simple backend setup... No complex QR management UI is required for MVP. This ensures speed of delivery and avoids unnecessary system complexity.' Versus ADM-012 (MUST): 'QR will be auto generated while creating site, it will be given in list view associated with site'; ADM-018 (MUST): 'Auto QR generated and associated with site and sub site will be visible in list'; SCP-036/SCP-042 both MUST. QA-004 SafeIn5 Response: 'Basic admin view should show which QR codes exist and what context they are linked to' and 'A simple QR tested/active status would be useful if achievable within MVP scope, but it is not essential if it creates cost or complexity.' Talentica Slide 12 scope: 'QR Context mapping to site, subsite, assets, learn 5 content, Rescue plan etc.'; Slide 22 Milestone 3: 'QR management, context configuration'.

#### Options

1. Config-only: QR codes seeded by script at pilot setup; changes require a Talentica ticket. Cheapest, matches Dev Pack §8.6 literally, leaves SafeIn5 operationally dependent.
2. Read-only admin view: QR auto-generated on site/sub-site creation (satisfies ADM-012/018), listed with its resolved context and a downloadable PNG. No editing UI; re-pointing via ticket.
3. Minimal management UI: auto-generate + list + view context + toggle active/inactive + re-point to a different sub-site + download PNG. No bulk ops, no design/branding options, no analytics.
4. Full QR management module: everything in 3 plus bulk generation, print-sheet export, per-code scan analytics, 'tested/active' verification status, and audit history UI.

#### Recommendation

Option 3, and log it as a formal amendment to Dev Pack §8.6 with a written impact assessment against the fixed price. Option 2 is not viable given finding `qr-repoint-indirection`: the whole point of indirection is that SafeIn5 can fix a mispointed sticker on the day it is found, at a live quarry, without a vendor release. Option 3 is the smallest set that makes that true, and it directly satisfies ADM-012/018 and QA-004's 'basic admin view'. Explicitly exclude the 'QR tested/active' verification status — QA-004 already pre-authorises dropping it ('not essential if it creates cost or complexity').

---

### 28. qr-dead-code-behaviour

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Citation fix: the "QR codes will not work" wording appears only in ADM-023 (Site Management → Delete existing sites). SCP-047 is the scope-matrix row for the same requirement and contains no such text — cite it as the MUST/MVP scope confirmation only, not as the source of the quote.

Suggested restatement: "ADM-023 mandates that deleting a site hard-removes it and that 'QR codes will not work', but no document defines what a worker actually sees. Physical stickers outlive console records, so we need three things from you: (a) the exact worker-facing screen and wording for a QR that is unknown, inactive (Dev Pack §8.2 defines the flag but not its behaviour), or points to a deleted site — specifically whether it must carry a fail-safe safety instruction and an escalation contact rather than a generic error, given §8.3 puts this QR at a confined-space entry; (b) whether that screen should still offer a manual route into PULSE / site selection / signal capture, or dead-end; and (c) whether hard-delete is genuinely the required behaviour, or whether site deletion should be soft/blocked while live QR codes reference it, with a decommission step. We will design the error UI; we need SafeIn5 to own the safety wording and the delete policy."

#### Why it matters

This is the one QR failure mode with a direct safety consequence. A sticker survives on a barrier long after an admin deletes a site in the console; the worker at that barrier scans it expecting a rescue plan. A generic 404 tells them nothing and, worse, may read as 'no rescue plan required here'. This is also the single most likely UAT finding and the most likely real-world incident-report line item ('the safety system showed an error'). It costs almost nothing to specify now and is embarrassing to retrofit. Related: Dev Pack §8.2 makes 'active / inactive status' a first-class context field but never defines the inactive behaviour.

#### Evidence

ADM-023/SCP-047 (MUST): 'Deleting will remove the site completely, QR codes will not work and workers assigned in site will be updated as on bench.' Dev Pack §8.2 lists 'active / inactive status' as a required context-model field with no stated semantics. Dev Pack §8.3 makes the Rescue Plan a core destination for exactly this physical position ('a QR code positioned at a confined space entry point'). Nothing in any document defines the unresolvable-code, inactive-code or deleted-site scan response.

#### Options

1. Generic 404 / 'Page not found'. Zero build, worst outcome at a barrier.
2. Branded 'This code is no longer active' page with the last-known site name and a generic emergency instruction ('Do not rely on this code — contact your site supervisor before entry'), plus a 'Report this code' action.
3. Soft-delete only: deleting a site archives it; the QR still resolves and shows the last-known Rescue Plan clearly stamped 'ARCHIVED — verify with your supervisor before use'. Never shows a dead end.
4. Option 2 plus an admin alert: scans of inactive/unknown codes are logged and surfaced in the admin console so SafeIn5 knows a stale sticker is still in the field.

#### Recommendation

Option 2 plus Option 4's logging. Never show a bare 404 from a QR route. Do NOT choose Option 3 — serving a stale rescue plan is a worse safety failure than serving none, because it is confidently wrong. Also change ADM-023's semantics: site deletion should soft-delete (retain the row, mark inactive) rather than hard-delete, because hard-deleting a site with signals attached destroys safety records and breaks the GDPR retention story in the Talentica NFRs. That schema decision belongs in M2, before signals exist.

---

### 29. rescue-plan-content-model

> **Severity:** MEDIUM  |  **Blocks:** M3

#### Question

Narrow to two limbs, and lead with the vendor's proposed default so the client only has to confirm or overrule:

"Rescue Plan — two things we can't decide for you.

(a) Content supply and sign-off. Dev Pack §8.5 requires a working Rescue Plan route and §8.6 assumes rescue content sits behind the confined-space QR, but no document says who writes it or who signs it off. CQA-010 commits SafeIn5 to seed Learn5 content and is silent on rescue content. For the ~30 pilot QR mappings, who supplies the rescue plan text — SafeIn5, the pilot site's safety lead, or is existing site documentation being converted? And does a named person have to approve it before it goes live, or is admin-console publication sufficient?

(b) Expired review date. §8.3 requires 'version / review date' on the page, which means we are publishing a currency claim about emergency procedure content. ADM-020's authoring requirement ('text fields') has no such field, so there is currently no way to capture it. Our proposed default: capture review date as a required field when a rescue plan is published; once it passes, still display the plan in full but with a prominent 'review date passed — verify with your site lead' banner, and flag it in the admin console. We do not propose to withhold an emergency procedure from a worker standing at a confined space entry. Please confirm you accept that position, or tell us if an expired plan must be suppressed.

For clarity on what we are NOT asking: we will implement §8.3's six items as discrete fields (which also satisfies ADM-020), and we are treating full version history as out of MVP given WRK-006/SCP-006 is SHOULD-priority — publish-in-place with a review date only. Say so if either of those is wrong."

#### Why it matters

Dev Pack §8.3 mandates 'version / review date' on the Rescue Plan page, which means SafeIn5 is deliberately surfacing a currency claim about emergency procedure content — and a system that displays an out-of-date confined-space rescue procedure as if current is a liability exposure for both SafeIn5 and the client. Yet ADM-020 describes authoring as 'Add details of learn 5, take 5, rescue plan though text fields' — free text with no version or review-date field at all. The two are incompatible. Additionally, if the plan is free text, none of Dev Pack §8.3's six required fields can be individually rendered or validated, and the admin console has no way to prompt for a review date.

#### Evidence

Dev Pack §8.3: 'The Rescue Plan page must include: location / asset, immediate actions, roles and responsibilities, required equipment, escalation contacts, version / review date.' ADM-020/SCP-044 (MUST): 'Add details of learn 5, take 5, rescue plan though text fields.' WRK-006/SCP-006 (SHOULD): 'Rescue information is valuable but should not dominate the MVP. Include it where content is available and simple to manage... contextual supporting information, not the primary innovation.' CQA-010 says SafeIn5 provides initial Learn5 content but is silent on rescue plan authorship. Talentica Slide 7 step 3: 'Rescue plan provides task-specific emergency response procedures, roles, contacts and required equipment.' No document states who approves it or what an expired review date does.

#### Options

1. Free text only (per ADM-020): one rich-text block, no structure, no version, no review date. Cheapest; contradicts Dev Pack §8.3 and must be signed off as a deviation.
2. Structured record with Dev Pack §8.3's six fields, version string and review_date. Display always; show a visible 'Review overdue — verify with your supervisor' banner when review_date < today. Never blocks.
3. Structured as 2, but an expired plan is withheld and replaced by 'This rescue plan is overdue for review — contact your supervisor'. Fail-safe, but removes information in an emergency.
4. Structured as 2, plus a light approval step: plans have draft/published states and a named approver recorded, with edits creating a new version.

#### Recommendation

Option 2, and get written confirmation that SafeIn5 (not Talentica) owns rescue plan content accuracy and that each pilot client's own safety lead is the author/approver of record. Never withhold emergency content because of a stale date — Option 3 optimises for liability at the cost of the worker at the barrier, which inverts the product's purpose. The overdue banner discharges the currency duty honestly. Option 4's approval workflow is real governance value but belongs in Phase 2 alongside the full Dev Pack §7 state machine (already deferred in PRD §5.4). This also requires ADM-020 to be re-specified from 'text fields' to a structured form, which is an M3 admin-console scope item.

---

### 30. qr-scan-analytics-definition

> **Severity:** MEDIUM  |  **Blocks:** M3

#### Question

Corrected restatement: "'QR Scans / Context Journeys' is a MUST success metric (Success Metrics sheet; the Tenderer Response column is blank) but is nowhere defined, and per WRK-003 / PRD §4 the QR path is fully unauthenticated, so there is no identity to count against. Two decisions we need from SafeIn5 rather than assuming: (1) Definition — is a 'context journey' counted at QR resolution (server-side, on /q/<code> resolving to a valid context) or only on a completed PULSE / Learn5 view? And must the metric report unique people/devices, or is event volume per QR context sufficient? We propose counting server-side resolution events plus completed journeys as two separate figures, de-duplicated by a short-window server-side heuristic and filtered for bots/prefetchers — that is our engineering call unless you object. (2) Consent — reporting 'unique scanners' requires a persistent per-device identifier on unauthenticated UK visitors, which under PECR/UK GDPR is not exempt from consent for analytics purposes, and our proposed stack (Slide 19: Microsoft Clarity, Mixpanel) includes session replay that would capture pages rendering client operational photography. Please confirm whether third-party telemetry is approved on the unauthenticated QR path and who owns that sign-off. If a consent banner is unacceptable on the fastest path in the product — which we assume it is, given the <60s and zero-friction NFRs — we will build cookieless first-party event counting and the metric will report journeys, not unique scanners. Confirm that is acceptable evidence for the MUST metric." (Note: the original question's claim that this is "explicitly named in QA-003" is right, but QA-003 is a SafeIn5 response to a tenderer question, not a requirement ID — cite the Success Metrics sheet and CQA-016 as the binding MUSTs.)

#### Why it matters

This metric is one of the eight MUST success metrics the pilot is judged on and is explicitly named in QA-003. If it counts raw HTTP hits, the number is inflated by refreshes, prefetchers, link previews and crawlers, and SafeIn5 presents a corrupted adoption figure to investors. If it needs a stable per-device identifier for unique counts, that identifier is a cookie/localStorage value set on unauthenticated EU visitors — which under PECR/GDPR is only exempt from consent if strictly necessary, and analytics identifiers are not. The Talentica stack already includes Microsoft Clarity and Mixpanel, both of which set third-party-ish identifiers and, in Clarity's case, record session replays — on a page that may display a client's operational photography. Deciding this after M4 means either a metric SafeIn5 cannot defend or a consent banner bolted onto the fastest path in the product.

#### Evidence

Success Metrics sheet: 'QR Engagement | QR Scans / Context Journeys | Evidence that QR contextual workflow is being used in corporate environment | MUST'. CQA-016 (MUST): 'MVP should capture adoption, active users, repeat usage, signal submissions, QR usage, Learn5 engagement.' QA-003 lists 'QR scans by site/sub-site/task area'. WRK-003 (MUST) makes the scanning user unauthenticated by design. Talentica NFRs: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies' (Slide 14); tech stack: 'Usage Metrics – Telemetry Capture | Microsoft Clarity, MixPanel' (Slide 19). Nothing defines a scan event or addresses consent for unauthenticated telemetry.

#### Options

1. Count server-side resolution events only (one row per /q/<code> resolve), de-duplicated by a first-party, http-only, short-lived (e.g. 12h) rotating identifier. Report both raw and de-duplicated. No third-party analytics on the guest QR path.
2. Count only 'qualified' journeys — a scan is counted when the worker reaches the PULSE screen or a destination, not on the bare GET. Undercounts, but is defensible and bot-resistant.
3. Use Mixpanel/Clarity client-side identifiers for QR scan counting, behind a consent banner shown on first scan.
4. Count scans only for authenticated users; guest scans are counted as an anonymous aggregate with no unique-user dimension.

#### Recommendation

Option 1 combined with Option 2's qualification rule: log a server-side `qr_scan` event on resolve, and a separate `context_journey_started` event on first destination render, and report both. Keep the guest QR path free of Clarity and Mixpanel entirely — Clarity session replay on a page that can render corporate site content is a data-protection problem that has nothing to do with analytics value, and a consent banner on the primary entry point is directly hostile to the sub-60-second target. Confirm with SafeIn5 whether a first-party de-duplication cookie on unauthenticated EU visitors is acceptable under their DPIA, because if it is not, 'unique scanners' is not a metric the MVP can report and the success criterion must be reworded to 'scan events' before UAT.

---

## E. Identity, Auth, Privacy & GDPR

### 31. three-access-modes-capability-matrix

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Tighten to the decision the client actually reserved, and drop the "three modes" framing and the RLS-rebuild claim:

"WRK-003/SCP-003 is Approved as a MUST but explicitly defers one point to Discovery: 'whether all signal submissions must be linked to a named worker or whether limited guest submissions are acceptable.' We need that decision now — it is an M2 foundation item. Please sign off the following four rules:

1. Unauthenticated device scanning a Corporate site QR — may it read that site's Behaviour Signal feed, or only the static site context (PULSE prompts, Rescue Plan, Learn5)? No source document states this and it is a tenant-data-exposure risk across the three pilot organisations.
2. May an unauthenticated device submit a Behaviour Signal to a Corporate site feed, or must Corporate submission be tied to an invited, site-assigned account?
3. May an unauthenticated device submit to the Community feed, or does Community submission require self-registration (email OTP / magic link)?
4. If guest submission is permitted anywhere, confirm those signals are anonymous by definition — guests have no account to hold the account-level anonymity setting recorded in PRD §5.5.

Note the tender pack is internally inconsistent here: WRK-001's Functional Description says 'No sign up feature… user access will be given to specific users by admin', while WRK-001's own Community Requirement and WRK-003 require self-registration and/or guest access. We are proceeding on the working assumption 'guest reads, account writes' (PRD §5.6) and will build to it unless you direct otherwise before M2 starts."

#### Why it matters

The three source documents contradict each other on this and the PRD's answer ('guest reads, account writes') is marked 'assumed from recommendation — confirm at Discovery'. Auth mode count drives the session model, the RLS predicates, the feed query layer and the entire M2 foundation. If the answer changes after M2 the tenancy/RLS layer is rebuilt, which is the single most expensive rework item in a GBP 45k fixed-price build.

#### Evidence

WRK-001 Functional Description: 'No sign up feature as this is a SAAS application, user access will be given to specific users by admin.' WRK-001 Community Requirement contradicts it: 'Community access should support self-registration and/or guest access.' WRK-003 is MUST and Approved: 'No Requirement of any credentials, app will directly show content.' WRK-002 tenderer note: 'as per our MVP there is no use of login in worker side because anyways we are giving guest access so any non worker can also access this if they got link of website.' SCP-003 Corporate column defers the key point: 'corporate signal submission may require known-user or assigned-user context depending on pilot rules.' Talentica proposal Slide 13 lists 'Bulk user import / CSV provisioning (Community self-registration is in scope)'. PRD §5.6 flags itself as unconfirmed.

#### Options

1. A) Guest = read-only everywhere (Community feed + QR content + Corporate QR content). Community User = read + submit to Community feed only. Corporate Worker = read + submit within assigned org/site only.
2. B) As A, but Guest may also submit to the Community feed (fully anonymous, rate-limited by IP/device) — maximises adoption but opens an unauthenticated write endpoint.
3. C) Guest can view QR-delivered safety content (PULSE / Rescue Plan / Learn5) only — no feed access at all without an account.
4. D) Drop Guest write and Community self-registration from MVP; Corporate invitation-only, with Community deferred to Phase 2.

#### Recommendation

Option A. It satisfies WRK-003 (the safety-critical QR→Rescue Plan journey never sits behind a login), preserves Corporate governance and attribution, and avoids an unauthenticated write endpoint that would need abuse defences the MVP budget does not carry. Explicitly note that Option A means a member of the public cannot report the open manhole in Dev Pack Community Scenario 1 without registering first — SafeIn5 must accept that adoption cost or choose B and fund moderation.

---

### 32. role-taxonomy-enumeration

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Confirm a closed list of MVP roles AND their data scope. Proposed: (1) Guest — unauthenticated, read-only via QR/feed (per PRD §5.6 "guest reads, account writes"); (2) Community User — self-registered, Community tenant only; (3) Corporate Worker — invited, scoped to assigned site(s)/sub-site(s); (4) Supervisor / Site Lead — worker rights plus acknowledge and close, per PRD §5.4; (5) Org Admin — one organisation, all its sites, admin console; (6) SafeIn5 Platform Admin — cross-tenant, creates organisations and their first Org Admin, plus Community moderation per ADM-031–034.

Three sub-questions that must be answered with it, because the documents conflict:
(a) Does anyone employed by a pilot organisation hold admin rights in MVP, or does SafeIn5 administer all three pilot orgs itself? ADM-001 says admin login is required "for corporate administrators and site safety leads", but the Community column says "Community administration is SafeIn5 internal only for MVP" and QA-004 has SafeIn5 running QR and site setup with the client site rep. If SafeIn5 administers everything, role (5) may collapse into role (6) for MVP.
(b) Is Supervisor scoped to their site(s) or to the whole organisation? QA-006 states "supervisor/admin visibility across assigned organisation", which contradicts a site-scoped supervisor.
(c) Can a worker be assigned to more than one site? ADM-019 offers only "workers who are not assigned to any other site" when building a site (one site per worker), while WRK-016–018 require workers to move between sites/sub-sites and rescan QR. Role scope cannot be specified until this cardinality is fixed.

Also confirm no seventh role is expected in MVP — specifically that Community moderation is performed by role (6) and not a separate Moderator, and that QA-006's "advanced permissions and enterprise governance" (custom roles, delegated permissions) stays Phase 2.

#### Why it matters

No document enumerates roles anywhere. 'Role-based access control' is asserted in three places without a single role name, and Talentica's own persona slide lists only three personas — omitting Org Admin and Community User entirely. RBAC is built in M2; every permission check, every RLS policy and every admin screen depends on the enumeration. Adding a role after M2 touches the schema, the JWT claims, the guards and every list/filter endpoint.

#### Evidence

Dev Pack §5 System: 'Role-based access' (no roles named). Dev Pack §7 Lightweight Admin Panel lists 'User management' with no roles. Talentica Slide 5 lists only three personas: 'Frontline Worker / Technician', 'Supervisor / Site lead', 'SafeIn5 Platform Administrator'. Slide 17 Security & Access Layer: 'Authorization, Identity Management, Roles, Tenancy' — unenumerated. ADM-001 covers 'corporate administrators and site safety managers' as if one role; QA-005 requires 'Create/manage users and assign role/site access' without listing roles; QA-006 defers 'Advanced permissions and enterprise governance' to a future phase. No requirement ID names a role.

#### Options

1. A) Approve the six-role list as proposed.
2. B) Six roles, but collapse Supervisor and Org Admin into a single 'Site Manager' role for MVP (pilot orgs have 3 sites each, so the distinction may be academic at pilot scale) — cheaper, but re-splitting later is a migration.
3. C) Six roles plus a seventh 'Community Moderator' distinct from SafeIn5 Platform Admin (see the moderation finding).
4. D) A generic role+permission table (fully configurable RBAC) rather than fixed roles — flexible but materially over-engineered for a 50-60 user pilot.

#### Recommendation

Option A, implemented as fixed enum roles rather than a configurable permission matrix (D is out of proportion to a 50-60 user pilot, and QA-006 explicitly defers 'advanced permissions' to a future phase). Keep Supervisor and Org Admin distinct from day one — they differ on cross-site visibility, which is a data-access boundary, not a UI difference, and merging them makes the RLS policy wrong rather than merely coarse.

---

### 33. deanonymisation-permission-matrix

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

The question is directionally right; tighten it to make it answerable and to cover the two extra contradictions:

"MVP anonymity: is the author link destroyed at write time, or retained and hidden? Please decide the target state and the disclosure text.

1. For each role, state whether the identity behind an anonymous Behaviour Signal is retrievable in the MVP (yes/no), and if yes, through what route (UI, export, audit log, direct DB):
   (a) Supervisor / Site Lead; (b) Org Admin; (c) SafeIn5 Platform Admin; (d) Talentica engineers or any operator with production database access; (e) under legal compulsion — HSE investigation, court order, or a police request.
   Note on (d): if the author FK is merely nulled/masked rather than never written, anyone with prod DB or backup access can resolve it regardless of application-layer controls. If the answer to (a)-(c) is 'no', that is only true if the link is never persisted.

2. ADM-031 specifies the admin signal-detail view shows 'worker profile', and ADM-032 / SCP-056 allow filtering by 'worker'. What exactly do these render for an anonymous signal — omitted entirely, a stable pseudonymous handle, or the real profile? A stable pseudonym is itself re-identifying across a 50-60 user pilot.

3. Dev Pack §15.4 requires 'anonymous AND confidential reporting modes' as two things. Are these two distinct modes in MVP, and if so what is the difference? (If 'confidential' means identity retained but access-restricted, say so — that is a materially different promise.)

4. Dev Pack §15.7 Scenario 4 requires abuse/duplicate detection and 'anonymous mode should not enable harassment' on the Community tenant. If the author link is destroyed, how is a repeat abusive anonymous reporter to be stopped? (Options: device/account-scoped rate limits, a one-way hash usable only for equality matching, or accept that anonymous abuse is unmoderatable in MVP.)

5. Supply the exact worker-facing sentence(s) the app will display at the anonymity toggle and in onboarding, reflecting the true answer to (1). This wording needs sign-off from whoever owns the client's GDPR position — please confirm who that is.

Flag: the Dev Pack §7 'stripping user metadata at the DB level' and Talentica Slide 18 'non-reversal by the admins... not part of MVP' are in direct conflict, and PRD §5.5 contains both positions in the same section. We need one answer before the M2 schema is cut — this is a write-time property and cannot be retrofitted in M4 when anonymous reporting is scheduled."

#### Why it matters

This is the single highest-stakes trust decision in the product. Talentica's own Slide 18 already concedes that MVP anonymity is not true anonymity: 'True anonymity will require masking of location, non-reversal by the admins etc. which is not considered as a part of MVP.' If any role can resolve identity and workers are told 'anonymous', workers will eventually find out and the platform is finished at that site — Dev Pack §15.3 asks 'Why would workers trust the platform?' and this is the answer. Conversely, if identity is genuinely destroyed at write time, the schema must be built that way in M2; it cannot be retrofitted in M4 when 'Anonymous reporting' is scheduled.

#### Evidence

Dev Pack §7 Storage: 'Anonymity must be handled by stripping user metadata at the DB level when the "Anonymous" flag is active.' Talentica Slide 18 Anonymity row: 'Anonymity is enforced at the data layer for MVP purposes and masked in audit logs. True anonymity will require masking of location, non-reversal by the admins etc. which is not considered as a part of MVP.' These two are in direct tension: 'stripping' implies irreversible, 'masked… non-reversal not in MVP' implies reversible. ADM-031 gives feed management sight of 'worker profile' on a signal; ADM-032/SCP-056 allow filtering by 'worker'. PRD §5.5 restates the tension and says 'administrators may retain technical means of correlation. This must be stated honestly to pilot workers' — but names no role.

#### Options

1. A) Irreversible: on submit with anonymity active, the signal row stores no user FK and no device/IP; the link is never written. Nobody — including Talentica with DB access — can resolve it. Geolocation and EXIF also stripped on anonymous signals.
2. B) Reversible by SafeIn5 Platform Admin only, never by the client org (Supervisor/Org Admin see nothing), with every de-anonymisation written to the audit log, and the in-app wording changed from 'Anonymous' to 'Hidden from your employer'.
3. C) Reversible by Org Admin (client-side) — maximum governance, minimum trust.
4. D) Two modes offered to the worker at submit: 'Anonymous' (irreversible, per A) and 'Confidential' (identity held by SafeIn5 only, per B), matching Dev Pack §15.4's phrase 'Anonymous and confidential reporting modes'.

#### Recommendation

Option A for MVP, with the in-app label kept as 'Anonymous' only if A is implemented. Option A is cheaper than B (no key management, no de-anonymisation audit flow), it is the only option consistent with Dev Pack §7's word 'stripping', and it is the only one that survives a worker asking 'can my boss find out?' with a clean yes/no. If SafeIn5 wants B or C, the app copy must change to 'Hidden from your employer' and workers must be told at induction — do not ship the word 'Anonymous' over a reversible link. Note that A forecloses the anonymous follow-up question in the next finding; that trade must be made consciously.

---

### 34. cross-site-and-cross-org-visibility-rules

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Trim to the three genuinely undecided points and state the rest as assumptions for confirmation rather than as questions:

"We will build the following as the default read model unless you tell us otherwise: a Corporate worker sees only the feed of the site(s) they are assigned to; a Supervisor and an Org Admin see all sites within their own organisation and never any other organisation (per QA-006 and QA-002). Three points that document does not settle, and that we must fix before Milestone 2 because they become the row-level-security predicates behind every feed, search, dashboard and export:

1. Community feed inside the Corporate app. WRK-024 defines the outbound rule — corporate content must not reach the Community feed — but not the inbound one. Can a Corporate worker read the general Community feed from within the Corporate experience? And where corporate learning is later shared outward, who is the approver (site lead, org admin, or SafeIn5 Ltd) and is that an in-product approval action we must build in Phase 1, or a manual process outside the system?

2. ADM-019 contradicts WRK-015/016. ADM-019 offers only 'workers not assigned to any other site', implying one site per worker; WRK-015/016 require workers to move between sites and task zones. Is site assignment one-to-one or many-to-many? This sets the cardinality of the assignment table and therefore the predicate itself.

3. The 'on bench' state. ADM-023 puts workers on bench when a site is deleted, and ADM-022/028 allow assignment removal and blocking. What may an on-bench or unassigned user read — nothing, their own past signals only, or the historical feed of the site they have left? Our default will be: no access to any site feed, with their own submitted signals still visible to them, unless you require otherwise."

#### Why it matters

These are the RLS predicates. They are written in M2 and every feed, search, dashboard and export query inherits them. Getting (b) wrong in either direction is the worst case: block it and the Community adoption engine is invisible to the exact industrial users it targets; allow it carelessly and Corporate content leaks into the public Community feed, which WRK-024 explicitly forbids. Getting (e) wrong leaves a leaver with continuing access to a client's safety data.

#### Evidence

WRK-013/SCP-013 Corporate: 'Required in a simple hierarchy: Organisation > Site > Sub-site/Area/Asset/Task Zone' — hierarchy defined, visibility rules not. WRK-024 Corporate: 'Corporate feed remains private/site-based; selected anonymised learning may later be shared if permitted.' WRK-024 amendment: 'it must not expose corporate/client content unless explicitly approved' — 'approved' by whom, and by what mechanism, is undefined. QA-006 Phase 1: 'Site-based feed visibility with supervisor/admin visibility across assigned organisation' — the only visibility statement in any document, and it covers only supervisors/admins. ADM-023: deleting a site means 'workers assigned in site will be updated as on bench' — an unassigned state exists, with no stated read scope. ADM-019: 'List of workers who are not assigned to any other site' implies one site per worker; WRK-015/016 assume workers move between sites.

#### Options

1. A) Strict: worker sees only currently-assigned site(s); one-way Community read (Corporate users can read Community, Community can never read Corporate); on-bench workers see Community only; org boundary absolute.
2. B) Org-wide read for workers within their own org (any site), Community read allowed, org boundary absolute. Better lateral learning, weaker confidentiality.
3. C) Strict per A, but with an explicit per-signal 'Share to Community' action available to Org Admin only, that copies an anonymised, de-contextualised version to the Community feed — implements WRK-024's 'unless explicitly approved'.
4. D) No Community feed visible from within a Corporate tenant at all during MVP (fully separate experiences).

#### Recommendation

Option A plus C's explicit share action, with the share action's scope limited to Org Admin and the copied record stripped of org name, site name, asset ID and geolocation. A alone satisfies confidentiality; C is what makes WRK-024's 'unless explicitly approved' actually implementable rather than aspirational. Also confirm explicitly that a worker can be assigned to MULTIPLE sites — ADM-019's wording implies one, WRK-015/016 imply many, and this single point changes the assignment table from a column to a join table.

---

### 35. controller-processor-and-dpa-structure

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Suggested tightening, keeping the same ask: (a) the Dev Pack also lists "Consent and visibility control" as an MVP system capability (§5 System list) with no definition — cite it, since it is the closest thing to a requirement ID and shows consent was expected in the build, not deferred to M4; (b) drop the implication that Milestone 4 is the only GDPR touchpoint and instead state that the M2 registration flow is the real deadline; (c) add the unresolved conflict as part of the question: given anonymity is enforced by stripping user metadata at the DB layer and "true anonymity" (non-reversal by admins) is explicitly out of MVP scope, does the client expect anonymous signals to remain within a worker's SAR/erasure scope — and if so, what reversible link is permitted to exist? (d) ask for the concrete parameters the answer must yield, not just the labels: retention period per dataset (Community accounts/signals, Corporate accounts, Corporate signals and media, telemetry), who is the named SAR recipient of first contact, and target response SLA.

#### Why it matters

GDPR compliance is a named M4 deliverable and 'export, delete, and retention policies' is a stated NFR, but neither is buildable without knowing who the controller is. If SafeIn5 is controller for Community and processor for Corporate — the likely answer — the platform needs TWO different consent/notice flows, two different retention regimes, and a SAR route that can produce a per-tenant export scoped to a single client's controller rights without leaking other tenants' data. Discovering this at M4 means rebuilding consent capture that should have shipped in M2 with registration.

#### Evidence

Talentica NFR table, Data Residency & Privacy: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies.' Milestone 4 key activities include 'GDPR compliance' as a single line item with no definition. Dev Pack §7 Requirements: 'Security and GDPR compliance.' Dev Pack §15.4: 'Data handling must comply with GDPR and Corporate privacy requirements.' Document Control names 'Owner | SafeIn5 Ltd'. QA-006 anticipates '3 UK client organisations'. No document names a controller, a processor, a DPA, a privacy notice, a SAR process or a DPO. There is no requirement ID for any of it.

#### Options

1. A) SafeIn5 Ltd is controller for Community data and processor for Corporate data; each pilot org signs a DPA with SafeIn5 as processor; SARs for Corporate workers go to the pilot org, who instruct SafeIn5 to extract.
2. B) SafeIn5 Ltd is controller for everything, including Corporate worker data (simpler for SafeIn5, but pilot orgs' own legal teams will likely refuse, since they select and direct the workers).
3. C) Joint controllership for Corporate data — requires an Art. 26 arrangement; more paperwork, no build benefit.
4. D) Defer the legal structure past MVP and pilot under a short data-sharing letter; build a generic per-user export/delete endpoint that serves either model.

#### Recommendation

Option A, decided before M2 so that registration/invitation can present the right privacy notice from the first login. Build the technical capability as in D — a per-user export and a per-tenant export, both usable by either party — but do not let the legal structure stay undecided; the consent screen text and the DPA are M1/M2 dependencies, and SafeIn5 (not Talentica) must supply the privacy notice and DPA template. Flag that the 45k fixed price contains no legal drafting.

---

### 36. erasure-vs-append-only-audit-conflict

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Suggested restatement (narrower, drops the vendor-side sub-question, cites the stronger evidence):

"SCP-052 'Delete/Block User' is a MUST and SCP-058 'Delete observations' a SHOULD, but neither row defines what deletion means, and no document states a retention policy. As data controller, please confirm the intended behaviour when a worker leaves, is deleted, or exercises a UK GDPR erasure request:
(a) do their already-published Behaviour Signals stay in the feed re-attributed to 'Removed user', or are they withdrawn entirely — noting the learning value of the feed argues for retention;
(b) are their attached photos/voice notes (which may contain their face or voice) deleted, or retained with the signal;
(c) what happens to supervisor comments or classifications that quote or name them;
(d) what retention period applies to signals and to audit records after a user is removed?

We will hold audit rows against internal user IDs rather than names so that identity can be pseudonymised in place while the audit chain stays intact — no client input needed there. What we do need is (a)–(d), because they determine the media and signal schema in Milestone 2, whereas Talentica's plan currently schedules 'GDPR compliance' in Milestone 4."

#### Why it matters

Both commitments appear in the SAME sentence of Talentica's NFR table and they cannot both be absolutely true. If this is not resolved before M2, the audit table is designed one way and rebuilt in M4 when 'GDPR compliance' comes due — and the wrong answer here creates a live legal exposure with a real regulator, not a theoretical one. It also determines whether audit log rows store a user name (immutable, un-erasable) or a user ID (dereferenceable, erasable) — a schema decision made on day one.

#### Evidence

Talentica NFR, Data Residency & Privacy, single cell: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies. Anonymity enforced at database layer, tenant-based isolation between Community and Corporate data. Append-only audit logging enabled.' Dev Pack §7 Corporate Workflow Rules: 'Each state change logged… Full audit trail maintained.' Dev Pack §7 Objects includes 'Audit Log'. ADM-031 amendment: 'Editing worker observations should be controlled and auditable.' No document acknowledges the tension or states an erasure procedure.

#### Options

1. A) Audit logs reference user_id only (never a denormalised name or email); erasure nulls the user record and the audit rows survive with an unresolvable ID. Append-only preserved, personal data erased.
2. B) Erasure hard-deletes audit rows for that user — satisfies erasure literally, destroys the audit trail, and breaks the workflow state history.
3. C) Crypto-shredding: personal fields are encrypted per-user; erasure destroys that user's key, rendering audit content unreadable but rows intact. Elegant, but key management is real work in a fixed-price MVP.
4. D) Erasure anonymises the user (name/email/phone replaced with a tombstone), signals remain in the feed attributed to 'Removed user', and media is deleted only where the requester is identifiable in it.

#### Recommendation

Option A combined with D: audit rows carry only user_id, erasure tombstones the user record, and signals remain in the feed as authored by a removed user. This satisfies erasure (no personal data remains resolvable) without destroying the safety record or the audit chain, and it costs nothing extra IF the decision is made before the schema is written in M2. Option C is the technically superior answer but is not proportionate to this budget. Separately confirm the policy for (c) — a third party's face inside another worker's photo is an erasure request the platform cannot satisfy without manual media review, and Talentica has explicitly excluded 'Automatic face-blurring' from scope (Slide 13).

---

### 37. microsoft-clarity-session-replay-risk

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Ask instead, as one question covering the whole third-party surface:

"The proposed stack introduces several third-party services that will process worker personal data: Microsoft Clarity and Mixpanel (Slide 19, 'Usage Metrics – Telemetry Capture'), an unnamed speech-to-text provider for voice notes, Sentry for error reporting, and SES/SendGrid for magic-link email. None of these are mentioned in the Dev Pack or Tender Pack, and the proposal's only privacy commitment is the NFR 'EU-based data residency with GDPR compliance… Anonymity enforced at database layer.'

(a) As data controller, please confirm which of these sub-processors are approved, or tell us the approval route (DPIA, client legal review, corporate pilot customers' own privacy sign-off) and the lead time, so it lands before Milestone 4 rather than during UAT.
(b) Specifically on Clarity: its primary function is session recording, which would capture the rendered capture flow — camera preview of an identifiable colleague, transcribed voice note text, worker names in the feed, and site/asset identifiers — and would let an 'anonymous' submission be tied back to a session. Every metric you specified in QA-003 (active users, signals submitted, repeat usage, QR scans by site, category split, Learn5 completions, review activity) is countable server-side from our own event outbox. Unless you positively want replay, our recommendation is to drop Clarity and instrument these server-side, keeping zero worker content in a third-party analytics tool. Please confirm.
(c) For whichever providers survive, please confirm the required data-residency position (EU-only processing vs. permitted US transfer under SCCs), since that determines provider choice for transcription and email in particular."

#### Why it matters

Session replay on this specific product is a materially higher risk than session replay on a marketing site. A replay of the capture flow can contain a photograph of an identifiable colleague, a transcribed voice note naming a person or a hazard, and the exact site and asset. That is third-party processing of special-category-adjacent data, sent to Microsoft, on a platform whose entire proposition is that workers can report without being watched. It also directly undermines the anonymity promise — a replay of an anonymous submission ties the session to the content. Clarity's data residency and its US-transfer position must be confirmed against the 'EU-based data residency' NFR.

#### Evidence

Talentica Slide 19, Application Tech Stack: 'Usage Metrics – Telemetry Capture | Microsoft Clarity, MixPanel.' Talentica NFR: 'EU-based data residency with GDPR compliance.' Talentica Slide 18: 'Collect metrics such as active users, PULSE completion rates, SIGNAL Captures per user, Feed interactions, QR Scan frequency, and Anonymous usage.' CQA-016 requires adoption metrics. QA-003 lists the required metrics — all of which are countable server-side. No document mentions session replay, screen recording, DPAs with Microsoft or Mixpanel, or sub-processor approval. Dev Pack §15.1: 'SafeIn5.ai is not a surveillance or disciplinary platform.'

#### Options

1. A) Drop Clarity entirely. Serve QA-003's and CQA-016's metric list from server-side events (the Intelligence Layer event outbox on Slide 17 already emits them) plus Mixpanel for funnels. No screen recording anywhere.
2. B) Keep Clarity but disable session replay, using heatmaps only — still ships DOM content to Microsoft; partial mitigation only.
3. C) Keep Clarity with aggressive masking (mask-all text, exclude the capture and feed routes entirely) — reduces risk but relies on masking config never regressing, on a product where one regression exposes worker faces.
4. D) Keep Clarity for the Community tenant only (public users, lower sensitivity) and never load it in a Corporate tenant.

#### Recommendation

Option A. Every metric QA-003 asks for — active users, signals submitted, repeat usage, QR scans, category split, Learn5 views, supervisor review activity — is a server-side count that the proposed transactional outbox already produces. Clarity adds a US-based sub-processor, a data-residency exception, a DPA, a consent banner and a live anonymity contradiction, in exchange for UX heatmaps that a 50-60 user pilot with direct worker interviews (QA-003 explicitly plans 'on-ground interviews') does not need. Apply the same test to Mixpanel and Sentry: confirm EU data region, DPA in place, and PII scrubbing before either is enabled.

---

### 38. session-ttl-and-shared-device-signout

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Replace with a narrower, client-answerable version:

"PRD §5.6 requires an account to submit a Behaviour Signal (QR viewing, PULSE, Rescue Plan, Learn 5 and the feed stay unauthenticated), and §5.5 keeps signals resolvable to an author even when the anonymity flag is set. That combination makes device sharing a data-protection question we need your input on.

(a) At the 3 pilot sites, are the company-issued rugged devices assigned 1:1 to a named worker, or are they shared/pooled and picked up by whoever is on shift?

(b) If any are shared, what is the expected handover behaviour when worker B picks up a device worker A signed into — an explicit 'end shift' / 'not me' action, an idle timeout, or re-identification on the next QR scan? We need a rule we can build to, because otherwise B's signals are attributed to A, and in an anonymity-flagged submission that mis-attribution is personal-data exposure, not just a bad statistic.

(c) Is there an existing site or IT policy on unattended-device lock or maximum session length that the pilot orgs' security teams will hold us to, and should this be reflected in the DPA?

We will set the actual token lifetimes and refresh/revocation mechanics ourselves and document them in the security section — we only need the shared-device policy above, and any hard limit your pilot clients' IT already impose."

#### Why it matters

A worker who must re-authenticate at the start of every shift will not use the product — that alone can sink repeat usage, the stated primary success metric. But a 90-day refresh token on a shared rugged device means whoever picks the device up submits signals as the last user, which corrupts attribution and, in an anonymity-sensitive product, could expose one worker's identity on another's signal. This is a security-posture decision that pilot client CISOs will ask about, and it needs to be in the DPA discussion, not discovered at UAT.

#### Evidence

Talentica tech stack: 'Custom magic-link + email OTP + JWT; bcrypt for admin passwords' — no TTL, refresh, or revocation semantics stated anywhere. SafeIn5.md Device: 'Personal mobile phone or company-issued rugged device' — both are in scope. Talentica Slide 6 repeats 'Personal Mobile Phone or Company issued rugged device'. Dev Pack §4 mandates WhatsApp-grade friction. No requirement ID anywhere covers session lifetime, idle timeout, device binding or remote revocation.

#### Options

1. A) Access token 15 min / refresh token 90 days sliding, no idle timeout, sign-out only on explicit action or admin block. Optimises adoption; weakest on shared devices.
2. B) Access 15 min / refresh 30 days sliding for personal devices; a separate 'shared device' flag on the user or device that forces a 12-hour absolute session and shows a persistent 'You are signed in as X — not you?' banner.
3. C) Access 15 min / refresh 7 days for all users — corporate-friendly, but forces weekly re-auth and therefore weekly email/OTP round trips in a low-signal environment.
4. D) Device-bound long-lived session (refresh token pinned to a device fingerprint) with immediate server-side revocation on admin block.

#### Recommendation

Option B, plus server-side refresh-token revocation on user block/delete (needed anyway for ADM-028 Delete/Block User and for GDPR erasure). B is the only option that acknowledges the shared-device reality already stated in the persona. Confirm at Discovery whether any pilot org has a written maximum session policy — if one does, it becomes a hard constraint and B's TTLs move.

---

### 39. lawful-basis-for-worker-data

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Two fixes to the ask.

1. Controller/processor split is unstated and must be settled first. In the Corporate model the pilot employer organisations (3 orgs x 3 sites) are almost certainly the controllers for their workers' data and SafeIn5 the processor — in which case SafeIn5 does not choose the basis or own the LIA, it must instead supply Art.28 processor terms plus the technical means for whichever basis each org asserts. In the Community tenant SafeIn5 is plainly the controller in its own right, and the basis there is likely different (no employment relationship, so consent is viable). The question as written assumes a single basis and a single accountable party across both operating models; it should ask about both tenancy models separately.

2. Split the special-category point out. Voice recordings and free-text signal content about unsafe conditions can carry Art.9 health data and near-miss/injury detail; that needs an Art.9(2) condition on top of the Art.6 basis and is a different answer from geolocation.

Suggested restatement: "For each operating model — Community and Corporate — who is the data controller, and what Art.6 basis applies to each processing purpose (identity/account, signal content, voice capture, device geolocation, usage telemetry)? If Corporate workers' data is processed under legitimate interest by the employer organisations, we need each org's LIA outcome and Art.28 processor terms before we design the onboarding screen; if under consent, we need the withdrawal rule — specifically what happens to signals already anonymised at the data layer and to append-only audit entries, since neither is reversibly attributable. Separately, confirm whether device geolocation and voice capture are treated as distinct opt-ins, and whether any signal content is expected to carry Art.9 special-category data requiring its own condition. This determines whether Dev Pack §5 'Consent and visibility control' is a stored consent record with state and revocation, or a privacy notice with a UI toggle."

#### Why it matters

The lawful basis determines whether the app needs a consent screen at all, whether a worker can withdraw and what happens if they do, and whether geolocation must be separately opted into. If SafeIn5 builds on consent and a worker withdraws it, every signal that worker submitted becomes questionable — and if the basis is legitimate interest, a consent screen that implies otherwise is itself a compliance defect. This also determines whether 'Consent and visibility control' (Dev Pack §5) is a real feature or a notice.

#### Evidence

Dev Pack §5 System: 'Consent and visibility control' — listed as a system capability, never specified. Dev Pack §5 Community Layer: 'optional device geolocation should automatically attach… where user permissions allow.' Dev Pack §15.4: 'Data handling must comply with GDPR and Corporate privacy requirements.' Dev Pack §15.1 promises 'SafeIn5.ai is not a surveillance or disciplinary platform', and ADM-039 amendment: 'Avoid language that implies worker performance scoring' — both of which are arguments a legitimate-interest balancing test would rely on. No document states a lawful basis for any processing activity.

#### Options

1. A) Legitimate interest (workplace safety) for signal and account processing; separate explicit consent only for optional geolocation and for voice recordings. SafeIn5 produces the LIA.
2. B) Consent for everything, with a consent screen at first login and a withdrawal control in profile — requires defining what happens to already-submitted signals on withdrawal.
3. C) Legal obligation (UK health and safety duties) as the basis — likely overreach, since SafeIn5 is explicitly not a statutory reporting system ('SafeIn5 is not a reporting system', Dev Pack §2).
4. D) Legitimate interest for Corporate, consent for Community (where the user genuinely chooses to join and no employment relationship exists).

#### Recommendation

Option D. It is the technically and legally correct split: Community self-registration is a genuine free choice so consent works there, while employed pilot workers cannot freely consent so legitimate interest (with an LIA and a clear privacy notice) is the defensible basis for Corporate. In both cases keep geolocation and voice recording as separate, revocable, granular opt-ins — the docs already describe geolocation as conditional on permissions, so the UI is half-built by that assumption anyway. SafeIn5 must own the LIA; it is not a Talentica deliverable.

---

### 40. retention-schedule-per-data-class

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

The question is directionally right but over-broad — invitation tokens (expire on use / short TTL) and push subscriptions (pruned on 410 Gone) are ordinary vendor decisions and dilute it. Tighten to the four controller-level decisions: (1) Retention period per data class where the client, not the vendor, must decide: Behaviour Signals and their classification (i.e. the safety record — is there a minimum retention driven by H&S record-keeping?), attached photos/video, and audit logs. (2) Raw voice audio and STT transcripts (WRK-020/SCP-020): is the source audio discarded immediately after transcription, retained for a fixed window for correction/QA, or retained for the life of the signal? This is the highest-risk class. (3) ADM-023/SCP-047 'Delete existing sites' states only that the site is removed, QR codes stop working and workers move to bench — confirm the intended treatment of that site's Behaviour Signals, media and audit rows: cascade hard delete, retain-and-orphan, or archive/soft-delete. Same question for ADM-028/SCP-052 Delete/Block User (does blocking or deleting a worker remove their signals?) and for ADM-034 'Delete observations' (soft hide vs hard delete). Note the tension: any hard cascade conflicts with the 'append-only audit logging' NFR. (4) End of pilot: on exit, does each Corporate org's data get exported-then-purged, retained for a defined period, or handed over — and who holds the delete authority. Do not cite Microsoft Clarity/Mixpanel as evidence of a client gap; third-party analytics retention is a vendor configuration choice and should be proposed, not asked.

#### Why it matters

'Retention policies' is committed in the NFR table as a deliverable but no period is stated anywhere, so it is unbuildable and untestable at UAT. Media and raw voice are the expensive and the sensitive classes: 30-second videos from 60 users accumulate storage cost, and raw voice recordings of workers are biometric-adjacent personal data with no stated deletion date. ADM-023 says deleting a site removes it 'completely' — if that cascades to signals, it silently deletes the safety record and conflicts with append-only audit logging.

#### Evidence

Talentica NFR: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies. …Append-only audit logging enabled.' No period given. ADM-023: 'Deleting will remove the site completely, QR codes will not work and workers assigned in site will be updated as on bench' — silent on the site's signals and media. ADM-028 'Delete/Block User' — silent on that user's signals. WRK-020/SCP-020 'AI Audio Transcription' creates transcripts; WRK-019 video at 'Maximum video duration of 30 seconds per clip' (Talentica NFR); neither has a retention rule. Dev Pack §7 requires 'Audit logging' with no period. Slide 19 lists 'Microsoft Clarity, MixPanel' with no retention statement.

#### Options

1. A) Uniform: everything retained 24 months from creation, then hard-deleted; audit logs 7 years.
2. B) Per-class: signals + classification 36 months (safety learning value); media 12 months; raw voice deleted immediately after successful transcription; transcripts follow the signal; audit logs 7 years; telemetry 14 months; invitation tokens 7 days; blocked users anonymised at 90 days.
3. C) Retain for the pilot duration + 12 months, then delete everything on a single date; simplest for a time-boxed pilot.
4. D) Client-configurable per tenant — flexible but adds an admin surface and a scheduler that MVP does not budget for.

#### Recommendation

Option B, with soft-delete + anonymise (never hard cascade-delete) for ADM-023 and ADM-028 so that safety signals survive a site or user being removed while ceasing to be personal data. Deleting raw voice immediately after transcription is the highest-value single decision here: it removes a whole category of sensitive personal data and its storage cost at negligible functional cost, since the transcript is what the product actually uses. Confirm explicitly that ADM-023 does NOT delete signals — if SafeIn5 intends it to, that must be stated, because it contradicts append-only audit logging.

---

### 41. subprocessor-list-approval-and-eu-residency

> **Severity:** HIGH  |  **Blocks:** M1

#### Question

Reframe from "client, choose our vendors" to "client, confirm the legal chain and any approval constraints; vendor commits to the guardrails."

Ask instead:

1. Controller/processor chain and signing entity. Confirm that SafeIn5 Ltd is the data controller toward the three pilot organisations and that Talentica acts as processor for the build. Who holds and signs each sub-processor contract/DPA — SafeIn5 Ltd or Talentica — and who owns the cloud, object-store and STT accounts at handover? This is unaddressed in every document and drives account ownership and exit.

2. Pilot-client sub-processor approval. Do any of the three pilot organisations require a named sub-processor list to be approved (and change-notified) before their workers submit data? If so, we need the approval window now, not at M5 UAT, and we will supply the list at the end of Discovery.

3. Speech-to-text constraints (the one that actually needs a decision). The provider is unnamed in the proposal (Talentica Slide 19: "Speech-to-text provider | Voice-first capture transcription") while CQA-006 makes voice the preferred capture method and SCP-020 makes AI Audio Transcription a MUST — so raw voice of identifiable workers, potentially naming colleagues, is on the critical path. We propose to bind our selection to these non-negotiables: EU/UK region processing only, contractual no-training-on-customer-audio, no human review of audio, audio deleted at the provider after transcription, and a fallback to manual text entry when transcription is unavailable (PRD A6 already assumes graceful degradation). Please confirm these are sufficient, or state any additional constraint (e.g. UK-only processing, no US-parent provider) before we select at end of Discovery.

4. UK vs EU residency. The product is UK-only (CQA-002; PRD §"Geography") with UK-GDPR pilot clients, but the committed NFR says "EU-based data residency". Confirm EU region is acceptable to the pilot organisations' contracts, or tell us UK region is required — this is a cheap decision now and an expensive migration later.

Drop from the question: which cloud (CQA-013 explicitly delegates this to the vendor with a justification, so we should recommend, not ask), which email provider, and Sentry/Clarity/Mixpanel selection — all normal vendor picks that we will name in the Discovery sub-processor list. Also drop "web-push service": VAPID web push has no third-party processor, it posts directly to the browser vendor's push endpoint, so there is nothing to approve.

#### Why it matters

The STT provider is the sharpest problem: it receives raw voice recordings of identifiable workers describing hazards, potentially naming colleagues — and it is not named anywhere in the proposal, so its jurisdiction, its DPA and its training-data policy are all unknown. If the chosen provider trains on submitted audio, worker voice data leaves the perimeter permanently. Every one of these is a sub-processor the pilot clients' DPAs must list; discovering an unapprovable one at M4 forces a mid-build swap of the voice pipeline, which is the product's flagship capture mechanism (CQA-006 makes voice the preferred method).

#### Evidence

Talentica Slide 19, Third Party Services: 'Cloud AWS or GCP' (undecided); 'Email-sending service (e.g. SES / SendGrid)' (undecided); 'Speech-to-text provider | Voice-first capture transcription' (unnamed); 'Sentry | Client-side error tracking'. CQA-013: 'SafeIn5 is open to vendor recommendation. AWS or GCP are preferred candidates' — still open. Talentica NFR demands 'EU-based data residency'. CQA-006: 'Voice memo should be treated as the preferred capture method for frontline workers.' WRK-020/SCP-020 make AI Audio Transcription a MUST. No document lists sub-processors, DPAs, or a transfer mechanism for any of them.

#### Options

1. A) All-AWS eu-west-1 (Ireland): Amazon Transcribe for STT, SES for email, Sentry EU region, no Clarity, Mixpanel EU residency. One cloud DPA covers compute, storage, STT and email — fewest sub-processors, single jurisdiction.
2. B) All-GCP europe-west: Google Speech-to-Text, SendGrid (US-headquartered — needs its own transfer assessment), Sentry EU.
3. C) On-device / browser Web Speech API for transcription — zero audio leaves the device, zero STT sub-processor, but quality is poor in high-noise quarry environments and Safari/iOS support is inconsistent, putting a MUST requirement at risk.
4. D) Hybrid: on-device first, cloud STT fallback when on-device fails — best quality/privacy trade-off, roughly double the integration work.

#### Recommendation

Option A. Consolidating onto a single EU-region cloud collapses the sub-processor list to essentially one DPA plus Sentry, satisfies the EU residency NFR without per-vendor transfer assessments, and Amazon Transcribe can be configured not to retain or train on submitted audio — get that in writing. Whichever is chosen, ask SafeIn5 to confirm now that raw audio may leave the device at all, and add a contractual 'no training on customer data' requirement for the STT provider. The sub-processor list must be finalised at M1, because it is an input to the pilot clients' DPAs, not an output of the build.

---

### 42. community-moderation-model-and-sla

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Two corrections to the framing before sending.

(1) The premise "no moderation model is stated" is slightly too strong — ADM-031 and SCP-055 do imply a model by specifying "hide/delete inappropriate content", which only makes sense post-publication. The sharper question is therefore the contradiction, not the silence. Restate as: "ADM-031/SCP-055 approve 'view signal detail, filter, and hide/delete inappropriate content', which implies content is published first and removed after. The Community flow in our proposal, however, shows 'Moderation and Verification — shared content is reviewed and duplicates removed' as a step before the feed. Please confirm which is correct for MVP: does a Community post go live immediately with reactive takedown, or is it held pending review?"

(2) Drop the "confidence scoring" thread from the ask — Dev Pack §17.2 Scenario 4 hedges it as "may be required", and it is a Phase 2 SIGNAL-layer capability, so raising it invites scope creep into the answer.

Then ask only the three build-blocking sub-questions: (a) who performs Community moderation and is that a named SafeIn5 Ltd role staffed for the pilot; (b) what target turnaround should the queue be designed for, noting Community Scenarios 1 and 3 are time-critical hazards; (c) do you want a user-facing report/flag button in MVP, and what is the takedown route and response time for content naming an identifiable individual or a named company/site. Flag that if Community moderation staffing is not resolved, the fallback is to launch the Community feed in the pilot with pre-moderation and a hold state, which is the more expensive build and should be priced at Discovery.

#### Why it matters

Dev Pack Community Scenario 4 explicitly anticipates abuse, and Scenario 1 anticipates members of the public photographing public infrastructure — meaning bystanders' faces and vehicle plates in photos, and named companies alleged to be operating unsafely. With anonymous or guest submission this is a defamation and UK Online Safety Act exposure route with no named owner. Talentica's scope includes 'Feed Moderation' as one bullet with no model, no queue, no SLA and no roles. Pre-moderation and post-moderation are completely different builds (a review queue and a hold state vs. a report button and a hide action) and the choice cannot be deferred past M3 feed work.

#### Evidence

Dev Pack §17.2 Scenario 4 'Malicious Public Reporting': 'User repeatedly submits false or abusive reports. System requires moderation and abuse detection. Confidence scoring and duplicate detection may be required. Anonymous mode should not enable harassment. Governance policies required for community environment.' Dev Pack §15.6: 'Community environments require moderation, verification, abuse protection.' Dev Pack §17.2 Scenario 1: 'Moderation and verification processes required. Potential escalation to local authority or asset owner.' WRK-024 amendment: 'must be moderated and learning-focused.' ADM-031/SCP-055 provide only 'hide/delete inappropriate content'. Talentica Slide 12 lists 'Feed Moderation' as one line. Talentica Slide 8 (Community flow) step 4: 'Shared content is reviewed and duplicates removed' — by whom is unstated. No SLA, no role, no queue, no report button, no confidence scoring anywhere.

#### Options

1. A) Post-moderation: content publishes immediately; a 'Report' button on every Community post creates a queue for a SafeIn5 Community Moderator role; target 24h review on business days; hide-on-first-report for posts with 3+ reports.
2. B) Pre-moderation: nothing appears in the Community general feed until a SafeIn5 moderator approves it. Safest legally, kills the immediacy that is the product's whole point, and needs staffed coverage from day one.
3. C) Hybrid: Good Practice posts publish immediately; 'Be Aware' and 'Needs Attention Now' Community posts (the ones likely to allege unsafe conduct by a named party) hold for review.
4. D) Restrict the Community general feed to authenticated, verified users only in MVP and defer public moderation entirely to Phase 2.

#### Recommendation

Option A plus the mandatory addition of a Report button (which appears in no requirement and is currently unbudgeted), and a written moderation policy supplied by SafeIn5. Confirm which human at SafeIn5 holds the moderator role and their working hours — a 24h SLA with nobody rostered is worse than no SLA. If SafeIn5 cannot resource moderation for the pilot, take Option D and say so now, because an unmoderated public feed with anonymous posting on a safety platform is a legal exposure disproportionate to the pilot's validation value.

---

## F. Feed, Supervisor Workflow, Notifications & Moderation

### 43. workflow-state-machine-ratification

> **Severity:** CRITICAL  |  **Blocks:** Pre-contract

#### Question

Sharpen two points. (1) The framing "reduce" understates the vendor's position — Dev Pack §7 is asserted three times (§6 Workflow Service, §7 state machine, and the later "Corporate Workflow Service - assignment, action tracking, closure, and audit trail"), and the proposal binds scope to "all items marked MUST and SHOULD" in that document, so this is a deletion from the priced baseline requiring written variation, not a design simplification. (2) Do not imply the Tender Pack already downgrades it — it is silent: no ADM-xxx or SCP-xxx row covers assignment, evidence-before-close, state transitions or an audit-log viewer at all. Cite instead QA-005 (MUST/Approved: "Basic acknowledgement/review of signals... must remain lightweight and avoid becoming a full enterprise admin platform"), QA-006 (Approved: "advanced permissions and enterprise governance" listed as future phase), and Success Metrics "Signals Reviewed / Actioned" (SHOULD only). Suggested restatement: "Dev Pack V9 §7 mandates the full 5-state corporate workflow with Assignment, configurable evidence-before-close and Audit Log, and our fixed price is contractually bound to that document's MUST/SHOULD items. The Tender Pack contains no ADM/SCP requirement for those objects, and QA-005/QA-006 direct us to a lightweight admin excluding enterprise governance. Please confirm in writing which governs for MVP: (a) Acknowledge + Close with a comment, visible to the originating worker, with Dev Pack §7 Review Task / Assignment / Evidence objects deferred to Phase 2 and the data model built so as not to preclude them; or (b) the full 5-state machine, which we will price and schedule as a variation to Milestone 4. Note that state-change logging for GDPR/security audit is retained under (a) regardless; what is deferred is Assignment, evidence-gating and the audit-trail viewer UI."

#### Why it matters

Talentica's assumptions (Slide 25, item 3) bind cost and timeline to 'the MVP (Phase 1) scope defined in SafeIn5 Dev Pack V9 Issue.pdf', and the Dev Pack states the full state machine as a rule set, not an option. Talentica's own Slide 12 lists 'Supervisor flow' and Slide 22 M4 lists 'Supervisor workflows, approvals'. The working PRD position is Acknowledge + Close only. The delta between two states and five states plus Assignment, Evidence upload and an audit-trail viewer is a material fraction of the 3-week M4 window. If this is not ratified in writing before build, it surfaces as a scope dispute at UAT with 25% of the fee outstanding.

#### Evidence

Dev Pack §7 'Corporate Workflow (State Machine)': 'New -> Assigned -> Acknowledged -> Actioned -> Closed. Rules: Each state change logged; Assignment required before action; Evidence required before close (configurable); Full audit trail maintained. Objects: Review Task, Assignment, Evidence, Audit Log.' Talentica Slide 12: 'Supervisor flow'; Slide 22 M4: 'Supervisor workflows, approvals'. Talentica Slide 25 assumption 3 names the Dev Pack as the scope baseline.

#### Options

1. MVP = Acknowledge + Close with mandatory free-text closure comment; state changes append to an audit log; no Assignment, no Evidence object, no configurable rules. Full machine deferred to Phase 2 with the data model shaped to accept it.
2. MVP = 3 states: New -> Acknowledged -> Closed, plus optional Assign-to-user as a non-blocking field (assignment recorded but never gating).
3. MVP = full 5-state machine with assignment gating and optional evidence upload, funded as a priced change request against M4 with a corresponding deferral elsewhere (e.g. Community general feed WRK-024 or rule-based alerts ADM-040).

#### Recommendation

Option 2. Acknowledge + Close closes the black hole, and a non-gating 'assigned to' field costs almost nothing while giving supervisors the accountability handle they will ask for on day one and preserving the Dev Pack's assignment concept in the data model. Whichever is chosen, it must be recorded as a signed amendment to the Dev Pack §7 baseline before M2 ends.

---

### 44. workflow-entry-and-transition-rights

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Recommended restatement (narrowed to what is actually open):

"PRD §5.4 fixes the MVP supervisor workflow at Acknowledge + Close (no assignment, no evidence). We need one product decision from you: which classifications require a supervisor acknowledgement?

Option A — Needs Attention Now only. Keeps the queue small, but the flagship Rigging scenario (SafeIn5.md Step 7) is built on three 'Be Aware' signals, which would never be acknowledged.
Option B — Be Aware + Needs Attention Now require acknowledgement; Good Practice is feed-visible only (optionally 'endorsable' with no queue obligation).
Option C — all three enter the queue.

Our recommendation is B. We would also like your expected response timeframe per classification, since Dev Pack §15.3 lists 'Who acts on Behaviour Signals and within what timeframe?' as a mandatory open question and Tender Pack Success Metrics track 'Supervisor/admin review or acknowledgement activity'.

Separately, for confirmation rather than decision: we will implement four roles — Worker, Supervisor/Site Lead, Organisation Admin, SafeIn5 Platform Admin — since Tender Pack QA requires 'user setup and role assignment' without enumerating the set. Supervisors will be able to acknowledge/close signals they raised themselves (no segregation of duties at pilot scale). Flag if either differs from your intent; otherwise we proceed."

Do NOT ask about auto-assignment by sub-site owner — PRD §5.4 already puts Assignment out of MVP scope. Do NOT assert that no supervisor role exists in the requirements; it does (Dev Pack §5 role-based access, Tender Pack lines 198-199, ADM-024..030 Corporate column, Talentica Slide 5).

#### Why it matters

Routing every Good Practice signal into a workflow queue creates administrative noise that will make supervisors abandon the queue, but routing only Needs Attention Now means a Be Aware signal (the exact classification in the flagship Rigging scenario) never gets acknowledged — and CQA-012 ties worker trust to knowing signals are 'seen/reviewed/actioned'. Separately, no supervisor role exists in the requirements: ADM-024..030 describe only workers and admins, so there is no defined actor for the workflow at all. The role/permission matrix drives the authorization layer built in M2; discovering in M4 that a third role is needed means retrofitting RBAC.

#### Evidence

Dev Pack §15.5: 'Signal routed to relevant feed or workflow... Supervisor or Corporate workflow triggered where required' — 'where required' is undefined. Talentica Slide 5 names a 'Supervisor / Site lead' persona, but ADM-024 to ADM-030 (User Management) cover only worker profile, email, site assignment and block/delete — no role field is specified. Tender Pack QA-006 mentions 'User setup and role assignment' without enumerating roles.

#### Options

1. All three classifications create a workflow record, but only Needs Attention Now appears in the supervisor's default 'Needs action' queue; Be Aware and Good Practice sit in an 'All signals' tab and can be acknowledged optionally. Roles: Worker (create only), Supervisor (acknowledge/close within assigned sites), Org Admin (all, plus reassign), SafeIn5 Platform Admin (all tenants).
2. Only Needs Attention Now enters the workflow; Be Aware and Good Practice are feed-only with no status.
3. All three require acknowledgement before they can be marked caught-up, with a per-site SLA (see workflow-sla-timers).

#### Recommendation

Option 1, with no auto-assignment in MVP (manual assign only) and no self-close restriction for a ~60-user pilot. It gives every submitter a visible status path (satisfying CQA-012) without burying supervisors. Confirm the four-role model now so RBAC is built once in M2.

---

### 45. wrk022-notification-requirement-is-corrupt

> **Severity:** CRITICAL  |  **Blocks:** Pre-contract

#### Question

Evidence is correct; only two refinements. (1) The copy-paste source should be cited as WRK-009 and WRK-020 (and SCP-020) — all three carry the identical voice-capture Decision text; and the corruption spans the Community Requirement, Corporate Requirement, Detailed Requirement Statement and Strategic Reasoning columns, while the Functional Description and Feature/Sub-Feature columns are genuine to WRK-022. (2) The question omits ADM-040, which is the strongest lever: it already sanctions the only defensible landing zone ("A simple rule-based alert may be considered, for example repeated Needs Attention Now signals in a site/sub-site. It must not be presented as predictive AI") and is itself only SHOULD / "Discovery Workshop Decision".

Suggested restatement — ask it as a bounded choice, not an open invitation:

"WRK-022 / SCP-022 ('Phone Notification Alerts — Live Worksite Warnings / Predictive Safety Alerts') is marked MUST / MVP, but its Community Requirement, Corporate Requirement, Detailed Requirement Statement and Strategic Reasoning columns are verbatim duplicates of the voice-capture text in WRK-009 / WRK-020 / SCP-020 and say nothing about notifications. Its only notification-specific content is the Functional Description — push alerts 'if an urgent safety hazard cluster is flagged in their zone' — which requires exactly the cluster detection that ADM-041 and ADM-042 mark WON'T / Out of Scope for MVP, and which WRK-023 defers as COULD / Phase 2. We read this as a workbook copy-paste error, not a real MUST. Please confirm which of the following WRK-022 is, so we can baseline it:

(a) Struck for MVP — worker device push notifications are Phase 2, and MVP delivers no push to workers (consistent with WRK-023, ADM-041/042, and the PRD's Q20 decision that closure is shown publicly in the feed rather than notified individually).
(b) Reduced to transactional web push only — e.g. a worker's PWA receives a push when a signal they follow is acknowledged or closed, with no detection logic. Note this partially conflicts with the PRD Q20 anonymity decision and would need that decision revisited.
(c) Reduced to the ADM-040 rule-based threshold alert, surfaced to workers as well as admins — a fixed, configurable, non-AI rule such as N 'Needs Attention Now' signals at one site/sub-site within a rolling window, explicitly not labelled predictive. If so, please confirm ADM-040 is promoted from SHOULD / 'Discovery Workshop Decision' to MUST / MVP, since WRK-022 would then depend on it.

We are pricing (a) unless told otherwise. Options (b) and (c) are deliverable within the notification service already in Milestone 4; neither includes hazard-cluster or pattern-detection logic, which remains out of scope per ADM-041 / ADM-042 and our own out-of-scope list."

#### Why it matters

As written, WRK-022 is a MUST whose only genuine content is its Functional Description ('pushes direct pop-up alerts... if an urgent safety hazard cluster is flagged in their zone') — i.e. cluster detection, which ADM-041/ADM-042 explicitly exclude as WON'T, and which WRK-023 defers as COULD/Phase 2 on the grounds that predictive alerts 'imply analytics maturity that the platform will not yet have'. A vendor pricing MUST literally would be building a hazard-cluster engine that the same workbook forbids. This contradiction must be resolved before the scope baseline is frozen, or it becomes the single largest scope-dispute risk in the notification area.

#### Evidence

WRK-022 Feature: 'Live Worksite Warnings / Predictive Safety Alerts', Priority MUST, Phase MVP. Its Decision text reads: 'SafeIn5 agrees that the signal needs a message/caption, but voice should be prioritised over typing...' — identical to WRK-009 and WRK-020. WRK-023 (Automated Safety Nudges): COULD / Phase 2 / 'Predictive alerts should not be in MVP'. ADM-041/ADM-042: WON'T. Talentica Slide 13 out-of-scope: 'Automated insights workflow (auto-generated push notifications).'

#### Options

1. Restate WRK-022 as: 'Web push notification capability exists in MVP and is used only for deterministic, non-predictive events (workflow status changes on your own signal; optionally a manual supervisor broadcast to a sub-site).' Predictive/cluster alerting moves to Phase 2 alongside WRK-023.
2. Downgrade WRK-022 to COULD/Phase 2 entirely, matching WRK-023, and ship MVP with no push at all.
3. Keep MUST as literally described (hazard-cluster-triggered push) and price it as a change request, accepting the conflict with ADM-041/042.

#### Recommendation

Option 1. It preserves the intent (workers get told things) and keeps the notification infrastructure in the build so Phase 2 does not start from zero, while removing the predictive claim the client has repeatedly said must not be made. Option 3 should be rejected outright — it contradicts three other requirements and the vendor's own out-of-scope list.

---

### 46. ios-push-limitation-and-fallback

> **Severity:** CRITICAL  |  **Blocks:** M4

#### Question

Two-part, and lead with scope not technology:

(a) WRK-022 / SCP-022 "Live Worksite Warnings — Predictive Safety Alerts" is graded MUST / MVP, but its Decision and Rationale columns contain text copied verbatim from WRK-020 (voice-to-text), so no decision was actually recorded. It also contradicts WRK-023/SCP-023 ("predictive alerts should not be in MVP", Phase 2) and Talentica's out-of-scope line "Automated insights workflow (auto-generated push notifications)". Please confirm: is WRK-022 **out of MVP** (our working assumption, consistent with WRK-023 and with the PRD's decision that closure feedback is shown publicly in the feed rather than notified)? If it is in, it needs re-pricing against the fixed £45k.

(b) If ANY outbound notification is in MVP, WRK-022's own assumption offers two channels — "mobile web push notification services **or** a text message gateway" — and the proposal implements only the first. We should state, not ask, the constraint: on iOS, web push reaches a worker only if they are on iOS 16.4+, have added SafeIn5 to the home screen, and have granted permission; in a BYOD quarry pilot that will be a partial-reach channel, and there is no way to make it universal within a PWA. Our recommendation is: web push as best-effort only, with the authoritative surface being the in-app feed/badge on next open, and **no** SMS gateway in MVP (new vendor, new run-rate cost, and mobile numbers introduce new PII requiring a lawful basis and consent flow that the current GDPR posture does not cover). Please confirm you accept best-effort push with in-app-only guarantee — or tell us at Discovery, not UAT, if SMS is required, so it can be scoped and priced.

Also drop the "closure notification" framing from the ask — SafeIn5-PRD.md §5.5 has already decided there is no individual closure notification, by design, for anonymity reasons.

#### Why it matters

The proposal commits to Safari (iOS) as a supported browser and lists web-push (VAPID) as the sole notification technology. On iOS there is no background push for a PWA running in a browser tab; Apple requires home-screen installation. In a BYOD quarry pilot on personal phones, home-screen installation is an adoption step many workers will skip. If SafeIn5 expects 'Needs Attention Now' warnings or closure notifications to reach workers reliably, that expectation is unfounded for the iPhone cohort, and discovering it at UAT is too late to add an SMS gateway (new vendor, new cost, new PII/consent basis under GDPR). An SMS gateway is not in the third-party services list.

#### Evidence

Talentica Slide 14 NFRs: 'Supported Browsers: Safari (iOS) and Chrome (Android)'. Slide 19 Tech Stack: 'Notifications: web-push (VAPID)'; Third Party Services lists SES/SendGrid (email) and 'Web push (VAPID)' — no SMS provider. Dev Pack §10 requires 'a line item for Progressive Web App (PWA) implementation to support the "Add to Home Screen"'. WRK-022 Assumption: 'Integrates with mobile web push notification services or a text message gateway.' Device context: SafeIn5.md 'Personal mobile phone or company-issued rugged device'.

#### Options

1. Accept the limitation. Push is best-effort only; the guaranteed channel is in-app (badge/status on next open) plus email for account-holders. Add a prominent, dismissible 'Add to Home Screen' coach mark and measure install rate as a pilot metric. No SMS in MVP.
2. Add an SMS gateway (e.g. Twilio/MessageBird) for Needs Attention Now events only, as a priced change request, with mobile numbers collected at invite and an explicit lawful basis + opt-in recorded.
3. Drop push from MVP entirely; in-app + email only; revisit after the pilot reports actual device mix and install rate.

#### Recommendation

Option 1, and capture the pilot's actual iOS/Android split and home-screen install rate as an explicit M5 report so the Phase 2 decision on SMS is evidence-based. Never design any safety-critical journey on the assumption a push was delivered — that must be an architectural rule, not a preference. Note also that push to an anonymous submitter reintroduces the identity link discussed in worker-visible-status.

---

### 47. admin-edit-transparency

> **Severity:** CRITICAL  |  **Blocks:** M4

#### Question

Two of the four sub-questions are already effectively decided and should be dropped so the client only spends time on what is genuinely theirs to decide. (a) "Is the original preserved?" is answered — the Talentica proposal's NFR table commits to "Append-only audit logging enabled" and Dev Pack §7 requires an Audit Log object, so preserving the prior classification/caption is contractually implied; the vendor should just do it. (b) Whether admins can escalate as well as downgrade is a vendor-default: SCP-057 says "update — risk classification" with no directional restriction, and restricting direction would be an invented constraint. Also correct the citation: the amendment text quoted is not specific to ADM-033 — it is the single shared amendment applied to ADM-031/032/033/034 (Feed Management as a block), which strengthens the point that the client never reasoned about editing separately from viewing and deleting. Restated question: "ADM-033/SCP-057 lets an admin change a worker's classification or caption, and your amendment asks for this to be 'controlled and auditable'. We will keep an append-only audit record of the prior values by default. Three points need your decision, because they are trust-policy rather than engineering: (1) after an edit, does the feed card carry a visible 'updated by site admin' marker to all viewers, or does the amended version simply replace the original silently? (2) is the worker who submitted the signal notified that their signal was amended? (3) for the ADM-038 classification split and the SIGNAL data captured for Phase 2, should we report the worker's original classification, the admin's amended one, or both? Note that anonymous signals cannot support (2) at all under the §5.5 anonymity model, so the answer needs to hold for both cases."

#### Why it matters

A worker classifies something as Needs Attention Now, an admin silently downgrades it to Be Aware, and the worker later sees their own signal misrepresented in the feed. That single experience destroys the psychological-safety premise the whole product rests on, and it is worse for the worker's colleagues who now believe the worker judged it as minor. The requirement's own amendment says editing 'should be controlled and auditable' but defines neither. Silent classification overwrite also corrupts the classification-split analytics (ADM-004/ADM-038) and the future SIGNAL training data, since the stored classification no longer reflects worker judgement. Retrofitting original-value preservation after signals exist means unrecoverable history.

#### Evidence

ADM-033 / SCP-057: 'update- risk classification, caption. Security action enabling managers to update errant inputs, typos, or double-posts from the mobile view.' Priority SHOULD. SafeIn5 amendment: 'Editing worker observations should be controlled and auditable... Moderation is essential for trust, but over-administration could undermine worker ownership.' Dev Pack §15.1: 'SafeIn5.ai is not a surveillance or disciplinary platform.' Dev Pack §7: 'Full audit trail maintained.'

#### Options

1. Admins may not edit classification at all. They may only hide/delete (ADM-034) or add a visible admin note to the card. Caption edits limited to redaction of personal data, marked 'edited by administrator'. Original always retained in the audit log.
2. Edits permitted, but the card shows 'Updated by [site] administrator' with the original classification viewable by tapping, and the worker receives a notification. Original retained immutably.
3. Edits permitted silently as described in ADM-033, with the original captured in the append-only audit log visible to admins only.

#### Recommendation

Option 1, with Option 2 as the fallback if SafeIn5 insists on classification editing. A worker's classification is their statement, not a data-quality field — overwriting it is categorically different from fixing a typo, and the product's entire non-punitive positioning depends on workers believing their words survive intact. Option 3 should be rejected: 'auditable' to admins only is not auditable to the person whose voice was changed.

---

### 48. community-feed-visibility-boundary

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

WRK-024 (SHOULD, MVP/Phase 1) describes a general feed showing good practice "from all over the user base not just from specific sites", while its own Corporate column says "Corporate feed remains private/site-based; selected anonymised learning may later be shared if permitted", and SCP-012/013 make site-specific observations and auto-filtering of the worker feed MUST. Dev Pack §7 mandates RLS for "strict data segregation between community and corporate layers". Two things follow that we need confirmed in writing:

1. In the MVP, does a logged-in Corporate worker see the cross-user-base Community feed at all (e.g. a second tab in the same PWA), or is their feed strictly limited to their own site/tenant? Our default build is: Corporate workers see only tenant/site-scoped content; the general Community feed is visible to Community-tier users only, enforced at the DB layer by RLS, with no shared read path.

2. We read "must not expose corporate/client content unless explicitly approved" together with "may later be shared if permitted" as meaning there is NO cross-posting or approval workflow in the MVP — corporate signals can never reach the Community feed in Phase 1, by construction. Please confirm. If instead an admin-approved promote-to-Community path IS wanted in the MVP, it is additional admin-console scope (approval queue, anonymisation/redaction step, audit trail) that is not in the current five milestones and would need to be priced or traded against something else.

#### Why it matters

WRK-024 makes the general Community feed a SHOULD for MVP and says corporate content must not be exposed 'unless explicitly approved', but no approval mechanism is specified and Talentica's scope slide lists only 'Feed Visibility' and 'community feed' without a boundary rule. This is a confidentiality exposure with a paying-pilot client's site data, and it directly shapes the RLS policy the Dev Pack mandates. If a cross-posting/approval workflow is expected, it is unpriced admin scope; if it is not expected, the 'unless explicitly approved' clause should be struck from MVP in writing.

#### Evidence

WRK-024 / SCP-024: 'A general feed which will show good practices and positive behaviours from all over the user base'; SafeIn5 amendment: 'must not expose corporate/client content unless explicitly approved'; priority SHOULD, Phase MVP/Phase 1. Dev Pack §7 Storage: 'utilise row level security (RLS) to ensure strict data segregation between community and corporate layers'. CQA-001 requires one platform, two operating models.

#### Options

1. Hard one-way wall for MVP: Corporate signals never appear in the Community feed under any circumstance; Corporate workers may view the Community feed read-only via a separate tab. No cross-posting mechanism built.
2. Hard wall plus a deferred admin 'promote to Community' action (anonymised copy created as a new Community-tenant record) built in M4.
3. Community feed excluded from the Corporate PWA entirely — two distinct entry points, no shared surface.

#### Recommendation

Option 1. It satisfies WRK-024's adoption intent and Dev Pack RLS segregation with zero approval-workflow build, and keeps the copy-on-promote design open for Phase 2. Any promote/approve flow (Option 2) should be explicitly costed as a change request, not absorbed.

---

### 49. rule-based-alert-specification

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Ask it, but restructure so the client answers decisions only they can make and the vendor proposes the rest — do not hand them eight parameters to fill in. Recommended form: "ADM-040 / SCP-064 is marked SHOULD, 'Phase 1 / Phase 2', 'Discovery Workshop Decision', and the tender pack asks us to confirm inclusion. Note also that our own proposal is currently inconsistent: Slide 13 excludes 'automated insights workflow (auto-generated push notifications)' and 'predictive nudges' from MVP, while our architecture includes a rule-based alert evaluator worker. We need one decision plus one sign-off. (1) IN or OUT of Phase 1? (2) If IN, is the threshold hard-coded and identical across all pilot sites, or admin-configurable per site/sub-site? This is the single cost driver — configurable roughly triples the build and lands in an already-full Milestone 4. Our recommendation, if IN: hard-coded for the pilot — N Needs Attention Now signals from the same sub-site within a rolling 24h window, surfaced as a dashboard state change on the site card plus one email/web-push to that site's supervisors, with a per-sub-site cooldown so a single incident cannot fan out into repeat alerts, and a config value we can tune during UAT rather than an admin UI. Please confirm N and the cooldown, whether scope is site or sub-site, and who receives it (site supervisor only, or org admin too). (3) Please sign off the on-screen wording so it cannot read as prediction — we propose descriptive past-tense only, e.g. 'X Needs Attention Now signals logged at [sub-site] in the last 24 hours,' with no 'risk rising', 'likely', 'predicted' or 'trending' language, consistent with ADM-041/042 being WON'T and SCP-023 deferred." Also worth flagging: if the answer is OUT, we will drop the alert evaluator worker from the M4 estimate, which is the honest way to reconcile Slide 13 with Slide 19.

#### Why it matters

Talentica's tech stack already commits to building a 'rule-based alert evaluator' background worker, so a component is being priced for a requirement whose inclusion is undecided. Unspecified, this is a 1-day feature or a 2-week feature depending on whether thresholds are hard-coded or admin-configurable per site. Without a cooldown rule, a genuine incident generating 6 signals in an hour sends 6 alerts and trains supervisors to mute them within the first week. And the client has drawn a hard line on language: an alert phrased as a prediction breaches the stated positioning and the ADM-041/042 exclusions.

#### Evidence

ADM-040 / SCP-064: 'A system indicator that automatically changes color or flags an alert on the dashboard if a site submits more than a set threshold of critical danger logs... Relies on standard numeric limit validation rules rather than predictive logic.' Priority SHOULD, Phase 'Phase 1 / Phase 2', Decision 'Discovery Workshop Decision'. SafeIn5 statement: 'for example repeated Needs Attention Now signals in a site/sub-site. It must not be presented as predictive AI.' Talentica Slide 19: 'Background work: In-process workers — outbox flusher, rule-based alert evaluator, transcription dispatch.'

#### Options

1. In scope, hard-coded single rule: >=3 Needs Attention Now signals in the same sub-site within a rolling 24h window raises a dashboard flag visible to supervisors and org admins of that site, plus one email digest; cooldown 24h per sub-site; wording: 'X Needs Attention Now signals logged in [sub-site] in the last 24 hours.' No worker push, no configurability.
2. Same rule but with threshold and window configurable per organisation via the admin console (adds config UI + validation).
3. Out of MVP entirely — dashboard shows counts only; defer all alerting to Phase 2 with WRK-023.

#### Recommendation

Option 1. It delivers the SIGNAL-alerting proof point the client wants for a fraction of the cost of configurability, the wording is purely factual and count-based so it cannot be read as prediction, and the 24h cooldown prevents the alert-fatigue failure. Configurability (Option 2) should be quoted separately and deferred — ADM-035 already establishes the principle that early configurability weakens standardisation.

---

### 50. notification-event-channel-matrix

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Notifications are listed in Milestone 4 and as a "Notification Service" but never enumerated. Please confirm the MVP notification scope, event by event:

1. WRK-022 (Phone Notification Alerts / Live Worksite Warnings) is currently marked MUST / MVP, but the "Approved with Amendment" note in that row discusses voice-vs-text capture rather than alerts, so we read the disposition as unresolved. As written it implies detecting which zone a worker is in and pushing hazard-cluster warnings. Do you intend that in MVP, or is the MVP behaviour limited to notifying supervisors of a new Needs Attention Now signal in their site/sub-site? (We would recommend the latter; the proposal already excludes auto-generated insight pushes.)
2. ADM-040 / SCP-064 (Early Warning Notifications, threshold breach) is marked SHOULD, "Phase 1 / Phase 2", disposition "Discovery Workshop Decision". In or out for MVP? If in, is it dashboard-flag-only (as the requirement text describes) or does it also send a push/email to the org admin?
3. Community moderation queue: does a new signal awaiting moderation notify the Community moderator, or is the moderator expected to work a queue on their own cadence?

For each item confirmed in scope, please also confirm the channel (web push only, or web push + email — email adds unsubscribe/preference obligations under PECR/GDPR) and whether quiet hours or shift-time suppression are required. A Needs Attention Now push at 02:00 to a day-shift supervisor's personal phone is how people permanently disable notifications, so we need a stated policy.

Note: worker-facing acknowledgement/closure notifications are deliberately NOT included above — per the anonymity decision, acknowledgement and closure are shown publicly on the signal in the feed rather than pushed to the originating reporter. Please confirm you are still content with that. Magic-link/OTP delivery by email is already assumed and is not in question.

#### Why it matters

'Notifications' appears as a single unelaborated word in Talentica M4 (Slide 22) and as a 'Notification Service' in the architecture (Slide 17), with no event list anywhere in the requirement set. Each row of this matrix is separate build work (template, trigger, preference handling, unsubscribe for email under PECR/GDPR). Estimating 'notifications' as one line item and then discovering six event types in M4 is a classic fixed-price overrun. Quiet hours matter operationally: a Needs Attention Now push at 02:00 to a day-shift supervisor's personal phone will get notifications disabled permanently.

#### Evidence

Talentica Slide 22, M4: 'Supervisor workflows, approvals, notifications, analytics dashboards, moderation' and PWA: 'notifications, worker feedback loop'. Slide 17 Core Platform Services: 'Notification Service'. Dev Pack §17.1 Scenario 2: 'Closure notification returned to workforce once resolved.' No event catalogue, recipient rule, channel mapping or preference model exists in WRK-001..024 or ADM-001..043.

#### Options

1. Minimal matrix: (b) and (c) to submitter via in-app + push if available; (f) invitation via email; (a) supervisor via in-app badge only (no push, no email); (d) and (e) via a once-daily email digest. No quiet hours needed because nothing except (b)/(c) pushes.
2. Full matrix with real-time push for (a)-(e), per-user notification preferences screen, and configurable quiet hours per organisation.
3. In-app only for everything except the invitation email (f) — no push, no digests, zero notification infrastructure beyond transactional email.

#### Recommendation

Option 1. It funds exactly the two notifications that serve the feedback loop (b and c), uses a daily digest for supervisory awareness where latency is acceptable, and needs no preference screen or quiet-hours engine. Option 2 is a multi-week build that nothing in the requirement set justifies for a 60-user pilot. Whatever is chosen, freeze the matrix before M4 planning.

---

### 51. moderation-model-and-abuse-reporting

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Two fixes to the framing, then ask it.

1. The Slide 8 journey does NOT read as pre-publish. The order is step 3 "Community Feed — classifies... and shares to the community feed", step 4 "Moderation and Verification — shared content is reviewed and duplicates removed", step 5 "Authority / Owner notification". Moderation sits *after* the share-to-feed step, so if anything the deck implies post-publish review, and the "verification" gate sits before *escalation to authorities*, not before visibility. Do not accuse Talentica of proposing pre-publish; ask which it is.

2. Do not claim "no mechanism exists". ADM-031..034 do give a mechanism — admin view/filter/edit/hide-delete — it is simply reactive, SHOULD-priority, admin-only, and has no trigger. The real gap is the *trigger and the operating model*, not the tooling.

Restated question: "The Dev Pack requires Community moderation, verification and abuse protection (§15.6, §17.2 Sc.1/3/4), and ADM-031..034 give admins view/filter/edit/delete — but all four are SHOULD, admin-initiated, with no trigger and no SLA. Please confirm for MVP: (a) is Community content visible immediately on submission with reactive takedown, or held until an admin approves it — and if held, what publish latency is acceptable? (b) who moderates (ADM-001 says Community admin is SafeIn5-internal for MVP) and what turnaround do you commit to? (c) should MVP include a user-facing 'report this content' action and a per-submitter abuse counter to satisfy §17.2 Scenario 4's malicious repeat reporter — neither is in any requirement today? (d) given Community self-registration is in scope and automatic face-blurring is explicitly out of scope, who owns the UK Online Safety Act / GDPR duties for user-generated images of identifiable people, and does that change the MVP takedown/notice obligations we must build? If (a) is pre-publish or (c) is required, both are unpriced additions to the fixed-price scope."

#### Why it matters

Talentica's own Community journey (Slide 8, step 4) places 'Moderation and Verification' between the share and the feed, which reads as pre-publish — but pre-publish moderation of an open, free, self-registering Community tier with no named moderator and no staffing plan means content sits invisible for hours or days, killing the adoption engine. Post-publish requires a report/flag mechanism that appears in no requirement (ADM-031..034 give admins view/filter/edit/delete but give users nothing). Dev Pack §17.2 Scenario 4 explicitly anticipates a malicious repeat reporter, and offers no mechanism to detect one. There is also a legal dimension: an unmoderated public platform hosting user-generated images of identifiable people carries UK Online Safety Act and GDPR exposure that the fixed price does not contemplate.

#### Evidence

Talentica Slide 8 step 4: 'Moderation and Verification — Shared content is reviewed and duplicates removed'. Dev Pack §15.6: 'Community environments require moderation, verification, abuse protection'. Dev Pack §17.2 Scenario 4 'Malicious Public Reporting': 'System requires moderation and abuse detection. Confidence scoring and duplicate detection may be required. Anonymous mode should not enable harassment.' ADM-031/032/033/034 are all SHOULD and admin-initiated only. ADM-001 note: 'Community administration is SafeIn5 internal only for MVP.' No user-facing report/flag requirement exists.

#### Options

1. Post-publish with a user-facing 'Report' button on every Community card, an admin moderation queue sorted by report count, ADM-028 block-user as the sanction, and a stated SafeIn5-internal review turnaround (e.g. 1 working day). Corporate signals are not moderated pre-publish at all.
2. Pre-publish approval for Community only, with a named SafeIn5 moderator rota and an accepted publish latency; Corporate publishes immediately.
3. No moderation queue in MVP: rely on ADM-031/034 (admin views feed, deletes bad content reactively). Accept the risk and keep the Community tier invite-only during the pilot so exposure is bounded.

#### Recommendation

Option 3 if the Community tier stays closed during the pilot (strongly preferred — it removes the legal exposure and the staffing question entirely), otherwise Option 1. Pre-publish moderation (Option 2) should be rejected: it requires a staffing commitment SafeIn5 has not made and it directly undermines the sub-60-second 'share and it's out there' behavioural promise. Note the 'Report' button in Option 1 is net-new scope not in any requirement.

---

### 52. dashboard-widget-and-export-spec

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Drop (a), (b) and (c) — the widget list, the time windows and the org/site/sub-site scoping are answered or are vendor calls. Ask only:

"QA-003 commits that Phase 1 will include 'basic analytics and exportable usage data', and CQA-016 makes success-metric capture a MUST for MVP — but no ADM-xxx or SCP-xxx requirement specifies an export, and it is not priced in our scope. Please confirm: (1) is an admin-facing data export in MVP scope, or is it Phase 2 with MVP only needing the data captured cleanly? (2) If in scope, is it aggregate-only (counts and category splits by site/sub-site/period) or signal-level rows? We recommend aggregate-only for MVP: at ~50–60 pilot users across 3 sites, signal-level rows carrying site, timestamp and category are re-identifiable and conflict with the anonymity-at-database-layer NFR, so signal-level export would need an explicit GDPR position from SafeIn5 on who may export, what is redacted, and whether the export is audit-logged.

Separately, we will bring ADM-040 (rule-based early-warning threshold) to the M1 discovery workshop as your Decision Register already directs, with a proposed default threshold."

#### Why it matters

The dashboard is spread across ADM-004, ADM-005, ADM-037, ADM-038, ADM-039 and ADM-040 with overlapping descriptions and mixed MUST/SHOULD priorities, and 'selectable time frames' (ADM-037) is stated without enumerating them. QA-003 commits to 'exportable usage data' but no requirement specifies an export at all, and signal-level export from a platform that promises anonymity is a GDPR question, not just a feature. Scope granularity determines the query and RLS design: a cross-organisation view for a SafeIn5 platform admin is a different authorization model from an org-scoped one. Ambiguity here converts directly into M4 rework in the most compressed milestone.

#### Evidence

ADM-004 (MUST) classification counts; ADM-005 (MUST) 'latest 5 safety signals'; ADM-037 (SHOULD) 'rolling counter of total frontline safety interactions... over selectable time frames'; ADM-038 (MUST) 'baseline percentage split'; ADM-039 (SHOULD) 'active worksites alongside their total active worker counts'; ADM-006 heat map COULD/deferred. QA-003: 'it should include basic analytics and exportable usage data to support future investor, client and product decisions.' Success Metrics sheet lists 8 metrics with no widget mapping.

#### Options

1. Fixed single-page dashboard scoped to one organisation (org admin) or one site (supervisor), with 5 widgets: classification counts (KPI cards), classification % split, signals-over-time line, latest 5 signals, and site/sub-site activity table. Time windows: 7d / 30d / all-time. CSV export of aggregate widget data only. SafeIn5 platform admin gets an org-selector, not a merged cross-org view.
2. As option 1 plus signal-level CSV export (id, timestamp, site, sub-site, classification, status, caption; author omitted for anonymous rows) with export events written to the audit log.
3. Defer the dashboard to a minimal counts-only page in M4 and deliver full analytics in Phase 2.

#### Recommendation

Option 1. It covers every MUST (ADM-004, ADM-005, ADM-038) and the SHOULDs (ADM-037, ADM-039) with five widgets, honours ADM-043's WON'T on cross-site aggregation by using an org-selector rather than a merged view, and keeps export to aggregates so no anonymity/GDPR question arises in MVP. If SafeIn5 needs raw rows for investor evidence, choose Option 2 and treat the export as a documented processing activity.

---

### 53. community-escalation-to-authority

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Evidence is sound; two refinements to strengthen it. (a) Add the strongest supporting citation: the tender pack contains ZERO occurrences of the word "escalation" anywhere — not just no WRK/ADM/SCP requirement, but no mention at all, including in the Decision Register and Q&A. (b) Acknowledge the nearest partial answer so the client is not asked something they think they covered: WRK-024 / SCP-024 defines the Community feed as "moderated and learning-focused… general learning, good practice and shared awareness" (SHOULD, MVP/Phase 1, Approved with Amendment). Suggested restatement: "Tender Pack WRK-024/SCP-024 scopes the Community feed as moderated and learning-focused, and the word 'escalation' does not appear anywhere in the Tender Pack. However, Talentica's Slide 8 Community journey ends in 'Authority / Owner notification — Signal is escalated to concerned authorities' with 'Status updates shared back with the community', and Dev Pack §17.2 Scenarios 1 and 3 repeat this ('Potential escalation to local authority or asset owner'; 'Moderation and escalation ownership required'). Please confirm: is any escalation to an external party (local authority, asset owner, resilience team) in MVP scope? If yes, we need the recipient model (configured email per topic/geography?), the trigger (moderator action or automatic), and the accountable owner for the outcome and any SLA — none of which currently exist as requirements, and which we would treat as a change to the fixed-price scope. If no, we will build the Community feed as learning-only and will remove any UI copy, status label or notification that implies a report has been passed to an authority — please confirm that is acceptable, since it changes what the Community user is told happens to their signal."

#### Why it matters

Talentica's own Community user journey (Slide 8) shows a 5-step flow ending in authority notification and resolution feedback, and Dev Pack §17.2 Scenarios 1-3 repeat it ('Potential escalation to local authority or asset owner', 'Signal escalated based on urgency and location density'). Nothing in the WRK/ADM/SCP requirement set builds any of it, and there is no authority directory, no routing rules and no ownership model. This is not just unbuilt scope — it is a liability question: if a member of the public reports an open manhole and the UI implies it has been escalated when it has not, SafeIn5 has created a reliance the platform cannot discharge. The Community UI copy must be settled accordingly.

#### Evidence

Talentica Slide 8 (Community flow) steps 5 and 6: 'Authority / Owner notification — Signal is escalated to concerned authorities wherever applicable'; 'Resolution and feedback — Status updates shared back with the community'. Dev Pack §17.2 Scenario 1: 'Potential escalation to local authority or asset owner'; Scenario 3: 'Moderation and escalation ownership required.' No WRK-xxx, ADM-xxx or SCP-xxx requirement covers escalation to an external party. Talentica Slide 13: 'Corporate / external system integrations' are out of scope.

#### Options

1. Out of MVP. Community feed is explicitly learning-and-awareness only, with mandatory UI copy on the Community capture screen: 'This is not an emergency reporting service. For urgent hazards contact [emergency/site number].' No escalation implied anywhere.
2. In MVP as a manual admin action only: SafeIn5 admin can forward a signal by email to a manually entered address and mark it 'Referred', with the status shown on the card. No directory, no routing rules.
3. In MVP with a configurable authority directory and rule-based routing by topic/geography (significant unpriced scope).

#### Recommendation

Option 1, with the disclaimer copy treated as a hard MVP requirement rather than a nicety. The escalation flow on Slide 8 should be corrected in the proposal so it is not read as a commitment. If SafeIn5 wants any escalation capability for the pilot, Option 2 is the cheapest honest version, but it needs a named human owner at SafeIn5 before it is built.

---

## G. Non-Functional, Platform & Tech-Stack Risk

### 54. cloud-account-ownership-and-readiness-date

> **Severity:** CRITICAL  |  **Blocks:** M2

#### Question

Suggested restatement: "Slide 25 assumption 1 states SafeIn5 will provide the cloud account for dev, staging and production. CQA-013 confirms AWS or GCP with vendor recommendation, but ownership, access and cost are still open. Please confirm: (a) which legal entity holds the cloud account(s) and whether Talentica gets an organisation/sub-account with admin + IAM rights or works inside a SafeIn5-managed account; (b) the committed date the account will be live with billing enabled, EU region selected and any DPA/procurement approval done — we need this on or before day 1 of M2 (i.e. by end of the 2-week M1), since managed Postgres, object store, container registry and IAM are prerequisites for the 4-week M2 build; (c) who pays the cloud bill during development and during the pilot — the GBP 45,000 fixed price contains no infrastructure line, so our working assumption is that all AWS/GCP spend plus third-party services (SES/SendGrid, speech-to-text, Sentry, Mixpanel/Clarity) are SafeIn5's direct cost, not a pass-through; and (d) confirm cloud provisioning should be added to the project risk register alongside UX/scope signoff, with schedule slippage from late provisioning treated as a client-caused delay under the change-request process."

#### Why it matters

This is a hard external dependency on the critical path of M2. M2 is 4 weeks and starts immediately after a 2-week M1; if the account is not live with billing enabled, IAM roles, a managed Postgres instance and a container registry on day 1 of M2, the entire schedule slides and the fixed price absorbs idle engineering time. It is also an unpriced cost: nothing in the 45k line items covers AWS spend, and no one has said whether cloud spend is client pass-through.

#### Evidence

Talentica proposal Slide 25 (Assumptions) item 1: "SafeIn5 will provide Talentica with the cloud account for the dev, staging and production environments" — stated as an assumption with no date, no ownership model and no billing statement. Slide 19 lists "Cloud AWS or GCP | Compute, managed Postgres, object store, CDN/WAF, secrets, container registry, log sink" as a third-party service. Slide 27 states GBP 45,000 fixed price with no infrastructure line. Slide 25 Risks lists only "UX design and MVP Scope Signoff within 3 weeks" — cloud provisioning is not listed as a risk.

#### Options

1. SafeIn5 creates an AWS Organisation, pays all cloud bills directly, and grants Talentica a delegated admin role in dev/staging/prod — committed live by end of M1 Week 2.
2. Talentica provisions in its own account during dev/staging and migrates to a SafeIn5-owned account at M5 — SafeIn5 reimburses at cost.
3. SafeIn5 owns prod only; Talentica owns dev/staging in its own account and bills cloud as pass-through.
4. Talentica owns everything for the pilot duration and SafeIn5 takes over post-pilot.

#### Recommendation

Option 1, with a contractual milestone: "Cloud account provisioned, billing enabled, delegated admin granted — no later than the last day of M1." Client-owned account from day one avoids a migration project at M5 (which Option 2 quietly creates: re-provisioning KMS keys, re-issuing certificates, re-seeding data, and re-testing everything, none of which is in the 45k). It also means the client owns the audit logs and the data from the first commit, which matters for the GDPR story. Option 4 should be rejected outright — it makes SafeIn5's own pilot data hostage to a vendor account.

---

### 55. production-environment-ownership-and-rollout-scope

> **Severity:** CRITICAL  |  **Blocks:** M4

#### Question

Sharpen to what is actually unresolved, and stop claiming ownership is unstated. Suggested restatement: "Milestones 2-4 deliver only to Staging and Dev Pack §13 accepts Phase 1 on a 'working staging environment', yet Slide 19 lists Production and Slide 23 puts 'production rollout' inside the 2-week Milestone 5 alongside UAT, defect resolution and handover. Please confirm: (a) does the ~50-60 user pilot run on Production, or on Staging (which carries only a 95% availability SLA)? (b) what is included in 'production rollout' within the fixed price - custom domain and TLS, WAF/CDN, secrets management, DB sizing, backup and restore testing, migration and rollback runbook, monitoring and alerting, and operational GDPR export/delete procedures - and what is excluded? (c) we note Slide 25 Assumption 1 (SafeIn5 provides the cloud account for dev, staging and production) and Slides 21/27 (post-MVP support on a T&M basis), so infrastructure cost and account ownership sit with SafeIn5 and ongoing support is outside the fixed price. Tender Pack CQA-015 asked for a support model, assumptions and indicative cost basis; that is still open. Who operates, monitors and responds to incidents on production from the day the pilot starts - and is a T&M support arrangement expected to be in place before go-live rather than after? A live safety tool at confined-space entries should not go live with no named operator and no runbook."

#### Why it matters

Production is not a copy of staging: it needs its own network, secrets, WAF/CDN, TLS certs and custom domain, DB sizing, backup policy, migration runbook, smoke tests and a rollback plan. If that work is assumed to be a same-day copy-paste in the final 2-week UAT milestone — a milestone whose stated activities are "defect resolution and handover documentation" — either the pilot goes live on a hand-built environment with no runbook, or the work overruns the fixed price. There is also no statement of who operates prod after handover: real workers scanning QR codes at confined-space entries will be using this.

#### Evidence

Talentica proposal Slide 19 Environments: "Dev / Staging / Production". Slide 23 timeline table: M2, M3, M4 all state Talentica Responsibility = "Features deployed on Staging"; M4 deliverable is "Complete MVP delivered ... on staging". M5 Talentica Responsibility = "Feedback incorporation and production rollout", 2 weeks. Slide 24 SLAs, Environment availability: "Staging availability – 95% / Release to staging frequency – End of each milestone / Production roll out – Milestone 5". Dev Pack §13 Definition of Acceptance requires only "Working staging environment". Slide 21 states "A support team to be setup on T&M basis post the MVP delivery" — i.e. explicitly not included.

#### Options

1. Production build-out (IaC, secrets, domain, WAF/CDN, backup policy, migration + rollback runbook, smoke tests) is an explicit priced deliverable of M4, with M5 performing only the cutover.
2. Production is a separately quoted change request after MVP sign-off — MVP acceptance is staging-only per Dev Pack §13.
3. Production is in M5 as currently proposed, with the pilot accepting a manually configured environment and no runbook.
4. No production for the pilot at all — run the pilot on the staging environment, renamed and hardened.

#### Recommendation

Option 1. Move production stand-up into M4 ("deployment readiness" is already listed there) and make M5 a pure cutover + UAT window. Ask for the prod build-out to be delivered as Infrastructure-as-Code so environments are reproducible rather than hand-built. Separately, agree a named post-M5 operating model in writing before contract — even a minimal one (SafeIn5 owns the account, Talentica provides best-effort T&M support in UK business hours) — because "support on T&M basis" is currently the only statement covering a live safety application.

---

### 56. rugged-device-audit-and-pwa-install

> **Severity:** CRITICAL  |  **Blocks:** M1

#### Question

Evidence correction: it is not true that "no document names a browser" — Talentica proposal Slide 14 (NFRs) states "Supported Browsers | Safari (iOS) and Chrome (Android) for field and mobile usage." That is a vendor-side assumption with no version floor and no client confirmation, so the question stands but should be framed as validating it rather than filling a total void. Restated ask: "Our NFRs assume Safari (iOS) and Chrome (Android). Please confirm for the ~50-60 pilot users: (a) the split between personal phones and company-issued rugged handsets, with make/model and OS version for the issued fleet; (b) whether any MDM/kiosk policy restricts Add-to-Home-Screen install, camera, microphone, or notification permissions; (c) the minimum iOS version in the fleet — web push (WRK-022, MUST/MVP) requires iOS 16.4+ and an installed PWA, and voice capture (WRK-009/WRK-020) requires modern MediaRecorder codec support that older rugged-Android WebViews may lack. If any of these fail we need to know before UX is locked, so we request 3-5 representative physical devices during M1 Discovery rather than by end of M2." Timing correction: M2 end is too late — device constraints (touch targets, codecs, install path) shape the M1 UX deliverable, so the devices should arrive in M1.

#### Why it matters

The proposal and scenario both say workers may use "company-issued rugged device". Industrial rugged handsets are frequently 2-5 generations behind on Android, ship with old System WebView builds, and some enterprise-managed devices block Add to Home Screen or run a locked-down launcher entirely. A PWA that installs beautifully on a modern iPhone can be uninstallable, or lack MediaRecorder codecs, on a rugged Android from a quarry's device fleet. Discovering this during UAT in M5 is a catastrophic finding: the entire delivery model (PWA, no native apps, explicitly out of scope) rests on the assumption that these devices can run an installable PWA. This is a 1-day investigation that de-risks the whole engagement.

#### Evidence

Talentica proposal Slide 6: "DEVICE | Personal Mobile Phone or Company issued rugged device"; SafeIn5.md persona: "Device: Personal mobile phone or company-issued rugged device". Slide 13 Out of Scope: "Native iOS / Android apps" — so PWA is the only delivery vehicle. Dev Pack §9 Out of Scope: "Native apps". Dev Pack §10 requires PWA "Add to Home Screen". Slide 4: "Workers should be able to operate with Gloves and goggles". No document names a single device model, OS version, or MDM policy.

#### Options

1. SafeIn5 runs a device audit across the 3 pilot organisations during M1 and supplies 3-5 representative handsets (or exact models) to Talentica by end of M1.
2. SafeIn5 supplies the device list only; Talentica tests on cloud device farm equivalents (BrowserStack) rather than physical units.
3. Mandate that the pilot runs on personal phones only, excluding rugged company devices from the MVP pilot.
4. Proceed on modern-device assumptions and handle issues reactively in UAT.

#### Recommendation

Option 1, and treat it as a contractual M1 dependency alongside cloud account provisioning. If physical devices cannot be supplied, Option 2 is an acceptable fallback but the exact model list is still mandatory. Option 4 is the status quo and is the highest-severity latent risk in the project, because the failure is discovered at the moment it is most expensive and least fixable — the only remedies at that point are a native app (explicitly out of scope) or telling the client to buy new hardware. Note this also interacts with the gloves requirement: touch-through-glove behaviour differs across capacitive digitisers, so the same audit answers both questions.

---

### 57. browser-device-support-matrix

> **Severity:** HIGH  |  **Blocks:** M1

#### Question

Reframe from "give us a browser matrix" to "confirm the pilot device estate, so we can fix the matrix": (1) For the ~50-60 pilot users across the 3 corporate sites, what is the actual device mix - personal BYOD vs company-issued rugged handsets - and for the rugged devices, which model and Android/WebView version are they locked to? (2) Is there a minimum device/OS the client will mandate or exclude for pilot participants? (3) Do site MDM/IT policies permit camera, microphone, geolocation, notification permissions and Add-to-Home-Screen install in the mobile browser? Talentica will propose and hold the baseline unless the estate contradicts it: iOS/Safari 16.4+ (required floor for Web Push under WRK-022 and for installed-PWA behaviour), Android Chrome current-2, and for the desktop admin console evergreen Chrome and Edge, current-2, 1366px minimum width - the admin console browser list is a vendor decision, not a client question. The material risk to flag is that any pilot device below iOS 16.4 or on a frozen rugged Android WebView cannot deliver WRK-022 push and may degrade WRK-008/019 media capture and WRK-020 voice capture, requiring an agreed fallback (email/SMS notification) that is currently unscoped.

#### Why it matters

"Safari iOS" spans devices from iOS 12 to iOS 26. The PWA features this product depends on — camera capture via getUserMedia, MediaRecorder for 30-second video, the Web Speech / audio recording path, Service Worker caching, Add to Home Screen, and Web Push — have wildly different availability across that range. If a pilot worker turns up with an iPhone 7 on iOS 15, several MUST features do not exist. Separately, the admin console is explicitly "not a PWA" and desktop-first, yet the only stated browser support is two mobile browsers — so the admin console currently has no supported browser at all, which is an untestable acceptance criterion.

#### Evidence

Talentica proposal Slide 14 NFRs: "Supported Browsers | Safari (iOS) and Chrome (Android) for field and mobile usage" — no versions, and scoped to "field and mobile usage" only. Slide 19: "Admin Console | Next.js / React destop web app — not a PWA". Slide 17 Experience Layer: "Desktop Admin Console ... Desktop-first administration experience". Dev Pack §10 requires "a line item for Progressive Web App (PWA) implementation to support the 'Add to Home Screen' and offline capabilities". Tender Pack WRK-008/019 (camera, video, MUST), WRK-020 (transcription, MUST), WRK-022 (push, MUST).

#### Options

1. iOS 16.4+ / Safari, Android 10+ / Chrome 108+, admin console on current Chrome + Edge + Safari desktop (last 2 versions). Devices below the floor get a clear unsupported message.
2. iOS 15+ / Android 9+, with documented feature degradation per capability (push unavailable below iOS 16.4, etc.).
3. Latest-two-versions of each browser only, on the basis that the pilot cohort is small and manageable.
4. Defer to Discovery pending a device audit.

#### Recommendation

Option 1, but it must be validated against a real device audit first (see the rugged-device finding) — a support floor set without knowing what workers actually carry is a guess. iOS 16.4 is the meaningful line because that is where Safari gained Web Push for home-screen web apps, which WRK-022 depends on. Add the admin console browsers explicitly to the NFR table; as written there is literally no browser in which the admin console is contractually required to work.

---

### 58. ios-web-push-viability

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Two evidence errors to fix.

(1) WRK-022 / SCP-022 is mis-cited. The row is titled "Phone Notification Alerts | Live Worksite Warnings | Predictive Safety Alerts", but the client's actual recorded decision text on that row is about voice capture, not notifications: "SafeIn5 agrees that the signal needs a message/caption, but voice should be prioritised over typing... Voice-first capture supports the under-60-second interaction target." The client never adjudicated notification delivery on WRK-022. The only place the client did rule on notifications is WRK-023 / SCP-023 (Behavioural Guidance / Automated Safety Nudges), marked COULD / Phase 2 / **Defer**, with the note "Basic notifications can be explored later. Predictive alerts should not be in MVP." So there is a prior, larger ambiguity sitting under this question — whether push notification *delivery* is in MVP at all, given WRK-022 carries a MUST/MVP flag inherited from a row whose amendment discusses something else and whose sibling notification row was explicitly deferred.

(2) The CQA-012 / supervisor-feedback-loop argument is already resolved and should be dropped. SafeIn5-PRD.md Q20 decides: "**No individual notification.** Acknowledgement and closure are displayed publicly on the signal in the feed; an anonymous reporter sees the outcome by viewing it" — precisely because a resolvable identity link would break anonymity. Push is therefore not the trust-loop mechanism; the feed is. The only MUST genuinely at stake is the live worksite hazard warning.

Suggested restatement: "WRK-022 (Live Worksite Warnings) is flagged MUST/MVP and the proposed stack uses web push (VAPID), but the client's recorded amendment on that row addresses voice capture, and the adjacent notification requirement WRK-023 was deferred to Phase 2. Please confirm: (a) is real-time push delivery of zone hazard warnings in MVP scope, or is an in-app alert on the feed/QR-scan sufficient for the pilot? (b) If push is in scope: on iOS, web push is only available once the PWA has been added to the Home Screen (iOS 16.4+). Should home-screen installation be a mandatory step in pilot onboarding for iPhone users — which conflicts with the guest-first, scan-and-go entry model — and is the client willing to support that operationally (induction, toolbox talk)? If not, we will deliver an in-app alert banner as the guaranteed delivery path for all users and treat push as an enhancement for installed devices only. Note this does not affect the closure feedback loop, which PRD Q20 has already fixed as public, feed-based and non-notified."

#### Why it matters

WRK-022 is marked MUST/MVP and the stack includes web-push (VAPID). On Android/Chrome this works in the browser. On iOS Safari it does not work at all unless the user installs the PWA to the home screen and grants permission — a multi-step flow that directly contradicts the frictionless, guest-first, "scan a QR and go" entry model the product is built around. If half the pilot cohort is on iPhone and never installs, a MUST requirement is silently non-functional for them, and the supervisor feedback loop (which the PRD identifies as existential to trust and repeat usage) never reaches them. This is a product decision disguised as a technical one and it needs answering before M4 builds the notification layer.

#### Evidence

Tender Pack WRK-022 / SCP-022 "Phone Notification Alerts | Live Worksite Warnings", priority MUST, Phase MVP. Tender Pack CQA-012 (SHOULD/Phase 1): "Worker trust depends on knowing that signals are seen/reviewed/actioned. A simple feedback/status loop is desirable for Phase 1." Talentica Slide 19: "Notifications | web-push (VAPID)" and "Web push (VAPID) | Notifications". Slide 14: "Supported Browsers | Safari (iOS) and Chrome (Android)". Slide 22 M4 PWA scope: "notifications, worker feedback loop". Dev Pack §10 requires Add to Home Screen support. No document acknowledges the iOS install prerequisite.

#### Options

1. Make home-screen install a prompted step in first-run onboarding for iOS, with in-app notification centre as the universal fallback for anyone who declines.
2. In-app notification centre + email digest only for MVP; defer push entirely to Phase 2 and re-grade WRK-022.
3. Push on Android only for MVP; document iOS as a known limitation to the pilot organisations.
4. Require all pilot users to install the PWA as a condition of participation.

#### Recommendation

Option 1. An in-app notification centre must exist regardless — it is the only mechanism that works for every user on every device, and it is cheaper than push. Push then becomes an enhancement layered on top for users who install, rather than a MUST that quietly fails on a large share of the cohort. Critically, do not let the acceptance criterion for WRK-022 be "push notification delivered" without qualifying the platform, because that criterion is untestable on a non-installed iOS device. This needs re-grading in the requirements matrix before M4.

---

### 59. frontend-performance-budget

> **Severity:** HIGH  |  **Blocks:** M1

#### Question

Narrow the question to the acceptance-measurement definition and drop the engineering-budget half.

Corrected question: "The <60s capture and <10s classification are stated as mandatory and as the Phase 1 Definition of Acceptance (Dev Pack §4, §13, §14), but no source defines how they will be measured. To make them testable at UAT we need four things agreed at M1: (a) Scope of the clock — Dev Pack §13 lists 'Enter the app / Capture in under 60 seconds / Classify it / See it appear in the feed' as sequential items; does the 60s cover only the capture step, or the whole chain from app entry (or from QR scan) to signal finalised? What are the exact start and stop events? (b) Reference conditions — which device (Slide 6 says 'personal mobile phone OR company issued rugged device'; these are not equivalent), which browser (proposal NFRs list Safari iOS / Chrome Android), which network profile given 'intermittent WiFi or patchy cellular', and warm or cold PWA cache? (c) Pass criterion — is this a median or a worst-case across N test users, and are testers trained or first-time? (d) Reconciliation of a contradiction in your own documents: SafeIn5.md states 'Capture takes under 30 seconds' at Step 3 but 'Under 60 seconds' later — which is the target? Talentica will set and enforce the underlying engineering budgets (bundle size, LCP/TTI, CI performance gates) as our own commitment and report them at M1; we only need the acceptance definition from you."

Two evidence corrections to the colleague's framing: (1) SafeIn5.md contains BOTH "under 30 seconds" (line 106) and "under 60 seconds" (line 214) — it is an internal contradiction in the client's document, which is stronger evidence than presenting the 30s as a separate claim. (2) The claim that "no document states a network profile or reference device" is correct, but should be paired with the positive finding that Talentica's own NFR table (Slide 14) contains no performance row at all — the gap is on both sides, which makes it a joint definition to agree rather than a client omission to complain about.

#### Why it matters

The <60s capture and <10s classification rules are stated as mandatory and as the acceptance test, but they are stated as end-user wall-clock times with no engineering budget behind them and no defined measurement method. A Next.js App Router PWA with Tailwind, Radix, TanStack Query, React Hook Form and a media capture layer can easily ship 400KB+ of JS; on a patchy quarry 3G connection that is 6-10 seconds to interactive before the worker taps anything. The clock on "60 seconds" starts when the camera comes up on the QR code, not when the React app hydrates. Without a budget agreed at M1 and enforced in CI, this is discovered at UAT when it is unfixable within the fixed price. There is also no agreed definition of what device, what network, and what starting event the stopwatch uses — so "under 60 seconds" is currently unarbitrable.

#### Evidence

Dev Pack §4 (MANDATORY): "Capture must be completable in under 60 seconds", "Classification must take <10 seconds", "Failure to meet these invalidates the product model." Dev Pack §13 Definition of Acceptance and §14 Success Metrics both restate the 60-second test. SafeIn5.md Step 3: "Capture takes under 30 seconds." Slide 6: "Has intermittent WiFi or Cellular Connectivity". Slide 11: "Frictionless capture in <60s. Low network connectivity resilience." No document states LCP, TTI, bundle size, network profile, reference device, or the start/stop events for the 60-second measurement.

#### Options

1. Contractual budget: LCP < 2.5s and TTI < 4s on Slow 4G throttling on a mid-tier Android reference device; initial route JS < 200KB gzipped; enforced by a Lighthouse CI gate on every PR. Acceptance stopwatch defined as: QR scan → signal submitted, on the reference device.
2. Softer budget: measured and reported per milestone with a target but no CI gate; acceptance measured on real devices during UAT with pilot workers.
3. No formal budget — rely on the UAT stopwatch test alone.
4. Budget defined at M1 after the UX design settles the number of screens.

#### Recommendation

Option 1, with the numbers agreed at M1 and the CI gate in place from the first PWA commit in M2. The key contractual addition is the definition of the measurement — reference device, network profile, and the exact start and stop events — because without it the single most important acceptance criterion in the project is a matter of opinion, and both parties will read it in their own favour at M5. Option 3 is how this project fails its headline metric.

---

### 60. definition-of-done-and-uat-defect-model

> **Severity:** HIGH  |  **Blocks:** M5

#### Question

Narrow to the acceptance/defect gate, and drop the coverage-target and DoD-mechanics parts (vendor should propose those, not ask). Suggested restatement: "Dev Pack §13 gives functional acceptance outcomes only, and proposal Slide 24 sets sign-off turnarounds but no defect provisions, while M5 (2 weeks, 15% of fee) is stated as 'defect resolution'. We will propose a P1-P4 severity taxonomy and fix turnarounds, and a per-milestone Definition of Done (automated test suite green, the measurable NFRs — 60s capture, 10s classification, zero mandatory fields — evidenced on staging, and handover documentation). Two things we need from SafeIn5: (a) confirmation that only P1/P2 defects (worker cannot capture, classify or submit a signal; data loss; anonymity or tenant-isolation breach) block milestone or final sign-off, with P3/P4 logged and not gating payment; and (b) an agreed line between a UAT defect fixed inside M5 at no cost and a change request or 'minor enhancement' that falls to the post-MVP T&M support team referenced on Slide 26, since the same 2-week window carries the final 15%." Evidence nits to fix: Slide 23 lists M5's deliverable as "Feedback incorporation and production rollout" (not "Features deployed on Staging", which applies to M2-M4), and Slide 24 does include two non-functional delivery SLAs (staging availability 95%, staging release at each milestone) — so "says nothing about defects" is the accurate charge, not "covers only sign-off turnaround".

#### Why it matters

M5 is 2 weeks and carries 15% of the fee, and its stated content is "defect resolution". Without an agreed severity taxonomy there is no way to distinguish a P1 (worker cannot submit a signal) from a P4 (button alignment), and no agreed timeframe for either. The predictable outcome is a stand-off at the final payment gate: the client withholds sign-off over an accumulation of cosmetic issues, or the vendor declines a genuine defect as a change request. Equally, "deployed on Staging" as a milestone deliverable is not a Definition of Done — it says nothing about whether tests pass, whether the non-functional criteria were measured, or whether documentation exists. The stack includes a serious test toolchain but no coverage or gate commitment.

#### Evidence

Talentica proposal Slide 24 SLAs cover only "Milestone Signoff – 3-5 business days", "Final MVP Signoff – 1-2 weeks", "UAT Closure – 2 weeks", "Scope freeze after discovery – 1 week", and change-request turnaround — no defect severity levels and no fix SLA. Slide 23: M5 = "End-to-end user acceptance testing, defect resolution and handover documentation", 2 weeks, 15% payment. Slide 19 Testing: "Jest + Supertest + Testcontainers (API); Playwright + Testing-Library (web)" with no coverage target. Slide 22 milestone deliverables state only "Features deployed on Staging". Dev Pack §13 acceptance lists four bullet outcomes with no defect provisions.

#### Options

1. Four-level severity model (P1 blocker / P2 major / P3 minor / P4 cosmetic) with fix SLAs of 1 / 3 / 5 / best-effort business days; sign-off gated on zero P1 and zero P2; P3/P4 carried to a backlog. Plus a Definition of Done: unit+integration tests green, one Playwright E2E per user journey, performance budget met, deployed and smoke-tested, docs updated.
2. Same severity model but sign-off gated only on zero P1, with P2 defects agreed as a fix list post-sign-off.
3. No formal model — manage defects collaboratively via the existing change-resolution SLA.
4. Extend UAT beyond 2 weeks with a defined defect burn-down instead of fixed severities.

#### Recommendation

Option 1. Agree it before contract, not at M5. Specifically insist that a defect is defined as "behaviour not matching the agreed requirement or design" while a change is "a new or altered requirement", and that the non-functional criteria (60s capture, 10s classification, performance budget) are P1-severity acceptance items rather than aspirations — otherwise the mandatory design rules in Dev Pack §4 have no enforcement mechanism despite the document stating that failing them "invalidates the product model".

---

### 61. test-and-seed-content-dependency

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Two precision fixes worth making before sending.

(1) The dependency starts at M2, not M3. Slide 23's M2 scope explicitly includes "basic content uploaded to test the PULSE flow", and M2 also carries the "Test data availability" responsibility. Frame the ask as two tranches: a minimal M2 tranche (PULSE prompt copy + a handful of sites/sub-sites, enough to exercise the flow) and the full M3 tranche (the ~20-30 Learn5 modules with media, rescue plans, and the ~30 QR context mappings).

(2) Rescue plans are SHOULD, not MUST. Tender Pack WRK-006 / SCP-006 grade Rescue Plan as SHOULD, "Approved with Amendment: Include it where content is available and simple to manage… contextual supporting information, not the primary innovation." Dev Pack 8.3/8.5 still require a working rescue plan route and at least one full confined-space example. So the correct ask is narrower and harder to refuse: how many rescue plans will actually be authored, and is the confined-space example guaranteed for M3?

(3) The "within SLA's" phrasing in Assumption 5 should be challenged directly — Slide 24 contains no test-data or content SLA, so Assumption 5 is currently unenforceable. Ask the client to agree a dated content-delivery SLA and to accept that late content triggers the change-request/schedule-relief path, since the vendor's own risk register omits it.

Suggested restatement: "Slides 23 and 25 make 'test data' a SafeIn5 responsibility for M2 and M3 and reference SLAs, but Slide 24 defines no content SLA and no document defines what test data means. Please confirm (a) the definition — Learn5 modules (count, media formats, file size, language) per Slide 14's ~20-30; PULSE prompt copy per context; rescue plan records carrying the six Dev Pack 8.3 fields, and how many; and the QR context mappings (site / sub-site / asset / task type / risk type) up to the 30 in Dev Pack 8.6, across 3 orgs x 3 sites; (b) the named owner on the SafeIn5 side; (c) firm dates — a minimal tranche by start of M2 for the PULSE flow, the full set by start of M3, including the confined-space example of Dev Pack 8.5; and (d) that late or incomplete content is handled as a schedule-relief event, since it is currently absent from the risk register."

#### Why it matters

Test data is listed as a SafeIn5 responsibility for M2 and M3 with no date and no definition. But for this product, test data is not filler — it is safety-critical authored content. Rescue plans must contain real immediate actions, roles, equipment and escalation contacts; Learn5 modules need real media. M3 is the milestone that builds QR routing, Learn5 consumption and contextual PULSE — it cannot be meaningfully built or demonstrated without representative content, and it cannot be UAT'd by workers with lorem ipsum. M3 is 3 weeks and carries 25% of the fee. A content delay of even a week converts directly into an M3 slip that the fixed price cannot absorb, and the vendor's own risk register does not list it.

#### Evidence

Talentica proposal Slide 23: M2 and M3 SafeIn5 Responsibility = "Test data availability and Feature signoff" (no date, no definition). Slide 25 Assumptions item 2: "Test Data for MVP validation to be provided by SafeIn5"; item 5: "SafeIn5 will provide timely access to decision makers, decisions and test data within SLA's" — but Slide 24 defines no test-data SLA. Slide 25 Risks lists only UX signoff and team availability. Slide 14 NFR: "Learn 5 Content | ~20-30 learning modules authored by SafeIn5". Tender Pack CQA-010: "SafeIn5 will provide initial Learn5 content." Dev Pack §8.6: "developers should assume a requirement for up to 30 unique QR context mappings for the MVP pilot". Dev Pack §8.3 specifies the rescue plan must include "location / asset, immediate actions, roles and responsibilities, required equipment, escalation contacts, version / review date".

#### Options

1. Content delivery plan with named dates: QR context mapping spreadsheet + 3 Learn5 modules + 1 full rescue plan by end of M2; full ~30 mappings, 20-30 Learn5 modules and all rescue plans by end of M3 week 1. Talentica supplies the templates in M1.
2. Talentica generates representative placeholder content for build and demo; SafeIn5 supplies real content only before UAT in M5.
3. Reduce the MVP content set to a single fully-authored exemplar context (confined space, per Dev Pack §8.3/§8.5) plus placeholders, with the remainder loaded operationally after sign-off.
4. No change — treat as-is and absorb slippage.

#### Recommendation

Option 1 combined with Option 3 as the contingency. Talentica should supply content templates and a QR-mapping spreadsheet during M1 so SafeIn5 knows exactly what to author and in what shape — most content delays are caused by the client not knowing the required format, not by unwillingness. Then make M3's acceptance depend only on the one fully-authored exemplar context that Dev Pack §8.5 already requires ("At least one full working example (e.g. confined space scenario)"), so bulk content lateness degrades the demo rather than blocking the milestone. Crucially, add "test/seed content not delivered on schedule" to the risk register with an explicit consequence — it is currently absent.

---

### 62. third-party-running-costs-ownership

> **Severity:** HIGH  |  **Blocks:** Pre-contract

#### Question

Corrected framing: Slide 25 Assumption 1 already establishes that SafeIn5 provides the cloud account for dev/staging/production, so cloud compute, media storage and egress are client-paid — do not ask who pays for those. Ask instead: (a) For the remaining named third parties that are NOT covered by the cloud account — speech-to-text provider, email sending (SES/SendGrid), Sentry, Mixpanel, Microsoft Clarity — are these contracted and paid by SafeIn5 directly, or procured by Talentica and passed through, and are their subscription costs inside or outside the GBP 45,000? Which tiers were assumed (free tiers of Mixpanel/Sentry/Clarity have event and error caps that a 50-60 user pilot may exceed)? (b) Since SafeIn5 owns the cloud bill, what per-user monthly STT minutes and media volume should be assumed for budgeting, given CQA-006/SCP-020 make voice transcription a MUST and CQA-007 makes video a MUST? (c) What media retention period applies? No retention limit appears in any document despite the NFR 30s video cap, so storage and egress on the client's own account grow without bound for the life of the pilot.

#### Why it matters

Seven paid third parties are named in the stack and none appears in the commercials. Two of them have real per-usage economics: STT is billed per audio minute on a voice-first product where voice is the preferred capture method, and video (30s clips, multiple per signal, retained indefinitely absent a retention policy) drives storage and egress that grows for the life of the pilot. Mixpanel and Sentry both have free tiers with event/error caps that a 60-user pilot may or may not exceed. If these are assumed to be inside the fixed price, the vendor carries an open-ended usage risk and will be incentivised to cap functionality; if they are pass-through, the client has an unbudgeted monthly bill they have never been shown. Either answer is fine — the absence of an answer is not.

#### Evidence

Talentica proposal Slide 19 Third Party Services: "Cloud AWS or GCP", "Email-sending service (e.g. SES / SendGrid)", "Speech-to-text provider | Voice-first capture transcription", "Web push (VAPID)", "Sentry", "GitHub Actions"; plus "Usage Metrics – Telemetry Capture | Microsoft Clarity, MixPanel". Slide 27: "The estimated cost of the MVP development is GBP 45,000 ... Variations from the estimate are expected to be within 15-20%" — with a milestone percentage table only. Slide 25 Assumptions mentions cost only for AI dev tools: "All estimates assume usage of AI tools such as cursor and claude code. The cost of tool is included in the estimates." No assumption covers third-party service costs. Tender Pack CQA-006 makes voice-first capture a MUST and SCP-020 makes transcription a MUST; NFR slide caps video at 30s but sets no retention limit.

#### Options

1. All third-party subscriptions and usage billed directly to SafeIn5's own accounts (cloud, STT, email, Mixpanel, Sentry); 45k covers engineering only. Talentica provides a monthly run-rate estimate at M1.
2. Talentica fronts all costs during M1-M5 and passes through at cost with an agreed cap; SafeIn5 takes over accounts at M5.
3. 45k is fully inclusive of all running costs to end of M5, with a stated usage envelope (e.g. X transcription minutes, Y GB storage) beyond which costs are pass-through.
4. Free tiers only — constrain the design to whatever Clarity/Mixpanel/Sentry free tiers allow.

#### Recommendation

Option 1, with an explicit run-rate estimate produced during M1 as a deliverable. It aligns with the existing assumption that SafeIn5 owns the cloud account, keeps the fixed price a pure engineering number, and means the client sees the true cost of operating the platform before the pilot — information they need anyway for Phase 2 pricing, which the tender says will be determined post-pilot. Ask specifically which STT provider and what per-minute rate was assumed, since a voice-first product's dominant variable cost is transcription and the choice also has a data-residency consequence (see the STT sub-processor finding).

---

### 63. stt-provider-residency-and-subprocessor

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Two evidence corrections, then a tightened framing.

Evidence: the "Anonymity enforced at database layer" phrase cited to Slide 18 actually appears in the NFR/Data Residency & Privacy row (proposal line 352), the same row as the EU residency commitment — which strengthens the point, since residency and anonymity are asserted in one breath. Also, "Speech-to-text provider" is one row in a Third Party Services table (proposal line ~451 onward); the proposal elsewhere lists "transcription dispatch" as an in-process background worker (line 474), which is a strong tell that the vendor has already assumed an ASYNC SERVER-SIDE CLOUD API, not on-device. The question should confront that inference rather than present the choice as still even.

Technical correction that must be built into the ask: the Web Speech API is NOT an on-device / privacy-preserving fallback. On Chrome for Android — the dominant browser for a UK quarry PWA — it streams audio to Google's servers, with no DPA, no region control, and no contractual retention guarantee. So framing it as "server-side vs on-device" is a false dichotomy: BOTH proposal options as written send audio off-device to a third party, and the browser route is the WORSE of the two for GDPR because it is uncontracted. iOS Safari support is also unreliable, so a Web-Speech-only design fails CQA-006's MUST for voice as the preferred capture method.

Suggested restatement: "Our voice-first capture (CQA-006 MUST, WRK-020) requires a transcription service, and the proposal commits to EU data residency with anonymity enforced at the data layer. WRK-020 leaves 'native device speech engine or cloud API' open, but the two are not equivalent: the browser Web Speech API streams worker audio to Google with no DPA and no region control, so it cannot satisfy the residency commitment and is unreliable on iOS. We therefore propose an EU-region contracted STT API with audio retention and model-training disabled, and audio deleted after transcription. We need from SafeIn5: (a) confirmation that adding a named STT sub-processor is acceptable and who signs/updates the DPAs with the three pilot operators; (b) whether the residency boundary is EU or specifically UK, since post-Brexit these are different obligations and the PRD records the market as UK-only; (c) whether raw audio may be retained at all after transcription, or must be deleted immediately; and (d) confirmation that recurring per-minute transcription cost sits outside the GBP 45k build price. If SafeIn5 has an existing approved-supplier or DPA position, name it and we will design to it."

#### Why it matters

Voice notes from workers are personal data, frequently containing names, site identifiers and safety-critical content, and they are captured under a platform promise of optional anonymity. Sending that audio to a US-hosted STT API silently breaks the "EU/UK data residency" NFR and adds a sub-processor that must be disclosed in SafeIn5's DPAs with the pilot quarry operators — a disclosure the client cannot make if nobody has named the vendor. Several major STT providers also retain audio for model improvement unless explicitly disabled, which would be a straightforward GDPR failure on a system whose anonymity claim is a headline trust feature. The architecture note in the proposal ambiguously offers both device-native engines and a cloud API, which are radically different privacy and cost profiles.

#### Evidence

Talentica proposal Slide 19: "Speech-to-text provider | Voice-first capture transcription" — unnamed. Slide 14: "Data Residency & Privacy | EU-based data residency with GDPR compliance ... Anonymity enforced at database layer". Slide 18: "Anonymity is enforced at the data layer for MVP purposes and masked in audit logs." Tender Pack WRK-020 Assumption/Discovery Note: "Integrates with native mobile device speech engines or a cloud transcription API" — both options left open. CQA-006 (MUST): "Voice memo should be treated as the preferred capture method for frontline workers." Dev Pack §15.4: "Data handling must comply with GDPR and Corporate privacy requirements." PRD §5.5 warns that overpromising anonymity is a larger trust risk than not offering it.

#### Options

1. In-region cloud STT (AWS Transcribe in eu-west-2 / Google STT in europe-west2) with model-improvement/data-retention explicitly disabled; documented as a named sub-processor.
2. On-device Web Speech API where available (no audio leaves the phone, zero marginal cost), with in-region cloud STT as the fallback — noting Web Speech on Android Chrome still routes to Google servers, so this is not automatically a privacy win and must be verified.
3. Any best-of-breed STT provider regardless of region, with a documented transfer mechanism (SCCs) in the DPA.
4. Defer transcription to Phase 2; store and play back raw audio in MVP with text as the typed alternative.

#### Recommendation

Option 1. Pin STT to the same region as the rest of the estate, explicitly disable any training/retention on the provider side, and name the provider in the contract so SafeIn5 can list it as a sub-processor to its pilot customers. Also decide now whether raw audio is retained after transcription or deleted — that decision interacts with both the retention policy and the pgvector/future-SIGNAL question, and it is much cheaper to decide before the media pipeline is built in M2 than to retrofit deletion later. Option 3 should be avoided: adding an international transfer to a UK safety pilot creates paperwork and reviewer questions out of all proportion to any accuracy gain.

---

### 64. gdpr-retention-export-delete-mechanics

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Two evidence corrections, neither fatal:

1. "No requirement ID covers data export, erasure or retention — there is no WRK or ADM requirement for a GDPR function at all" is slightly overstated. ADM-028 / SCP-052 "Delete/Block User" is a MUST for MVP ("blocking/removing where needed"), and ADM-034 / SCP-058 "Delete observations" is a SHOULD. The accurate criticism is not that deletion is absent, but that these are *moderation/admin-hygiene* requirements that say nothing about what deleting a user does to their signals, media, or audit entries — i.e. a delete button exists in scope with no defined semantics, which is arguably worse than nothing.

2. "Anonymous signals... by design have had the user link stripped and therefore cannot be found" overstates the MVP design. The Talentica proposal explicitly scopes MVP anonymity down: "Anonymity is enforced at the data layer for MVP purposes and masked in audit logs. True anonymity will require masking of location, non-reversal by the admins etc. which is not considered as a part of MVP" — and SafeIn5-PRD.md §5.5 carries this forward: "administrators may retain technical means of correlation." So in MVP the link may well still be resolvable, which creates the *opposite* problem to the one stated: a signal presented to the worker as anonymous may still be reachable by an erasure request, meaning the anonymity promise and the erasure mechanism must be reconciled deliberately.

Suggested restatement: "Three things only you can decide, needed before the M2 data model is fixed rather than at M4: (a) concrete retention periods for signals, photo/video media, voice audio and transcripts, audit logs, and dormant Community/guest accounts; (b) who is data controller for Corporate tenant data versus the free Community tenant, and therefore whose retention policy governs each; (c) whether 'export' and 'delete' must be self-service worker functions in the PWA, admin-console functions, or a manual back-office process on request — none of these exist as a requirement or screen today, so a self-service function is unpriced scope. We will propose the architecture ourselves — separating identity from event records so an append-only audit log survives erasure via identifier tombstoning — but we need your confirmation on one consequence: because MVP anonymity is data-layer masking rather than true non-reversibility (per our own proposal and PRD §5.5), an erasure request may still reach signals the worker was told were anonymous. Confirm whether erasure should reach those signals, or whether anonymised signals are treated as out of scope for erasure and this is stated to pilot workers up front."

#### Why it matters

"Export, delete, and retention policies" is asserted as a delivered NFR but is not decomposed anywhere into a requirement, a screen, or a milestone task — while "GDPR compliance" appears once, as three words inside M4's activity list. There are genuine design conflicts hiding here: append-only audit logging is stated as a requirement, and GDPR erasure is stated as a requirement, and they contradict each other unless the design deliberately separates identifiers from events. Similarly, if a worker requests erasure, what happens to their anonymous signals — which by design have had the user link stripped and therefore cannot be found? These are architecture decisions that must land in M2's data model, not compliance paperwork that can be written in M4. Guessing wrong means either a schema migration late in the build or a compliance claim the system does not actually support.

#### Evidence

Talentica proposal Slide 14: "EU-based data residency with GDPR compliance, including export, delete, and retention policies. Anonymity enforced at database layer, tenant-based isolation between Community and Corporate data. Append-only audit logging enabled." Slide 22 M4: "...moderation, reporting, GDPR compliance, deployment readiness" — the only other mention. Dev Pack §7: "Audit logging", "Security and GDPR compliance", "Anonymity must be handled by stripping user metadata at the DB level when the 'Anonymous' flag is active", and workflow rule "Full audit trail maintained". Dev Pack §15.4: "Anonymous and confidential reporting modes should be supported." No requirement ID in the Worker or Admin sheets covers data export, erasure or retention — there is no WRK or ADM requirement for a GDPR function at all.

#### Options

1. Minimal defensible MVP: retention = signals/media 24 months, voice audio deleted after transcription, audit logs 7 years with pseudonymous actor IDs; erasure handled as an admin-initiated function that anonymises the user record and detaches identifiers, leaving signals in place as anonymous; export as an admin-generated per-user JSON/CSV. Documented in a privacy notice shown at first use.
2. Full self-service: worker-facing export and delete buttons in the PWA profile, plus admin equivalents.
3. Manual process only for the pilot: DSARs handled by SafeIn5 via a support request to Talentica, with a documented SQL runbook; no in-product functionality.
4. Defer to Discovery.

#### Recommendation

Option 1. At 60 pilot users, admin-initiated fulfilment (Option 1/3) is legally sufficient and dramatically cheaper than self-service, but the retention periods and the erasure-vs-audit-log design must be decided at M2 because they determine the schema — specifically that audit rows reference a pseudonymous actor ID rather than embedding names, which is the standard way to make append-only and erasure coexist. Also decide explicitly that anonymous signals survive erasure (they contain no personal data by construction) and state that in the privacy notice, so workers understand that anonymous sharing is genuinely irreversible in both directions. Deferring this to M4 as the current plan implies is the expensive path.

---

### 65. security-review-before-pilot-golive

> **Severity:** HIGH  |  **Blocks:** M5

#### Question

The question is sound; tighten the citation. Instead of "Slide 23/24 contain no security-testing deliverable", cite the authoritative gate: Dev Pack §13 "Phase 1 Definition of Acceptance" lists only functional/delivery conditions (capture under 60s, classify, feed, QR routing to PULSE/Rescue Plan/Learn5, backend APIs operational, media upload, data persistence, working staging environment, source code handed over, basic documentation) and contains no security condition — while §7 mandates "row level security (RLS) to ensure strict data segregation between community and corporate layers" and §15.4 requires GDPR-compliant handling and anonymous/confidential reporting modes. So an explicitly load-bearing isolation and anonymity control has no stated verification method or acceptance evidence. Suggested phrasing: "Dev Pack §13 defines Phase 1 acceptance in purely functional terms, yet §7 makes RLS-based tenant isolation and §15.4 makes anonymity contractual promises. Before real workers use the system in production, do you require (a) an independent penetration test, or at minimum (b) automated dependency/SAST scanning in CI plus a written threat model and documented tenant-isolation test suite proving cross-tenant reads fail? Who funds it — is it inside the GBP 45k or a client-procured third party — and does it become a condition of M5 sign-off?" Also worth flagging in the same question: a DPIA, a controller/processor DPA per pilot org, and named EU/UK data-residency region are equally absent and are the other artefacts pilot customers will ask for.

#### Why it matters

The build hand-rolls authentication, enforces multi-tenant isolation via row-level security, makes an anonymity promise to workers, and processes personal data across 3 unrelated commercial organisations on one database. A row-level-security misconfiguration that leaks one quarry operator's signals into another's feed is a commercial and contractual catastrophe for SafeIn5 with its pilot customers, and it is exactly the class of bug that functional UAT does not find. No document mentions security testing of any kind. Pilot customers in the extractive sector will very likely ask for evidence during their own onboarding, and discovering that requirement after M5 means either delaying the pilot or answering "none".

#### Evidence

Talentica proposal Slide 19 Testing: "Jest + Supertest + Testcontainers (API); Playwright + Testing-Library (web)" — functional testing only. Slide 17 Security & Access Layer: "API Gateway, Authentication, Authorization, Identity Management, Roles, Tenancy, Audit Logging". Slide 19: "Authentication | Custom magic-link + email OTP + JWT". Dev Pack §7 Storage: "For structured data, utilise, row level security (RLS) to ensure strict data segregation between community and corporate layers" and Requirements: "Data segregation (community vs corporate)", "Security and GDPR compliance". Slide 14: "tenant-based isolation between Community and Corporate data". Slide 23/24 contain no security-testing deliverable or gate.

#### Options

1. Third-party penetration test before production go-live, commissioned and paid by SafeIn5, with P1/P2 remediation by Talentica included in the fixed price.
2. In-scope engineering assurance only: automated dependency scanning and SAST in the GitHub Actions pipeline, plus a written threat model and an explicit automated test suite proving cross-tenant isolation (a test that authenticates as tenant A and asserts it cannot read tenant B's rows). No external test.
3. Both — Option 2 during the build as a Definition-of-Done item, Option 1 as a client-funded gate before pilot go-live.
4. No security assessment for the pilot.

#### Recommendation

Option 3, with Option 2 as the non-negotiable minimum inside the 45k. The automated cross-tenant isolation test suite in particular should be a contractual Definition-of-Done item from M2 onward — it is cheap, it runs on every commit, and it is the only reliable defence against the highest-consequence failure this architecture can produce. An external pen test is genuinely optional for a 60-user pilot and can reasonably be client-funded and scheduled between M5 and go-live, but the decision should be made now rather than discovered when a pilot organisation's IT department asks the question.

---

### 66. ip-handover-oss-licensing-and-documentation-definition

> **Severity:** HIGH  |  **Blocks:** Pre-contract

#### Question

Recommended restatement, narrowed to what only the client can decide: "Dev Pack §13 makes 'Source code handed over' and 'Basic documentation provided' acceptance criteria, and Talentica M5 ties handover documentation to the final 15% payment, but neither document defines either term or states who owns the resulting IP. Please confirm for the contract: (a) that all source code, IP and derived assets are assigned to SafeIn5 on final payment; (b) whether the Git repository is created under a SafeIn5-owned org from day one or transferred at M5; (c) whether cloud accounts, domains, and third-party service accounts (email provider, speech-to-text, Sentry, Mixpanel, Clarity, object store) are opened in SafeIn5's name or the vendor's and transferred; (d) how production secrets and infrastructure-as-code are handed over; and (e) the minimum documentation set that satisfies acceptance — we propose README plus local setup, architecture overview, data model / ERD, API reference, environment and deploy runbook, and a QR-mapping admin guide. Separately, we will assert (not ask) that the dependency set is permissive-licensed only, with no copyleft or commercially-restricted component in the production build."

#### Why it matters

"Source code handed over" and "Basic documentation provided" are named acceptance criteria with no definition, and they gate the final 15% payment. "Basic documentation" could mean a README or a full architecture-plus-runbook set, and the two parties will read it differently at exactly the moment money changes hands. IP assignment is never stated at all — the proposal is silent on who owns the resulting code, which for a client whose stated long-term defensibility is the platform and its data is an unacceptable gap. On licensing, the stack is mostly permissive (MIT/Apache), but Radix, shadcn/ui, sharp, and any chosen QR or media library need a one-off audit, and some analytics/telemetry SDKs carry commercial terms; a copyleft dependency reaching production would be a real problem for a future SaaS product.

#### Evidence

Dev Pack §13 Definition of Acceptance, Delivery: "Working staging environment / Source code handed over / Basic documentation provided" — no further definition anywhere. Dev Pack §9 Deliverables: "Working MVP, Backend APIs, Deployment environment, Documentation". Talentica Slide 23 M5: "defect resolution and handover documentation", 15% payment. Slide 19 lists ~20 third-party libraries and services with no licence statement. Nothing in either document addresses IP ownership, repository ownership, or licence compliance. Tender Pack CQA-001 requires the architecture to support future models "without rebuild", and QA-002 confirms future SaaS monetisation intent — both of which presume SafeIn5 owns the code.

#### Options

1. Full handover package defined in the contract: SafeIn5-owned GitHub organisation from day one (Talentica works in it), full IP assignment on final payment, plus a defined documentation set — architecture overview, data model/ERD, API reference, environment & deployment runbook, local dev setup, operational runbook (backup/restore, secret rotation, incident basics), and an OSS licence inventory.
2. Talentica-owned repo during the build, transferred at M5 with the same documentation set and IP assignment.
3. Code + README only, matching the literal "basic documentation" wording, with deeper documentation as a paid add-on.
4. Leave as-is and negotiate at M5.

#### Recommendation

Option 1. SafeIn5 owning the repository from the first commit costs nothing, removes any handover event risk, gives the client continuous visibility of progress against milestones, and makes IP ownership unambiguous throughout. Enumerate the documentation artefacts in the contract — the six items above are a reasonable definition of "basic" for a platform intended to be extended in Phase 2 by potentially different developers, and enumerating them protects both parties from the M5 argument. Require an OSS licence inventory (a `license-checker` output plus a note on anything non-permissive) as a one-line M5 deliverable; it takes an hour and forecloses a real risk to a product intended for commercial resale.

---

### 67. availability-target-and-failsafe-rescue-access

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Drop parts (a), (b) and (d) and ask only the read-path question:

"Dev Pack §4 and CQA-008 scope low-connectivity handling to signal CAPTURE only, and the proposal excludes offline-first capture/sync. Neither addresses reading safety-critical content offline, yet Dev Pack §8.3/§8.5 place the Rescue Plan behind a QR at a confined-space entry, SafeIn5.md states connectivity is patchy, and Dev Pack §10 requires PWA 'offline capabilities' without defining scope. When a worker scans a confined-space QR and the platform or network is unreachable, what must they see? (i) A browser/network error (no offline read support). (ii) A service-worker-cached copy of the Rescue Plan and Learn5 content for QR contexts previously visited on that device, shown with a visible 'last updated' timestamp and 'may be out of date — check the posted copy' banner. (iii) Pre-cached Rescue Plan content for all QR contexts at the worker's assigned site, cached on first app load rather than first visit. Our recommendation is (ii): it is achievable within the PWA already scoped and does not require offline-first capture. We need your confirmation because displaying a potentially stale rescue plan is a safety-assurance decision, not an engineering one — if a cached plan is unacceptable, we will implement (i) and route the worker to the physical copy."

Handle availability/RTO/RPO separately as a vendor-stated default in the contract schedule (not a client question), and record the physical/printed rescue plan as an operational assumption under the QA-004 precedent.

#### Why it matters

Dev Pack §4 says only 'signal capture in low-connectivity environment' — the offline requirement is framed entirely around capture, and nobody has considered offline READ of safety-critical content. A quarry with patchy cellular is exactly where a QR at a confined space will fail to resolve. Caching the rescue plan in the service worker is cheap if decided in M3 and awkward afterwards; the alternative is to state plainly that SafeIn5 is not a fail-safe source of emergency procedure and that the printed plan remains authoritative — which is a client policy statement, not ours. Separately, a production system carrying pilot safety data with no stated RPO and no tested restore is a gap the pilot organisations' IT functions will raise.

#### Evidence

Talentica Slide 24 'Environment availability | Staging availability – 95% | Production roll out – Milestone 5' — no production availability figure. Slide 19 'Backup | Managed database backups' with no RPO/RTO or restore test. Dev Pack §4 'Offline Support: The system should allow for signal capture in low-connectivity environment. Full offline capability is not required for Phase 1' — capture only. Dev Pack §8.3/§8.5 place the Rescue Plan behind a QR at a confined space entry. Dev Pack §10 requires PWA 'Add to Home Screen and offline capabilities'. SafeIn5.md 'Connectivity: Intermittent WiFi / patchy cellular network'.

#### Options

1. No offline read; a plain error screen with a 'follow your printed site procedure' instruction (zero build, requires SafeIn5 to own the wording and the printed fallback)
2. Service-worker cache of the rescue plan and PULSE prompt for any context the device has previously resolved, shown with a 'cached — verify with site lead' banner (small M3 addition, real safety benefit)
3. Pre-cache all rescue plans for the worker's assigned site on first authenticated load (larger payload, works for first-time access at a context)
4. Full offline-first — explicitly Phase 2 per CQA-008

#### Recommendation

Option 2, plus a stated production availability target of 99.5% during the pilot with a documented RPO of 24 hours and one tested restore before go-live, and SafeIn5 confirming that a printed rescue plan remains at each confined-space location as the authoritative fail-safe. Option 2 is a few days of work in M3 and is the difference between a degraded experience and no emergency information at all.

---

## H. Scope, Delivery & Commercial Risk

### 68. no-pilot-in-plan

> **Severity:** CRITICAL  |  **Blocks:** M5

#### Question

One citation needs tightening: Milestone 5 is not purely UAT — its Talentica responsibility column reads "Feedback incorporation and production rollout" (line 556), so production deployment IS inside the 14 weeks. The gap is not deployment, it is the absence of any elapsed live-usage window after deployment. Restate as: "Milestone 5 includes production rollout but the engagement ends at MVP sign-off, with no defined period of live use on real sites afterwards. Repeat usage — the stated primary success measure (Dev Pack §14; Success Metrics 'Repeat Usage' MUST; QA-001) — cannot be observed at the moment of sign-off. Please confirm: (a) is there a field pilot window after production rollout, and how long (how many shift cycles)? (b) who owns pilot execution — recruiting and onboarding the ~50-60 workers across 3 orgs x 3 sites, producing and siting the ~30 physical QR codes (explicitly excluded from vendor scope), and running the on-ground feedback interviews described in QA-003? (c) what defect-response cover applies during that window — is it inside the 45k or the T&M post-MVP support team (Slides 21/27)? and (d) what repeat-usage threshold over what period constitutes pilot success, given targets are currently deferred to post-pilot baselining?"

#### Why it matters

This is the largest gap between the commercial proposal and the stated purpose of the MVP. Dev Pack §14 says 'The primary success measure is repeat usage, not feature completion.' Repeat usage is by definition unmeasurable at the moment of UAT sign-off — you need weeks of real shifts. As written, SafeIn5 pays 45k for a product that is contractually complete while being incapable of proving the one thing it was built to prove. It also means defects found in the field fall outside any agreed responsibility.

#### Evidence

Dev Pack §14 'Repeat usage (same user shares multiple Behaviour Signals)... The primary success measure is repeat usage, not feature completion.' Success Metrics sheet: 'Repeat Usage — Evidence that workers use SafeIn5 more than once and do not treat it as a one-off trial — MUST'. QA-001: 'evidence of repeat engagement across a small number of UK quarry/extractive pilot sites'. Talentica Slide 23: Milestone 5 = 'End-to-end user acceptance testing, defect resolution and handover documentation', 2 weeks, ending in 'MVP signoff'. Slide 21/27: 'Post MVP support - A support team to be setup on T&M basis post the MVP delivery'. No pilot appears in any milestone.

#### Options

1. Add Milestone 6 — Field Pilot: 4–6 weeks post-production-rollout with a named support rota, weekly metrics readout against the Success Metrics sheet, and a fixed pilot-support fee.
2. Keep 14 weeks but contract a separate, pre-agreed T&M pilot-support SOW (rate card, response times, capacity per week) signed at the same time as the build contract, so it cannot be re-negotiated from a position of weakness.
3. Move production rollout earlier (end of M4) and run the pilot in parallel with M5 UAT, so real usage data exists before final sign-off.
4. Accept that repeat usage is measured outside the contract and formally downgrade it from an MVP success criterion.

#### Recommendation

Option 3 plus Option 2. Rolling to production at end of M4 and running a live pilot alongside M5 gives you real repeat-usage data to accept the MVP against, and turns UAT from a lab exercise into field validation. Then have a pre-signed pilot-support SOW so the support model is not negotiated after the vendor's team has demobilised. Do NOT accept Option 4 — it hollows out the MVP's purpose.

---

### 69. wrk-022-predictive-alerts-corrupt-row

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Sharpen the ask so it forces a scope decision rather than a diagnosis, and add the missing dependency + vendor-conflict citations:

"WRK-022 / SCP-022 'Predictive Safety Alerts' is priced and prioritised as MUST/MVP, but its Decision, Detailed Requirement Statement, Strategic Reasoning and Community/Corporate columns are a verbatim duplicate of the voice-to-text row (WRK-020/SCP-020). The only text unique to it is the Functional Description: 'Automatically pushes direct pop-up alerts or text warnings to the worker's device if an urgent safety hazard cluster is flagged in their zone.' That feature depends on ADM-041/SCP-065 Risk Cluster Identification, which you have marked WON'T / out of MVP scope, and its sibling WRK-023/SCP-023 states 'Predictive alerts should not be in MVP.' Our proposal likewise lists predictive nudges and auto-generated push notifications as Phase 2.

Please confirm one of: (a) SCP-022 is a copy-paste error and its true MUST/MVP content is the voice/text caption already covered by SCP-020 — i.e. it is a duplicate and carries no additional build; (b) SCP-022 should be re-priced to COULD/Phase 2 alongside SCP-023; or (c) you want a reduced, rule-based MVP substitute, in which case please define it as the worker-facing half of ADM-040/SCP-064 (e.g. web push to workers whose current QR context matches a site/sub-site where N 'Needs Attention Now' signals occurred within a time window, explicitly not labelled predictive) and confirm N, the window, the audience and whether that is MVP or Phase 1.

Separately, please confirm what worker-facing push notification IS in MVP scope at all, since the PRD's only notification decision (Q20) is that closure is shown publicly in the feed with no individual notification, for anonymity reasons."

#### Why it matters

This is one of the 48 MUSTs and its requirement text describes a different feature entirely. The Functional Description asks for push alerts on 'urgent safety hazard cluster' detection in a worker's zone — that is cluster detection plus zone matching plus push delivery, which is arguably SIGNAL intelligence explicitly deferred to Phase 2. Meanwhile WRK-023 (the same alerting family) is COULD/Phase 2 with a Decision that says 'Predictive alerts should not be in MVP'. Someone will read SCP-022 as MUST at UAT and it will not exist.

#### Evidence

WRK-022 Functional Description: 'Automatically pushes direct pop-up alerts or text warnings to the worker's device if an urgent safety hazard cluster is flagged in their zone.' Priority MUST/MVP. Its Decision column reads: 'SafeIn5 agrees that the signal needs a message/caption, but voice should be prioritised over typing...' — identical to WRK-009/WRK-020. WRK-023 Decision: 'Predictive alerts should not be in MVP because they imply analytics maturity that the platform will not yet have.' ADM-040/SCP-064 'Proactive Intervention Trigger' = SHOULD, Phase 'Phase 1 / Phase 2', Decision 'Discovery Workshop Decision'. CQA-009 AI Scope = WON'T.

#### Options

1. Correct SCP-022 to WON'T/Phase 2 (aligning it with WRK-023 and CQA-009) and issue a corrected Decision Register — MUST count drops to 47.
2. Redefine SCP-022 as a simple, non-predictive rule-based push: 'N Needs Attention Now signals in the same sub-site within X hours triggers a web-push to users assigned to that sub-site' — merged with ADM-040 as one requirement, priced explicitly.
3. Keep SCP-022 as MUST as literally described (cluster detection + zone matching + push) and re-price the milestone plan accordingly.

#### Recommendation

Option 2. It is the only reading that delivers value without contradicting CQA-009's WON'T on AI, and it matches ADM-040's own guardrail ('It must not be presented as predictive AI'). But make it one merged requirement with a stated threshold rule and a named owner for configuring the threshold — otherwise you pay twice for the same alert engine and still argue at UAT. Note this also forces a decision on web-push on iOS Safari, which requires the PWA to be home-screen installed — that constraint must be written into acceptance criteria.

---

### 70. dependency-register-with-dates

> **Severity:** HIGH  |  **Blocks:** M3

#### Question

Two precision fixes. (1) The Talentica assumption says access "within SLA's" but no SLA is defined in any source document — the question should call that out explicitly rather than only noting "no dates", since the contract currently references a non-existent instrument. (2) Rescue plan content: Dev Pack §8.3 specifies the field structure but the pack nowhere states who authors rescue plan content — unlike Learn5 (CQA-010) and QR placement (QA-004), there is no client acceptance of ownership at all, so for rescue plans the question must first establish the owner, not just the date. Suggested restatement: "The pack assigns Learn5 content (CQA-010) and physical QR placement (QA-004) to SafeIn5, and Talentica's assumptions add cloud account, test data and decision-maker access 'within SLA's' — but no SLA is defined and no item has a date, quantity or named owner. Rescue plan content (Dev Pack §8.3) has no stated owner at all. Will SafeIn5 issue a dated dependency register naming an owner and a due date for each — cloud accounts (dev/staging/prod), test data, 20–30 Learn5 modules, rescue plans for the pilot contexts, the ~30 QR context mappings, physical QR printing and placement, pilot site access, and named decision-makers with a response SLA — with each item due before the milestone that consumes it (cloud/test data before M2; Learn5, rescue plans and QR mappings before M3; placement and site access before M5 UAT)?"

#### Why it matters

Every one of these is a schedule dependency the vendor has assumed away with a single sentence and no date. Learn5 content and rescue plan content are the sharpest: M3 delivers 'Learn 5 consumption' and the QR journeys, but if the 20–30 modules and the confined-space/lift rescue plans do not exist as authored content by start of M3, the team builds against lorem ipsum and the acceptance test cannot run. Physical QR placement is an operational dependency SafeIn5 has already accepted, but with no date it silently becomes a pilot blocker.

#### Evidence

Talentica Assumptions 1, 2, 5 (Slide 25): 'SafeIn5 will provide Talentica with the cloud account for the dev, staging and production environments'; 'Test Data for MVP validation to be provided by SafeIn5'; 'SafeIn5 will provide timely access to decision makers, decisions and test data within SLA's' — no dates, no quantities, no owner. NFR Slide 14: '~20–30 learning modules authored by SafeIn5 and uploaded into the system'. CQA-010: 'SafeIn5 will provide initial Learn5 content.' Dev Pack §8.6: 'developers should assume a requirement for up to 30 unique QR context mappings for the MVP pilot.' QA-004: 'QR placement will primarily be an operational responsibility managed by SafeIn5 in collaboration with the client site representative/safety lead... printed and physically placed by the site team/SafeIn5 pilot lead.' Dev Pack §8.3 specifies rescue plan fields (location/asset, immediate actions, roles, equipment, escalation contacts, version/review date) but no content is provided.

#### Options

1. SafeIn5 issues a dated dependency register as a contract schedule: cloud account by M1 day 1; test data + named decision-maker by M1 day 1; 5 pilot Learn5 modules + 1 rescue plan by start of M3 with the full 20–30 by start of M4; 30 QR mappings as a signed spreadsheet by mid-M3; site access + physical QR placement complete before pilot start.
2. Talentica supplies placeholder/sample content for all of the above and SafeIn5 replaces it before pilot — content becomes a pilot-readiness dependency rather than a build dependency.
3. Content authoring is added to Talentica's scope as a priced service (structuring/uploading SafeIn5-supplied raw material into Learn5 cards and rescue plan templates).

#### Recommendation

Option 1 as the register, plus Option 2 as the fallback for build purposes (build against sample content so the schedule never blocks on authoring), and get Option 3 quoted as an option now — 20–30 modules plus rescue plans is a real authoring workload and SafeIn5 has no stated capacity for it. Attach the register to the contract with the day-for-day clause from the SLA finding, so a late dependency has a defined, non-negotiable effect.

---

### 71. ai-tooling-qa-model-and-ip

> **Severity:** HIGH  |  **Blocks:** Pre-contract

#### Question

Narrow to IP, confidentiality and data-protection contracting; drop team composition and headcount.

"The Dev Pack's MVP definition-of-done (p.12, Delivery) requires only that 'Source code handed over'. Handover is not ownership — absent a written assignment, copyright in the delivered code stays with Talentica. Given SafeIn5 treats PULSE and SIGNAL as proprietary IP and intends to license the platform to corporate tenants long-term, please confirm the intended position on: (a) assignment of all IP and copyright in the delivered source code, designs and documentation to SafeIn5 on payment, and what (if any) pre-existing vendor components or OSS remain under licence rather than assignment; (b) confidentiality treatment of SafeIn5 proprietary content and any pilot worker data when processed through third-party AI coding or speech-to-text services (Assumption 6, Slide 25, prices in the use of tools such as Cursor and Claude Code; the STT provider is unnamed on Slide 19) — including whether such content may be sent to third parties at all, and a named sub-processor list; (c) the warranty and indemnity position on third-party/AI-generated code infringing third-party rights; and (d) the GDPR contracting chain required by NFR Slide 14 ('EU-based data residency', 'Anonymity enforced at database layer') — controller/processor roles, a DPA, and the lawful transfer basis for any access from outside the EU/UK."

#### Why it matters

The vendor has priced the project on an AI-tooling productivity assumption — meaning the 45k depends on it. That is fine, but it makes the review model a commercial term, not an internal detail: if the productivity assumption fails, either quality drops or the price moves. On a safety-adjacent product handling worker identity under GDPR, 'AI wrote it and nobody senior reviewed it' is an unacceptable answer. Separately, IP ownership and source-code assignment appear in no document at all, despite the Dev Pack requiring 'Source code handed over' — handover is not the same as ownership.

#### Evidence

Talentica Assumption 6 (Slide 25): 'All estimates assume usage of AI tools such as cursor and claude code. The cost of tool is included in the estimates.' No team composition, seniority mix or headcount appears anywhere in the proposal. Slide 19 lists test tooling (Jest, Supertest, Testcontainers, Playwright, Testing-Library) but no test strategy, coverage target, code review policy, or security review. Dev Pack §13: 'Source code handed over' — with no IP assignment clause. NFR Slide 14 requires 'EU-based data residency with GDPR compliance' and 'Anonymity enforced at database layer'.

#### Options

1. Contract the QA model: named tech lead with mandatory human review on 100% of PRs, a stated automated coverage floor on the anonymity/tenancy/RLS and auth paths specifically, a documented device test matrix (iOS Safari + Android Chrome versions), and one independent security review before production rollout — priced now.
2. Lighter: mandatory human PR review plus a security review of auth, tenant isolation and anonymity code paths only; no coverage floor.
3. Accept the assumption as-is and rely on UAT to catch defects.
4. Require named team composition (roles, seniority, FTE allocation per milestone) as a contract schedule, with change-of-key-personnel notice.

#### Recommendation

Option 1 combined with Option 4. Ask specifically for a security review of the row-level-security / tenant-isolation implementation before production, because a cross-tenant data leak between three competing quarry operators is a commercial extinction event for SafeIn5 and would not be caught by functional UAT. Separately and urgently: add an explicit IP assignment clause — full ownership of the source code, designs and documentation vesting in SafeIn5 on payment, with a warranty that AI-tool usage does not encumber that. This is currently absent from every document.

---

### 72. gdpr-in-one-phrase

> **Severity:** HIGH  |  **Blocks:** M4

#### Question

Two evidence refinements, both strengthening the question rather than undermining it. First, the NFR is not silent on everything: Proposal line 352 does say "including export, delete, and retention policies", so the question should not imply GDPR appears only as a bare phrase — it should acknowledge that line and press on (a) what "export" and "delete" mean as testable acceptance criteria (self-service worker DSAR in the PWA? admin-triggered? SLA?), (b) what the actual retention periods are per data class (signal, photo, voice recording, transcript, audit event, geolocation), since no number appears anywhere, and (c) how "delete" reconciles with the same sentence's "append-only audit logging" and Dev Pack §7's irreversible DB-level metadata stripping — including the harder case that an anonymised signal cannot be located to erase it. Second, the question should cite Proposal line 434 (the Assumptions row) as the vendor's only stated privacy position and ask the client to confirm or reject it, because it explicitly de-scopes true anonymity and concedes admin reversibility, which directly conflicts with the Dev Pack's psychological-safety and anonymous-reporting commitments. The responsibility-split half of the question stands unaltered: which of DPIA, ROPA, privacy notice, consent wording, DPA and the lawful-basis determination is SafeIn5's as controller, and which is Talentica's, and which are in the GBP 45k.

#### Why it matters

GDPR here is not a checkbox: the platform processes worker photos and voice at named worksites, with an anonymity promise, geolocation where permitted, and append-only audit logs. Right-to-erasure against an append-only audit store and against anonymised signals is a genuine engineering design problem, not a late-milestone task. Pricing it as one word in the densest milestone means it has almost certainly not been estimated. The legal exposure sits with SafeIn5 as controller, not the vendor.

#### Evidence

Talentica Slide 22 M4: '...moderation, reporting, GDPR compliance, deployment readiness.' NFR Slide 14: 'EU-based data residency with GDPR compliance, including export, delete, and retention policies. Anonymity enforced at database layer, tenant-based isolation... Append-only audit logging enabled.' Dev Pack §7: 'Anonymity must be handled by stripping user metadata at the DB level'; 'Audit logging'; 'Security and GDPR compliance'. Dev Pack §5/§15.4 note optional geolocation attachment and that 'Data handling must comply with GDPR and Corporate privacy requirements.' No requirement ID in the Tender Pack covers DSAR, erasure, retention or consent — none of the 48 MUSTs is a privacy requirement.

#### Options

1. Split GDPR into named, ID'd deliverables with owners: Talentica builds (a) per-user data export, (b) erasure that reconciles with append-only audit logs and anonymised signals, (c) configurable retention with automated purge of media, (d) consent capture for geolocation and media; SafeIn5 owns privacy notice, DPIA, ROPA and the DPA. Move (b) and the audit-log design into M2 as schema decisions.
2. Keep GDPR in M4 but reduce MVP scope to: data export + hard delete + a stated fixed retention period, with DPIA/ROPA/notice owned by SafeIn5 and no automated retention enforcement.
3. Treat full GDPR tooling as post-MVP, relying on manual admin/DB processes during a 60-user pilot under a documented interim procedure.

#### Recommendation

Option 1, with the erasure-vs-audit-log design pulled into M2. Deciding in week 12 how erasure interacts with an append-only audit store and with metadata-stripped anonymous signals means redesigning the schema built in week 6. Also flag: SafeIn5 is the data controller and needs a signed DPA with Talentica plus a DPIA before any real worker data enters the pilot — neither appears in any document, and the DPIA is arguably mandatory here given systematic monitoring of workers at work.

---

### 73. worker-onboarding-training-and-rollout

> **Severity:** HIGH  |  **Blocks:** M5

#### Question

Narrow to build scope only, and drop the "add to home screen" claim (Dev Pack §10 already mandates PWA Add-to-Home-Screen support as a costed line item):

"No document in scope or out-of-scope covers a first-run experience or an in-app help surface for the worker PWA. Please confirm whether the following are inside the GBP 45k MVP build, so they can be sized in M1:
(a) A short first-run introduction for new workers, including priming for camera/microphone permissions before capture is first attempted.
(b) An in-app statement of what anonymity does and does not mean. PRD §5.5 records that MVP anonymity is display-level and data-layer enforced only, that administrators may retain technical means of correlation, and that this 'must be stated honestly to pilot workers'. If this is to be an in-app screen rather than an induction talking point, SafeIn5 must supply the approved wording — Talentica cannot author a privacy representation on SafeIn5's behalf.
(c) Any in-app help or support/contact route for a worker who loses access mid-pilot (e.g. a 'need help' link resolving to a SafeIn5-supplied contact), or whether all pilot support is handled off-platform.
Our working assumption unless told otherwise: worker recruitment, inductions, toolbox talks and printed QR-point collateral are SafeIn5 operational responsibility per QA-004 and Slide 23, and no training or rollout collateral is a Talentica deliverable. Please confirm that assumption too."

Move "who is the named site champion per org" out of the clarification pack and into the M1 kickoff dependency/RAID list, where it is already implicitly owned by SafeIn5 under QA-003/QA-004.

#### Why it matters

The pilot's primary success metric is repeat usage, and repeat usage in a 2-week UAT window at three quarries is determined more by rollout quality than by software quality. There is currently no named owner for worker onboarding, no in-app help, no support contact, and no first-run explanation — and the anonymity disclosure the PRD commits to has no surface to appear on. In-app onboarding screens plus the honest-anonymity statement are a real, small build item that is not in any milestone; if they are expected, they belong in M2's PWA shell, not discovered in M5. And with no support route, the first worker whose magic link fails will simply stop using it and the metric absorbs the loss silently.

#### Evidence

QA-004 'QR placement will primarily be an operational responsibility managed by SafeIn5 in collaboration with the client site representative/safety lead'; 'QR codes can then be printed and physically placed by the site team/SafeIn5 pilot lead'. QA-003 'Qualitative feedback should also be captured outside or alongside the platform through worker interviews, supervisor feedback sessions'. Talentica Slide 23: SafeIn5 responsibilities are only 'UX and MVP Scope Signoff', 'Test data availability and Feature signoff', 'MVP signoff' — no rollout, recruitment or training responsibility. Slide 25 Risks: 'SafeIn5 Team availability for user testing and signoff'. SafeIn5-PRD.md §5.5 'This must be stated honestly to pilot workers'. Dev Pack §15.2 'Increase workforce trust and engagement'. No document mentions induction, training, help, or support contact.

#### Options

1. No in-app onboarding; SafeIn5 handles everything face to face with printed material (zero build, highest drop-off risk, and no surface for the anonymity disclosure)
2. Minimal in-app: a 3-screen first-run intro including the anonymity statement, an iOS add-to-home-screen prompt, and a persistent 'Help / contact' link — small M2 addition (recommended)
3. The above plus Talentica-supplied rollout collateral (one-page worker card, toolbox-talk script) as an M5 deliverable — a priced addition
4. Full onboarding tour, contextual coach marks and in-app support chat — out of scope

#### Recommendation

Option 2, built into the M2 PWA shell. It is a day or two of work, it is the only place the honest anonymity disclosure can actually live, and without the add-to-home-screen prompt the iOS notification and durability story fails silently. Rollout, induction and printed collateral should stay with SafeIn5 — but we need the named site champion per organisation and a named pilot support contact recorded in the dependency register before M5, because right now neither exists.

---

### 74. running-costs-and-third-party-ownership

> **Severity:** MEDIUM  |  **Blocks:** M2

#### Question

Slide 24 (Third Party Services) names a cloud provider, an email-sending service, a speech-to-text provider, Sentry, Microsoft Clarity and Mixpanel as MVP dependencies, but the only commercial assumption is Slide 25 #1, which covers the cloud account alone; Slide 27 fixes GBP 45,000 as a fixed-price build with no recurring-service line. Please confirm: (a) SafeIn5 owns and pays for all non-cloud third-party accounts (STT, email, Sentry, Clarity, Mixpanel) directly, with Talentica configuring them — or state which, if any, you expect inside the 45k; (b) which speech-to-text provider is acceptable, given voice recordings are personal data and WRK-020/SCP-020 makes transcription a MUST, so the provider must run in an EU region and be covered by a DPA as a named sub-processor under your GDPR position; (c) that our working volume assumption is acceptable for budgeting — approx. 50-60 pilot users, [N] voice captures/user/week averaging [M] seconds over the pilot window — we will state and monitor this rather than ask you to size it.

#### Why it matters

The 45k is a build price and SafeIn5 supplies the cloud account, but the proposal never states who owns the SaaS subscriptions or the run-rate. Speech-to-text is the sharp one: voice-first capture is a MUST (CQA-006, WRK-020/SCP-020) and transcription is metered per minute. With ~60 pilot users capturing voice notes across a multi-week pilot, this is a recurring cost with no owner, no budget and no volume assumption. Mixpanel and Sentry also have free-tier limits that a pilot can exceed. A dependency that stops working mid-pilot destroys the repeat-usage evidence you are buying.

#### Evidence

Talentica Slide 19 Third Party Services: 'Cloud AWS or GCP', 'Email-sending service (e.g. SES / SendGrid)', 'Speech-to-text provider — Voice-first capture transcription', 'Sentry', 'Microsoft Clarity, MixPanel'. Assumption 1: 'SafeIn5 will provide Talentica with the cloud account for the dev, staging and production environments' — covers cloud only. WRK-020/SCP-020 'AI Audio Transcription' = MUST/MVP. CQA-006: 'Voice memo should be treated as the preferred capture method for frontline workers.' No cost, volume, account-ownership or EU-region constraint is stated for any third-party service.

#### Options

1. SafeIn5 owns and pays for all third-party accounts directly; Talentica specifies exact services, EU regions, tiers and an estimated monthly run-rate at 60 users as an M1 deliverable.
2. Talentica procures under its own accounts during build and transfers ownership at handover; SafeIn5 reimburses at cost.
3. Reduce dependency count: use on-device Web Speech API for transcription (zero marginal cost, no data leaves the device, no GDPR transfer question) with a cloud provider only as fallback; drop Mixpanel or Clarity — two analytics tools for a 60-user pilot is redundant.

#### Recommendation

Option 1 plus Option 3. Insist on a written run-rate estimate before contract — it is the cost that outlives the project and nobody has quantified it. On transcription specifically, push hard on on-device speech recognition: it removes a metered cost, removes a GDPR data-transfer assessment on worker voice recordings (which are personal data and potentially identifying by voiceprint), and it works in Chrome/Android and Safari/iOS, the only two browsers in the NFR. Also require every service to be EU-region configured, since 'EU-based data residency' is an NFR and Mixpanel/Clarity/Sentry all default to US regions unless explicitly configured.

---

## I. Product / UX Gaps

### 75. first-run-empty-state-and-cold-start

> **Severity:** HIGH  |  **Blocks:** M2

#### Question

Split it. State, don't ask: "We will design an empty-feed state for first-scan-at-a-sub-site, and QR destinations with no authored content will be hidden rather than greyed — confirm if you disagree." Then ask only the two decisions the client owns: (1) Should pilot sub-site feeds be seeded with example Behaviour Signals at launch, given WRK-013 filters the feed to the worker's current sub-site and most sub-sites will be empty on day one? If yes, must they be visibly labelled as examples, and are they excluded from the "initial Behaviour Signal volume" and repeat-usage success metrics? (2) Per CQA-010, SafeIn5 supplies the initial Learn5 content — who signs off, per site before go-live, that every QR context has its PULSE prompt, rescue plan and Learn5 item authored, and by what date relative to each site's pilot start?

#### Why it matters

Repeat usage is the primary success metric, and the highest-risk moment for it is the first scan by the first worker on the first morning — when the feed is empty, the Learn5 card is missing and nothing demonstrates that anyone else is using it. 'Safer by Sharing' has nothing to show until someone shares. Empty states are usually treated as a design afterthought; here they are the make-or-break of the pilot's headline metric. Equally, a QR whose Learn5 slot is unauthored will render a broken destination at a confined space entry unless the behaviour is specified. And if seeded examples are used but not excluded from counts, the success metrics are contaminated from day one.

#### Evidence

Dev Pack §13 acceptance requires 'See it appear in the feed'; §14 'The primary success measure is repeat usage'. WRK-013 specifies only the opposite state — 'When all new observations are viewed by the worker a dedicated page with message You caught up!' — with no empty-feed state. Dev Pack §8.1 QR routes to 'one or more of' PULSE / Rescue Plan / Learn 5, implying contexts with partial destinations. Dev Pack §8.2 includes an 'active / inactive status' but no content-completeness state. CQA-010 'SafeIn5 will provide initial Learn5 content' with no readiness gate. No requirement row anywhere covers empty states.

#### Options

1. Designed empty states only — a purposeful first-run screen inviting the first signal, and destinations hidden when unauthored (no seeding, metrics stay clean)
2. Designed empty states + SafeIn5-authored seed signals per pilot site, visibly labelled 'Example' and excluded from all counts
3. Seed with real signals captured during a pre-pilot walkthrough with the site lead (most authentic; needs a site visit before go-live)
4. No special handling — accept an empty feed on day one

#### Recommendation

Option 2 plus a go-live content-readiness checklist per site (every QR context has at minimum a PULSE prompt; Learn5 and Rescue Plan destinations are hidden rather than broken when absent). Seeded examples must be flagged in the data model from M2 so they can be excluded from ADM-038 counts and the success metrics — that is a schema decision, which is why we need the answer early rather than at UAT.

---
