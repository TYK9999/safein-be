# SafeIn5 MVP — Architecture & Data Model Design

**Status:** Build document. Assumes Talentica's proposed stack (NestJS 10 on Fastify · Kysely · Postgres 16 · Next.js 14 PWA · Next.js admin · S3-compatible object store · transactional outbox).
**Envelope it must fit:** GBP 45k fixed, 14 weeks, 5 milestones, ~60 pilot users, 3 orgs × 3 sites + 1 Community tenant, ~30 QR mappings, ~20–30 Learn5 items.
**Sources reconciled:** Dev Pack V9 §7/§12 (core services, RLS, anonymity, workflow state machine), Tender Pack WRK/ADM/SCP/CQA, Talentica Proposal slides 14/16/17/18/19, `SafeIn5-PRD.md` §5.4–§5.8.

> **Two PRD decisions this document deliberately revises.** Both are called out in full in §4 and §5 with rationale. If the PRD is the governing artefact, these need an explicit change note at Discovery.
> 1. **PRD §5.5 "strip user metadata at the DB level"** → replaced with **pseudonymous `author_token`**. Literal stripping destroys the primary success metric (repeat usage) and makes rate limiting and abuse blocking impossible.
> 2. **PRD §5.6 "guest reads, account writes"** → kept as the **default configuration**, but the schema and API support guest submission behind a per-tenant flag, because WRK-003 leaves it open and reversing the schema later is expensive.

---

## 1. Component / Service Map

### 1.1 Deployment topology — recommendation

**One backend deployable. Three processes. Two frontends.**

| Artefact | What it is | Deployable? |
|---|---|---|
| `safein5-api` | NestJS-on-Fastify modular monolith containing **all 8 core services as internal modules** | ✅ Container on managed PaaS (Cloud Run / App Runner), 2 instances min |
| `safein5-worker` | **Same image**, different entrypoint (`NODE_ROLE=worker`). Outbox flusher, media finaliser, transcription dispatcher, rule-based alert evaluator, notification sender | ✅ Container, 1 instance (single-instance is fine at pilot volume; outbox uses `FOR UPDATE SKIP LOCKED` so it scales out later without change) |
| `safein5-pwa` | Next.js 14 App Router, installable PWA — worker + supervisor | ✅ Separate deployable |
| `safein5-admin` | Next.js 14 desktop console — not a PWA | ✅ Separate deployable |
| `@safein5/contracts` | Shared package: Zod schemas + generated TS types + generated OpenAPI. Single source of truth for request/response shapes across all three | ❌ Build-time dependency |

**Why a modular monolith, and why this is not a hedge.**

- **The 45k/14-week arithmetic.** Eight independently deployed services means 8 pipelines, 8 dashboards, 8 sets of secrets, inter-service auth, distributed tracing, and — fatally — distributed transactions across `behaviour_signal` + `signal_media` + `outbox_event`. The transactional outbox pattern the proposal already commits to **requires** the domain write and the event write to be in one Postgres transaction. A single deployable gives that for free. Microservices would add an estimated 3–4 weeks of pure infrastructure work to a 14-week budget with no pilot-visible feature.
- **Load does not justify it.** ~60 users, ~30 QR codes, a few hundred signals. A single 1-vCPU container is over-provisioned by two orders of magnitude.
- **It does not block the future.** Module boundaries are enforced in code, not by network: each NestJS module exposes only its `*.facade.ts`; cross-module imports of repositories/entities are blocked by an ESLint `no-restricted-imports` rule and a dependency-cruiser check in CI. Each module owns its own tables and no other module may write them. When SIGNAL intelligence needs to be extracted (the most likely first split, §8), it consumes the outbox stream — an interface that already exists at MVP.
- **Media is the one legitimate scale-out candidate** and it is already off the critical path: browsers upload directly to S3 via presigned URLs, so large payloads never traverse the API container (§5).

**Rejected:** serverless/Lambda-per-endpoint (cold starts vs. the <60s capture NFR, and `SET LOCAL` session-variable RLS is hostile to connection-pool churn); separate read/write services (no read load to justify CQRS).

### 1.2 The eight core services

Naming follows Talentica Proposal slide 17, which is a superset of Dev Pack §7's six. Dev Pack §7 omits Notification and Context Engine; both are required by ADM-005/CQA-012 (feedback loop) and WRK-013/WRK-015 (QR context switching) respectively.

| # | Module | Owns (write authority) | Reads (via facade) | Boundary rule |
|---|---|---|---|---|
| 1 | **Behaviour Signal Service** | `behaviour_signal`, `pulse_session`, `signal_read_state` | Classification, Context, Media | The **only** writer of signal lifecycle state. Nobody else sets `status`. Owns the draft→final transition and idempotency. |
| 2 | **Media Service** | `signal_media`, S3 objects | — | Issues presigned PUT/GET URLs; never proxies bytes. Owns derivative generation (sharp thumbnails, video poster frame) and orphan reaping. Publishes `media.ready`; does **not** mutate `behaviour_signal`. |
| 3 | **Classification Service** | `classification` (reference table), `signal_classification_event` | — | Maps the 3 worker-facing UI options (Good Practice / Be Aware / Needs Attention Now) to stable internal codes + severity ordinal. Deliberately a real module, not an enum, so Phase-2 SIF/critical-risk mapping and auto-classification land here without touching Signal. **Reference data is global, not tenant-scoped.** |
| 4 | **Search & Feed Service** | `signal_search_doc` (materialised FTS projection) | Signal, Context | Read-only over domain tables. Owns feed ranking (severity DESC, then recency — per WRK-013), cursor pagination, `tsvector` maintenance via trigger. Never writes domain state. |
| 5 | **QR Context Service** | `qr_code`, `qr_context`, `qr_scan_event` | Site/Sub-site, Learn5, Rescue Plan | Resolves an opaque token → a context envelope + destination list. Owns QR generation (`qrcode` lib) and PNG/SVG rendering for the admin console. Must resolve in a **single indexed query** (§6). |
| 6 | **Workflow Service** | `review_task`, `workflow_transition`, `evidence` | Signal, Notification | Owns the corporate lifecycle state machine. **MVP implements Acknowledge + Close only** (PRD §5.4); the full Dev Pack §7 machine (`New→Assigned→Acknowledged→Actioned→Closed`) is expressed as *data* in a transitions config, so Phase 2 turns it on without a schema migration. |
| 7 | **Notification Service** | `notification`, `device_subscription` | — | Outbox consumer only. Renders + delivers web-push (VAPID) and email (SES/SendGrid). Owns dedupe, quiet hours, subscription expiry pruning. **Never called synchronously from a request path.** |
| 8 | **Context Engine** | `context_binding` (resolved context cache) | Org, Site, Sub-site, Asset, QR | The single place that answers *"given this actor + this entry point (QR / geo / manual / last-known), what is the operative context?"* Produces the immutable `context_snapshot` JSONB embedded in every `pulse_session` and `behaviour_signal`. Prevents context resolution logic from being reimplemented in five callers. |

**Supporting modules (not "core services", but real modules):** `IdentityModule` (auth, magic-link, OTP, JWT, roles, memberships), `TenancyModule` (tenant resolution, RLS session management — see §3), `AdminModule` (org/site/user/Learn5 CRUD, moderation), `AnalyticsModule` (dashboard aggregate queries — ADM-004/038/039), `OutboxModule` (write API + flusher), `AuditModule` (append-only log).

### 1.3 Request path (steady state)

```
PWA ──HTTPS──▶ Fastify ──▶ [AuthGuard: verify JWT]
                        ──▶ [TenantContextInterceptor: derive tenant_id, actor, role]
                        ──▶ [KyselyTransactionInterceptor: BEGIN; SET LOCAL app.*]
                        ──▶ [ZodValidationPipe]
                        ──▶ Controller ──▶ Module Facade ──▶ Repository (Kysely)
                                                          └─▶ OutboxWriter (same txn)
                        ──▶ COMMIT
Worker ──poll(1s)──▶ outbox_event WHERE published_at IS NULL FOR UPDATE SKIP LOCKED
```

---

## 2. Core Data Model

Conventions: PK is `id uuid default gen_random_uuid()` unless stated. All tables carry `created_at timestamptz not null default now()`, `updated_at timestamptz`. Every tenant-scoped table carries `tenant_id uuid not null references tenant(id)` and is RLS-enabled (§3). **`[SIGNAL]`** marks a column that exists purely to preserve structure for the future SIGNAL intelligence layer — it is written at MVP but not read by any MVP feature. Cutting a `[SIGNAL]` column saves near-zero build time and costs a backfill-impossible data gap later; these are the cheapest future-proofing in the whole design.

### 2.1 Tenancy & Organisation

**`tenant`** — the RLS anchor. *Not* tenant-scoped itself.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | citext unique | `community`, `acme-aggregates` |
| `kind` | text | `community` \| `corporate`. Drives visibility defaults, moderation, guest rules |
| `name` | text | |
| `is_public_readable` | bool | `true` only for the Community tenant — the one tenant whose feed is readable unauthenticated |
| `allow_guest_submission` | bool default false | Per-tenant switch resolving WRK-003. Community pilot: `false` initially (PRD §5.6), flippable without a deploy |
| `data_region` | text default `'eu-west-1'` | EU residency (NFR) |
| `theme` | jsonb | Logo URL + colour tokens. MVP theming scope = logo + colour |
| `retention_policy` | jsonb | `{signals_days, media_days, audit_days}` — GDPR retention (NFR) |
| `status` | text | `active` \| `suspended` |

> **One Community tenant, seeded at migration time with a fixed UUID.** It is a normal tenant row, not a special case in code. Everything that follows — RLS, feeds, moderation, outbox — treats it identically. This is what makes "one platform, two operating models" (CQA-001) true at the data layer rather than aspirational.

**`organisation`** — `tenant_id`, `name`, `industry_code` `[SIGNAL]`, `country_code`. Corporate tenants have exactly 1 for the pilot; the table exists because CQA-001/QA-006 require the model to support a future SaaS tenant containing multiple client orgs. Community tenant has one synthetic "SafeIn5 Community" org so downstream FKs never go nullable.

**`site`** — `tenant_id`, `organisation_id` FK, `name`, `city`, `country_code`, `timezone` `[SIGNAL — shift/time-of-day pattern analysis requires local time, and this is uncorrectable retrospectively]`, `centroid_lat/lon` numeric(9,6) `[SIGNAL — geo clustering, ADM-006]`, `status`. Unique `(organisation_id, lower(name))`.

**`sub_site`** — `tenant_id`, `site_id` FK, `name`, `kind` (`area` \| `zone` \| `task_zone` \| `asset_group`), `parent_sub_site_id` **self-FK, nullable, depth capped at 1 in MVP** (`CHECK` via trigger). SafeIn5 explicitly warned against complex hierarchy (WRK-013 amendment) — self-FK costs nothing and prevents a migration if Phase 2 needs depth. `centroid_lat/lon` `[SIGNAL]`.

**`asset`** — **include it.** `tenant_id`, `sub_site_id` FK (nullable — an asset may hang off a site), `site_id` FK, `external_ref` (client's own asset/tag ID), `name`, `asset_type` (`fixed_plant` \| `mobile_plant` \| `fixture` \| `access_structure` \| `other`), `status`.
*Justification:* the anchor scenario is `Asset ID = spreader beam`, and the supervisor insight the product is sold on — *"3 similar Be Aware signals in 2 weeks, all on custom lifting fixtures"* — is a `GROUP BY asset_id`. If asset is collapsed into a free-text field on sub_site, that query becomes string matching and the flagship demo is unreliable. Cost: one thin table, one admin CRUD screen, ~2 days. Admin UX keeps it optional.

### 2.2 Identity, Membership, Anonymity

**`user`** — global identity, **not** tenant-scoped (CQA-001/SCP-001 require Community→Corporate account movement without re-registration).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | citext unique, **nullable** | Null for guest-derived accounts |
| `email_verified_at` | timestamptz | |
| `display_name` | text nullable | |
| `password_hash` | text nullable | bcrypt. Admins only (ADM-002). Workers are OTP/magic-link only |
| `default_anonymous` | bool default false | **Account-level anonymity toggle** (PRD §5.5) |
| `locale` | text default `'en-GB'` | `[SIGNAL / Phase-2 i18n]` |
| `status` | text | `active` \| `blocked` \| `erased` |
| `erased_at` | timestamptz | GDPR tombstone (§4.5) |
| `last_seen_at` | timestamptz | |

**`user_tenant_membership`** — the join, **and the anonymity keystone**.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `tenant_id` | uuid FK | Unique `(user_id, tenant_id)` |
| `role_id` | uuid FK → `role` | |
| `author_token` | **char(32)** NOT NULL, unique per tenant | Deterministic pseudonym. **Column-level `REVOKE SELECT` from the general app role** (§4) |
| `anonymous_override` | bool nullable | Tenant-specific override of `user.default_anonymous` |
| `invited_at` / `accepted_at` | timestamptz | ADM-026 invitation flow |
| `blocked_at`, `blocked_reason` | timestamptz/text | Abuse blocking (Dev Pack §17.2 Scenario 4) |
| `status` | text | `invited` \| `active` \| `blocked` \| `removed` |

**`user_site_assignment`** — `membership_id`, `site_id`, `sub_site_id` nullable. ADM-019/027/029. Drives default feed scope.

**`role`** — global reference table, not tenant-scoped, seeded: `worker`, `supervisor`, `org_admin`, `platform_admin`, `moderator`. Columns: `code`, `name`, `permissions jsonb` (flat string array — no RBAC engine at MVP; a `Permissions` guard does a set-membership check).

**`guest_session`** — supports unauthenticated QR journeys (WRK-003, MUST).

| Column | Notes |
|---|---|
| `id` uuid PK | |
| `tenant_id` | Almost always Community |
| `client_token_hash` | SHA-256 of the opaque cookie value held in the PWA |
| `author_token` char(32) | Same shape as membership's — a guest can submit (if the tenant flag allows) and still be rate-limited and blocked |
| `first_seen_at`, `last_seen_at`, `scan_count` | Anonymous engagement metrics |
| `promoted_user_id` uuid nullable | Set when a guest registers → **their prior guest activity attaches to their account** without re-keying signals |

### 2.3 QR & Context

**`qr_code`**

| Column | Notes |
|---|---|
| `id` uuid PK | |
| `tenant_id` | |
| `token` char(12) **unique, indexed** | Crockford base32, 60 bits of CSPRNG entropy, no vowels (no accidental words), case-insensitive. This is the URL path segment |
| `label` | Human name in admin: "Lift Zone B barrier" |
| `qr_context_id` FK | |
| `status` | `draft` \| `active` \| `inactive` \| `revoked`. Revoked ≠ deleted — a revoked physical sticker must render a friendly "this code is retired" page, never a 404 or a wrong context |
| `verified_at`, `verified_by` | QA-004 "QR tested/active" — one boolean's worth of work, closes an explicit client ask |
| `printed_asset_url` | S3 key of generated PNG/SVG |
| `scan_count`, `last_scanned_at` | Denormalised counters (success metric: QR scans) |

**`qr_context`** — the resolved-destination definition (Dev Pack §8.2). Separated from `qr_code` deliberately: ~30 codes may share far fewer contexts, and re-pointing a physical sticker must not require reprinting.

| Column | Notes |
|---|---|
| `id`, `tenant_id` | |
| `site_id`, `sub_site_id`, `asset_id` | All nullable FKs |
| `task_type` | text, from a seeded vocabulary (`heavy_lift`, `confined_space_entry`, `isolation`, `working_at_height`, …) |
| `risk_type` | text, seeded vocabulary (`suspended_load`, `confined_space`, `dropped_object`, …) |
| `destinations` jsonb | Ordered array: `[{type:'pulse',ref:<pulse_template_id>},{type:'rescue_plan',ref:…},{type:'learn5',ref:…},{type:'feed'}]`. Dev Pack §8.6: one QR → survey + rescue plan + PULSE + Learn5 |
| `default_destination` | Which one auto-opens (normally `pulse`) |
| `pulse_template_id` FK nullable | Contextual PULSE prompts (WRK-005) |
| `context_version` int `[SIGNAL]` | Increment on edit. Lets a 6-month-old signal be interpreted against the context definition in force at capture time |

**`pulse_template`** — `tenant_id` (nullable ⇒ SafeIn5-global template), `name`, `steps jsonb` (5 ordered items keyed `P|U|L|S|E`, each `{heading, prompt, learn5_item_id?}`), `risk_type`, `version`, `status`.

**`context_binding`** *(Context Engine's cache)* — `id`, `tenant_id`, `actor_ref` (user_id or guest_session_id), `source` (`qr` \| `geo` \| `manual` \| `assignment`), `site_id/sub_site_id/asset_id`, `qr_code_id`, `expires_at` (default now()+8h ≈ one shift). Answers WRK-015/016: scanning a new QR overwrites the binding, and everything downstream — feed filter, capture context, Learn5 selection — follows automatically instead of each caller re-deriving.

### 2.4 The Signal Core

**`pulse_session`**

| Column | Notes |
|---|---|
| `id`, `tenant_id` | |
| `author_token` char(32) NOT NULL | Never a raw user id — see §4 |
| `author_user_id` uuid nullable | Populated **only** when not anonymous |
| `guest_session_id` nullable | |
| `entry_point` | `qr` \| `direct` \| `feed` \| `notification` `[SIGNAL — attribution of which entry points drive behaviour]` |
| `qr_code_id` nullable FK | |
| `context_snapshot` jsonb NOT NULL | **Immutable denormalised copy** of the resolved context at session start |
| `site_id`, `sub_site_id`, `asset_id` | Also stored as real FKs (queryability), *and* in the snapshot (historical truth) |
| `geo_lat`, `geo_lon`, `geo_accuracy_m` | Optional, permission-gated (Dev Pack §5) |
| `started_at`, `completed_at` | |
| `steps_completed` text[] `[SIGNAL]` | Which of P/U/L/S/E were viewed — feeds PULSE completion-rate metric and the repeat-scan-fatigue watch item (PRD §5.7) |
| `duration_ms` `[SIGNAL]` | |
| `outcome` | `abandoned` \| `completed` \| `completed_with_signal` |

**`behaviour_signal`** — the core object. Draft and final are **the same row** with a `status` column, not two tables. Splitting them would mean a copy-and-delete on finalisation, breaking the media FKs that were already attached during the draft phase.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Client-generated UUIDv7 — enables idempotent retry of `POST /signals/draft` |
| `tenant_id` | uuid | RLS anchor |
| `status` | text | **`draft` → `classified` → `final`**, plus terminal `discarded`. Enforced by a DB `CHECK` + an application transition guard |
| `visibility` | text | `site` \| `organisation` \| `tenant` \| `public`. Community = `public`; Corporate defaults to `site` (SCP-024: corporate content must never leak to the community feed) |
| `author_token` | char(32) NOT NULL | **Always populated, anonymous or not** |
| `author_user_id` | uuid nullable | **NULL when anonymous.** This single nullable FK *is* the "anonymity at the DB layer" requirement |
| `is_anonymous` | bool NOT NULL | Materialised at capture time from the account setting — the setting may change later; the signal's promise must not |
| `guest_session_id` | uuid nullable | |
| `pulse_session_id` | uuid nullable FK | Links Echo→Signal |
| `qr_code_id` | uuid nullable FK | |
| `entry_point` | text | `[SIGNAL]` |
| `classification_code` | text nullable FK → `classification` | NULL while `draft` |
| `classified_at` | timestamptz | |
| `classification_latency_ms` | int `[SIGNAL]` | Directly measures the <10s NFR in production, not just in test |
| `capture_latency_ms` | int `[SIGNAL]` | First-tap → finalise. **This is how the <60s acceptance criterion is proven at UAT with real data** |
| `body_text` | text nullable | Zero mandatory fields |
| `body_source` | text | `typed` \| `voice_transcript` \| `none` — CQA-006 wants evidence that voice-first is actually used |
| `transcript_confidence` | numeric nullable | `[SIGNAL]` |
| `site_id`, `sub_site_id`, `asset_id` | uuid nullable FKs | Denormalised from context for feed filtering (WRK-013/014) |
| `context_snapshot` | jsonb NOT NULL | Immutable |
| `task_type`, `risk_type` | text nullable | `[SIGNAL — the axes for Identify/Gather pattern detection]` |
| `geo_lat/lon/accuracy_m` | numeric | Optional |
| `occurred_at` | timestamptz | Defaults to `created_at`; separate column because Phase 2 may allow backdating |
| `finalised_at` | timestamptz | |
| `media_state` | text | `none` \| `pending` \| `partial` \| `ready` \| `failed`. **Denormalised** so the feed renders without a subquery (§5) |
| `moderation_state` | text | `visible` \| `hidden` \| `removed` \| `under_review` |
| `workflow_state` | text nullable | `open` \| `acknowledged` \| `closed`. Denormalised from `review_task` for feed badges |
| `search_vector` | tsvector GENERATED | `to_tsvector('english', coalesce(body_text,''))` + context terms; GIN indexed |
| `duplicate_of_id` | uuid nullable self-FK | `[SIGNAL — Dev Pack §17.2 duplicate detection; MVP writes it only via manual moderator action]` |
| `similarity_group_id` | uuid nullable | `[SIGNAL — pure placeholder for Phase-2 clustering. Costs one column now, a full backfill later]` |
| `deleted_at` | timestamptz | Soft delete (ADM-034) |

**Indexes:** `(tenant_id, status, visibility, created_at DESC)` partial `WHERE deleted_at IS NULL` (the feed query); `(tenant_id, site_id, created_at DESC)`; `(tenant_id, sub_site_id, classification_code, created_at DESC)` (WRK-013 auto-filter + severity sort); `(author_token, created_at DESC)` (repeat-usage metric + rate limit); GIN on `search_vector`.

**`signal_media`**

| Column | Notes |
|---|---|
| `id` uuid PK | Client-generated |
| `tenant_id`, `signal_id` FK | |
| `kind` | `photo` \| `video` \| `audio` |
| `state` | `reserved` → `uploading` → `uploaded` → `processing` → `ready` \| `failed` \| `orphaned` |
| `storage_key` | `s3://bucket/{tenant_id}/{yyyy}/{mm}/{signal_id}/{media_id}.{ext}` — tenant-prefixed so an S3 lifecycle/deletion policy can be scoped per tenant |
| `thumb_key`, `poster_key` | sharp-generated derivatives |
| `mime_type`, `byte_size`, `width`, `height`, `duration_ms` | Video capped at 30s (NFR) |
| `checksum_sha256` | Client-supplied, verified on finalise |
| `upload_started_at`, `upload_completed_at`, `processed_at` | |
| `attempt_count`, `last_error` | Retry/orphan handling |
| `exif_stripped` bool | **Always true.** EXIF (incl. GPS + device serial) is stripped server-side during derivative generation, unconditionally — a photo carrying the reporter's GPS defeats anonymity regardless of `is_anonymous` |
| `transcript_text`, `transcript_state` | Audio only |

**`classification`** — global reference, seeded, **not** tenant-scoped (ADM-035: no CRUD in MVP).

| `code` | `label` | `severity_ordinal` | `colour_token` |
|---|---|---|---|
| `good_practice` | Good Practice | 1 | green |
| `be_aware` | Be Aware | 2 | amber |
| `needs_attention_now` | Needs Attention Now | 3 | red |

Plus `sort_order`, `triggers_workflow` bool (`true` for `needs_attention_now`), `is_active`. `severity_ordinal` drives WRK-013's "red first" feed sort in SQL rather than in application code.

**`signal_classification_event`** `[SIGNAL]` — `signal_id`, `from_code`, `to_code`, `changed_by_role`, `changed_by_token`, `reason`, `source` (`worker` \| `moderator` \| `admin`), `created_at`. Append-only. Exists because ADM-033 permits admins to change a worker's classification and CQA-005 anticipates deeper SIF mapping later: *disagreement between worker and reviewer classification is training data*. Discarding it is irrecoverable.

### 2.5 Learning Content

**`learn5_item`** — `id`, `tenant_id` **nullable** (NULL ⇒ SafeIn5-global content available to every tenant, incl. Community — CQA-010), `title`, `summary`, `body_md`, `media_key`, `media_kind`, `external_url` (Option 1 adapter fallback, Dev Pack §8.4), `delivery_mode` (`native` \| `external`), `risk_type`, `task_type`, `tags text[]`, `estimated_seconds`, `version`, `status`, `published_at`.

**`learn5_binding`** — many-to-many: `learn5_item_id` × (`site_id` \| `sub_site_id` \| `asset_id` \| `qr_context_id` \| `pulse_template_id` \| `risk_type`), with `priority`. One join table with a nullable-target shape beats six FK columns on the item.

**`learn5_view`** — `id`, `tenant_id`, `learn5_item_id`, `author_token`, `source` (`qr` \| `pulse` \| `feed` \| `search` \| `notification`) `[SIGNAL]`, `qr_code_id` nullable, `started_at`, `completed_at`, `dwell_ms`, `completed` bool. **Required, not optional** — "Engagement with PULSE and Learn 5" is a named Phase 1 success metric and cannot be reconstructed after the fact.

**`rescue_plan`** — `id`, `tenant_id`, `site_id`/`sub_site_id`/`asset_id` nullable, `title`, `location_description`, `immediate_actions` jsonb (ordered steps), `roles_responsibilities` jsonb, `required_equipment` jsonb, `escalation_contacts` jsonb (name/role/phone), `version`, `review_date`, `status`, `published_at`. Fields mirror Dev Pack §8.3 exactly. **Structured JSONB, not a blob of markdown** — the mobile rendering must be scannable in an emergency.

### 2.6 Workflow, Evidence, Moderation, Audit

**`review_task`** — created by outbox consumer when `classification.triggers_workflow` is true, or on manual supervisor pickup.

| Column | Notes |
|---|---|
| `id`, `tenant_id`, `signal_id` FK | |
| `state` | MVP: `open` \| `acknowledged` \| `closed`. Column is text against a `workflow_state_def` table, **not** a PG enum — Phase 2 adds `assigned`/`actioned` with an INSERT, not an `ALTER TYPE` |
| `assigned_to_membership_id` | nullable `[Phase-2 structure, written only if a supervisor self-assigns]` |
| `acknowledged_at`, `acknowledged_by_membership_id` | |
| `closed_at`, `closed_by_membership_id`, `closure_note` | Publicly displayed on the signal (PRD §5.5) |
| `due_at` | `[SIGNAL — response-time SLA metrics, Dev Pack §17.1 Scenario 5]` |
| `first_response_ms`, `time_to_close_ms` | `[SIGNAL]` — the "report black hole" metric |

**`workflow_state_def`** — `code`, `label`, `sort_order`, `is_terminal`, `requires_evidence` bool, `enabled_in_mvp` bool. Config-as-data. **`workflow_transition_def`** — `from_code`, `to_code`, `required_permission`, `enabled`. The state machine is a table lookup; enabling Dev Pack §7's full lifecycle in Phase 2 is a seed change.

**`workflow_transition`** *(the event log)* — `review_task_id`, `from_state`, `to_state`, `actor_membership_id`, `actor_role`, `note`, `created_at`. Append-only. Satisfies "each state change logged".

**`evidence`** — `review_task_id`, `kind` (`photo` \| `note` \| `document`), `storage_key`, `note`, `uploaded_by_membership_id`. Table exists at MVP; UI does not (PRD §5.4 defers it). Two days of schema now vs. a migration mid-pilot.

**`moderation_action`** — `id`, `tenant_id`, `target_type` (`signal` \| `media` \| `user` \| `comment`), `target_id`, `action` (`hide` \| `unhide` \| `remove` \| `edit_caption` \| `edit_classification` \| `block_author` \| `mark_duplicate`), `reason_code`, `note`, `actor_membership_id`, `previous_value` jsonb, `new_value` jsonb, `created_at`. `previous_value` is what makes ADM-033 admin edits *auditable* rather than destructive.

**`audit_log`** — append-only, **no UPDATE/DELETE grant to the application role at all**.

| Column | Notes |
|---|---|
| `id` bigserial | Monotonic ordering |
| `tenant_id` | |
| `occurred_at` | |
| `actor_type` | `user` \| `guest` \| `system` \| `admin` |
| `actor_token` char(32) nullable | **`author_token`, never `user_id`, when the subject is an anonymous author** — this is the "masked in audit logs" requirement (Proposal slide 18) |
| `actor_membership_id` | Populated for admin/supervisor actions, which are *not* anonymous |
| `action`, `entity_type`, `entity_id` | |
| `before`, `after` | jsonb, PII-redacted by a serialiser allowlist |
| `request_id`, `ip_hash`, `user_agent_hash` | Hashed, not raw — GDPR minimisation |

Partitioned by month (`RANGE occurred_at`) so retention is a `DROP PARTITION`.

### 2.7 Notifications & Read State

**`device_subscription`** — `id`, `tenant_id`, `user_id`, `endpoint` (unique), `p256dh_key`, `auth_key`, `user_agent`, `last_success_at`, `failure_count`, `expired_at`. Pruned when web-push returns 404/410.

**`notification`** — `id`, `tenant_id`, `recipient_user_id` (nullable — broadcasts have none), `recipient_scope` jsonb (`{site_id}` / `{sub_site_id}` for zone broadcasts, WRK-022), `kind` (`signal_acknowledged` \| `signal_closed` \| `new_needs_attention_in_zone` \| `learn5_assigned` \| `invitation`), `payload` jsonb, `channel` (`web_push` \| `email` \| `in_app`), `state` (`queued` \| `sent` \| `failed` \| `suppressed`), `dedupe_key` (unique partial index — the single most effective defence against notification storms), `sent_at`, `read_at`, `outbox_event_id` FK.

**`signal_read_state`** — `tenant_id`, `author_token`, `signal_id`, `seen_at`, `opened_at`. Composite PK `(author_token, signal_id)`. Powers WRK-013's *"You're caught up!"* boundary. **Keyed by `author_token`, not `user_id`** — so read state works identically for guests and for anonymous users, and one deletion path clears it.

### 2.8 Outbox & Search

**`outbox_event`**

| Column | Notes |
|---|---|
| `id` bigserial PK | Ordering |
| `event_id` uuid unique | Idempotency key for consumers |
| `tenant_id` | |
| `event_type` | See §8 |
| `event_version` int default 1 | **Schema evolution from day one** — a versionless event stream is unreadable in 18 months |
| `aggregate_type`, `aggregate_id` | |
| `payload` jsonb | **Pseudonymised at write time** — carries `author_token`, never `user_id` or email |
| `occurred_at` | |
| `published_at` | NULL ⇒ pending. Partial index `WHERE published_at IS NULL` |
| `attempt_count`, `last_error`, `next_attempt_at` | Exponential backoff |

Partitioned monthly. **Rows are never deleted after publishing within the pilot** — this table *is* the SIGNAL training corpus, and it is the single most valuable artefact the MVP produces.

**`signal_search_doc`** — optional denormalised projection (`signal_id`, `tenant_id`, `doc tsvector`, `site_name`, `sub_site_name`, `asset_name`, `classification_label`, `tags`). At pilot volume the generated column on `behaviour_signal` suffices; build this only if feed+search filter queries exceed 200ms. **Recommendation: do not build it in MVP.**

### 2.9 Relationship summary

```
tenant 1─n organisation 1─n site 1─n sub_site 1─n asset
tenant 1─n user_tenant_membership n─1 user
       user_tenant_membership 1─n user_site_assignment n─1 site
tenant 1─n qr_code n─1 qr_context ─┬─▶ site / sub_site / asset
                                    ├─▶ pulse_template
                                    ├─▶ rescue_plan
                                    └─▶ learn5_item (via learn5_binding)
pulse_session 0..1─n behaviour_signal 1─n signal_media
behaviour_signal n─1 classification
behaviour_signal 1─n signal_classification_event
behaviour_signal 1─0..1 review_task 1─n workflow_transition
                                    review_task 1─n evidence
behaviour_signal 1─n moderation_action (polymorphic)
behaviour_signal 1─n signal_read_state
learn5_item 1─n learn5_view
* ──▶ outbox_event, audit_log  (every write path)
```

---

## 3. Multi-tenancy & Row-Level Security

### 3.1 Model

**Shared schema, shared tables, `tenant_id` on every tenant-scoped table, Postgres RLS as the enforcement backstop.** Not schema-per-tenant (~10 tenants × 40 tables = migration pain, and it breaks the Community/Corporate-on-one-platform requirement), not database-per-tenant (cost).

The application layer *also* filters by tenant in every Kysely query. **RLS is defence-in-depth, not the primary filter** — it is what turns a forgotten `WHERE tenant_id = ?` from a cross-tenant data breach into an empty result set. Given the client explicitly named RLS (Dev Pack §7), this is both correct and contractual.

### 3.2 Database roles

| Role | Grants |
|---|---|
| `safein5_migrator` | Table owner. Runs migrations. **Not used at runtime.** |
| `safein5_app` | `SELECT/INSERT/UPDATE` on domain tables; `INSERT` only on `audit_log`, `outbox_event`, `workflow_transition`, `signal_classification_event`. **`NOBYPASSRLS`.** Column-level `REVOKE SELECT (author_token) ON user_tenant_membership`. |
| `safein5_identity` | Same, plus `SELECT (author_token)` on `user_tenant_membership`. Used by **one** module (Identity) via a second, small connection pool. This is what makes the pseudonym mapping a *deliberate* lookup rather than an ambient one. |
| `safein5_worker` | `SELECT/UPDATE` on `outbox_event`, `signal_media`, `notification`; RLS-bypassing via an explicit `app.bypass_rls` GUC checked in the policies — the flusher is cross-tenant by nature. |

Table owner keeps `BYPASSRLS` implicitly, so **`FORCE ROW LEVEL SECURITY` is set on every RLS table** to prevent an accidental owner-connection leak.

### 3.3 Policy shape

```sql
ALTER TABLE behaviour_signal ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviour_signal FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON behaviour_signal
  USING (
       current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
       tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- Community tenant readable by anonymous/guest sessions
CREATE POLICY community_public_read ON behaviour_signal
  FOR SELECT
  USING (
        visibility = 'public'
    AND moderation_state = 'visible'
    AND status = 'final'
    AND tenant_id = current_setting('app.community_tenant_id')::uuid
  );
```

Note `WITH CHECK` has **no** bypass clause: even the flusher cannot write a row into the wrong tenant.

### 3.4 tenant_id propagation — JWT → request context → Postgres GUC

This is the mechanism to get exactly right; everything else in §3 depends on it.

**1. JWT claims** (15-min access token, HttpOnly refresh cookie):
```json
{ "sub":"<user_id>", "tid":"<tenant_id>", "mid":"<membership_id>",
  "rol":"worker", "atk":"<author_token>", "anon":true,
  "sit":["<site_id>"], "jti":"…", "exp":… }
```
`atk` is embedded in the token so the hot path (draft creation) **never needs to look up the pseudonym mapping** — the `safein5_app` role that serves capture requests literally cannot read that column.

**2. Guests:** signed, HttpOnly, SameSite=Lax cookie carrying `guest_session_id` + `author_token`, scoped to the Community tenant. No JWT.

**3. `TenantContextInterceptor`** resolves `{tenantId, actor, role, authorToken, siteScope}` and stores it in an **`AsyncLocalStorage`** store. Do **not** use NestJS `REQUEST`-scoped providers — request scoping forces per-request instantiation of the whole injection subtree and is a measurable latency tax against a <60s end-to-end budget.

**4. `KyselyTransactionInterceptor`** wraps every mutating request (and every read that touches tenant data) in a transaction and issues, as the first statement:

```ts
await sql`
  SELECT set_config('app.tenant_id',      ${ctx.tenantId}, true),
         set_config('app.actor_role',     ${ctx.role},     true),
         set_config('app.author_token',   ${ctx.authorToken}, true),
         set_config('app.community_tenant_id', ${COMMUNITY_TENANT_ID}, true)
`.execute(trx);
```

`set_config(..., is_local = true)` ⇒ **`SET LOCAL` semantics: the setting is reset at COMMIT/ROLLBACK.** This is the non-negotiable detail. With PgBouncer in transaction mode or any pooled connection, a session-scoped `SET` leaks tenant context to the next request on that connection. `is_local = true` makes leakage structurally impossible.

**5. Kysely plugin** additionally appends `.where('tenant_id','=',ctx.tenantId)` to every query against a registered tenant-scoped table, so the app filter and RLS agree and query plans stay index-friendly (RLS predicates alone can produce worse plans).

**6. Cross-tenant paths** (outbox flusher, platform-admin console, nightly retention job) go through an explicit `runAsSystem(async trx => …)` helper that sets `app.bypass_rls = 'on'`. **That helper is the only place the string `bypass_rls` appears in the codebase** and it is guarded by an ESLint rule plus a mandatory `audit_log` write.

### 3.5 Test enforcement

A Testcontainers integration suite that, for every RLS table, asserts: (a) a row written under tenant A is invisible under tenant B; (b) an INSERT with a mismatched `tenant_id` raises `42501`. **Generated from the table registry**, so a new table without a policy fails CI. Roughly one day of work; it is the difference between "we have RLS" and "RLS works".

### 3.6 Where Community and guests fit

| Case | Tenant | Actor | Auth | Visibility |
|---|---|---|---|---|
| QR scan → PULSE / Rescue Plan / Learn5 | Resolved from `qr_code.tenant_id` | guest_session | none | Context + content only. **Corporate QR content is readable unauthenticated; the corporate *feed* is not** — a rescue plan behind a login is a safety failure |
| Community feed browse | Community | guest_session | none | `community_public_read` policy |
| Community submit | Community | guest or user | Per `tenant.allow_guest_submission` | `visibility='public'`, `moderation_state='under_review'` on first-ever submission from a token |
| Corporate submit | Corporate | member | JWT required | `visibility='site'` |
| Supervisor | Corporate | member | JWT + `supervisor` role | Site-scoped via `user_site_assignment` |
| Platform admin | any | member | JWT + `platform_admin` | `runAsSystem`, fully audited |

---

## 4. Anonymity Implementation

### 4.1 Recommendation

**Pseudonymous `author_token` — a deterministic, one-way, per-user-per-tenant HMAC — in place of literal metadata stripping.**

Dev Pack §7 says *"Anonymity must be handled by stripping user metadata at the DB level."* Taken literally (write NULL, keep nothing), this **breaks five things the same documents mandate**:

| Requirement | Broken by literal stripping | Preserved by `author_token` |
|---|---|---|
| Repeat usage — *"the primary success measure"* (Dev Pack §14) | Cannot count distinct authors among anonymous signals | `COUNT(DISTINCT author_token)` |
| Rate limiting / spam control | No key to count against | Count by token in a window |
| Abuse blocking (Dev Pack §17.2 Scenario 4) | *"Anonymous mode should not enable harassment"* is unimplementable | Block the token |
| Closure feedback (CQA-012) | No route back to the reporter | Token-addressed in-app notification |
| GDPR erasure (Art. 17) | Cannot find the data subject's records | Delete the salt/mapping → all tokens become permanently unresolvable |

The Talentica proposal (slide 18) already concedes MVP anonymity is data-layer, not cryptographic. `author_token` delivers exactly that, honestly, and with the metrics intact.

### 4.2 Derivation

```
pepper        = 32-byte secret in KMS/Secrets Manager, never in the DB, never in git
tenant_salt   = 16 random bytes per tenant, stored in `tenant_secret` (separate table,
                SELECT granted only to safein5_identity)
author_token  = base32( HMAC-SHA256(pepper, tenant_salt || ':' || user_id)[0..19] )   -- 32 chars
```

Properties, and why each matters:

- **Deterministic** — same user, same tenant, same token forever ⇒ repeat usage is countable.
- **Per-tenant salted** — the same person is a *different* pseudonym in the Community tenant and in their employer's tenant. A corporate admin cannot correlate their worker's community posts. This is the property that makes "one platform, two operating models" ethically defensible.
- **One-way** — no `token → user_id` computation exists. The only reverse path is the stored mapping in `user_tenant_membership.author_token`, which is **column-level revoked from the app role**.
- **Pepper in KMS** — a stolen database dump cannot even brute-force the mapping (user_ids are UUIDv4; without the pepper, HMAC is not enumerable).

### 4.3 Column-level contract

| Table | Column | Anonymous signal | Attributed signal |
|---|---|---|---|
| `behaviour_signal` | `author_user_id` | **NULL** | user id |
| `behaviour_signal` | `author_token` | populated | populated |
| `behaviour_signal` | `is_anonymous` | `true` | `false` |
| `pulse_session` | `author_user_id` / `author_token` | NULL / populated | both |
| `learn5_view`, `signal_read_state`, `qr_scan_event` | `author_token` only | — | *no `user_id` column exists at all* |
| `audit_log` | `actor_token` / `actor_membership_id` | token only | both |
| `outbox_event.payload` | `authorToken` | always | always; **never `user_id` or email** |
| `user_tenant_membership` | `author_token` | the mapping; `REVOKE SELECT` from `safein5_app` | same |

**The API layer never emits `author_user_id` for a signal where `is_anonymous = true`** — enforced by a Zod response DTO that has no such field on the anonymous variant of the union, not by a conditional in a mapper. Serialisation-level enforcement is testable; conditionals rot.

**A supporting hard rule:** EXIF is stripped from every uploaded image unconditionally, and `geo_lat/lon` are rounded to 3 decimal places (~110 m) on anonymous signals before storage. A GPS-tagged photo of a specific work position identifies its author to anyone who knows the crew roster, whatever the `is_anonymous` flag says.

### 4.4 What each requirement resolves to, concretely

- **Repeat usage:** `SELECT COUNT(*) FROM (SELECT author_token FROM behaviour_signal WHERE tenant_id=$1 AND status='final' GROUP BY author_token HAVING COUNT(*) > 1) t;` — works across anonymous and attributed signals, and across guest and registered activity (guests carry a token too).
- **Rate limiting:** sliding window keyed `rl:signal:{author_token}` — e.g. 20 signals/hour, 5 media/minute. Guests get a tighter bucket. Enforced in a Fastify preHandler using an in-process LRU (a Redis dependency is not justified at 60 users).
- **Abuse blocking:** moderator clicks "block author" on an anonymous signal. The API resolves `signal.author_token → user_tenant_membership` **through the Identity module only**, sets `blocked_at`, writes `moderation_action` (recording the *token*, not the identity), and returns nothing about who it was. The moderator blocks a pseudonym and never learns a name.
- **Closure notification:** on close, an outbox event carries `authorToken`. Notification Service resolves token → membership → `device_subscription`, sends the push, and stores `notification.recipient_user_id`. The reporter learns their signal was closed *without their identity ever appearing on the signal.* This is strictly better than PRD §5.5's "no individual notification, view it publicly" and removes the trade-off that decision was forced into. Public closure display stays as well — both, not either.
- **GDPR erasure:** `POST /gdpr/erasure` → (1) scrub `user` (email→NULL, name→NULL, `status='erased'`, `erased_at=now()`); (2) **delete the `user_tenant_membership` rows, destroying the token mapping**; (3) `UPDATE behaviour_signal SET author_user_id=NULL, is_anonymous=true, body_text=redact(body_text) WHERE author_user_id=$1`; (4) delete media objects for attributed signals; (5) leave `author_token` in place. The signals survive as genuinely anonymous safety knowledge — which is the correct outcome, since erasing one worker's observations degrades a shared safety corpus for everyone else. **After step 2 the token is mathematically unresolvable**, so the retained data is no longer personal data. Document this position in the DPIA.
- **GDPR export:** `SELECT … WHERE author_user_id = $1 OR author_token = <resolved>` via the Identity role — export works even for signals the user submitted anonymously, which is exactly what Art. 15 requires.

### 4.5 Honest limits — state these to pilot workers verbatim

`author_token` is **pseudonymisation, not anonymisation** under GDPR Recital 26. While the mapping row and the pepper both exist, SafeIn5 Ltd can technically re-identify an anonymous reporter. Corporate admins cannot (no column grant); a SafeIn5 platform engineer with production DB **and** KMS access can. Timing and context correlation ("only one person was in Lift Zone B at 06:40") is not defended against and cannot be at MVP cost. The consent copy must say *"your name is not shown and your employer cannot look it up"* — never *"nobody can ever know it was you."* Overpromising here is a larger trust risk than not offering anonymity at all.

---

## 5. Media Upload Sequence

**Design rule:** bytes never traverse the API container. Browser → S3 direct via presigned URL. This is what makes async upload real rather than "async from the user's perspective while the API blocks".

### 5.1 Happy path — tap to feed

| # | Actor | Step |
|---|---|---|
| 1 | PWA | Worker taps Share. `<input capture>` / `getUserMedia` returns a Blob. **Nothing has hit the network yet.** |
| 2 | PWA | Client-side downscale (canvas → WebP/JPEG, long edge ≤ 2048px, quality 0.8). A 6 MB phone photo → ~350 KB. On a quarry 3G link this is the single largest determinant of whether the 60s target is met. Video is not transcoded client-side; it is length-capped at 30s at capture. |
| 3 | PWA | Generates `signalId` and `mediaId` (UUIDv7) locally. |
| 4 | PWA → API | `POST /v1/signals/draft` `{signalId, pulseSessionId?, qrCodeId?, contextHint, geo?}` → **idempotent on `signalId`**. Server resolves context via Context Engine, writes `behaviour_signal` with `status='draft'`, `media_state='none'`, emits `signal.draft_created`. **Target < 200 ms.** |
| 5 | PWA → API | `POST /v1/signals/{id}/media/presign` `{mediaId, kind, mimeType, byteSize, checksumSha256}`. Server validates MIME allowlist + size cap, INSERTs `signal_media` (`state='reserved'`), sets `behaviour_signal.media_state='pending'`, returns a **presigned PUT, 15-min TTL**, with `Content-MD5` and `x-amz-server-side-encryption` conditions bound in. |
| 6 | PWA → S3 | `PUT` direct to S3 **in the background**, off the UI thread. The Blob is simultaneously written to IndexedDB (`pending_uploads`) so a tab close / crash / signal loss does not lose it. |
| 7 | PWA | **Navigation to Classification happens immediately after step 5 returns — it does not await step 6.** This is the load-bearing moment of the whole NFR. |
| 8 | PWA → API | Worker taps one of three tiles. `POST /v1/signals/{id}/classify` `{code, latencyMs}` → `status='draft'→'classified'`, writes `signal_classification_event`, emits `signal.classified`. |
| 9 | PWA → API | `POST /v1/signals/{id}/finalise` `{bodyText?, bodySource, captureLatencyMs}` → `status='final'`, `finalised_at=now()`, emits `signal.finalised`. **Finalise does not require media to be uploaded.** |
| 10 | PWA | Confirmation screen renders. *"Thanks. You helped improve lift safety for the next crew."* Total elapsed from step 1: target < 30 s. |
| 11 | PWA → API | On S3 `PUT` 200: `POST /v1/media/{mediaId}/complete` `{etag}` → `signal_media.state='uploaded'`, emits `media.uploaded`. Clears the IndexedDB entry. |
| 12 | Worker proc | Consumes `media.uploaded`: HEAD the object (verify size + checksum), **strip EXIF**, sharp → 400px thumb (+ ffmpeg poster frame for video), write derivatives, `state='ready'`, `exif_stripped=true`. Recomputes `behaviour_signal.media_state` → `ready` (or `partial` if siblings pending). Emits `media.ready`. |
| 13 | Feed | Next feed poll / SWR revalidation shows the thumbnail. |

**Sequence, compressed:**
```
tap ─▶ draft(200ms) ─▶ presign(150ms) ─▶ [S3 PUT ......background......]
                                     └─▶ classify ─▶ finalise ─▶ CONFIRM ✅
                                                    S3 200 ─▶ complete ─▶ outbox
                                                                       ─▶ worker: exif/thumb
                                                                       ─▶ media_state=ready
```

### 5.2 Draft → final state transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| — | `draft` | `POST /signals/draft` | Idempotent on client `signalId` |
| `draft` | `classified` | `POST /classify` | Valid `classification_code` |
| `classified` | `final` | `POST /finalise` | — |
| `draft` | `final` | `POST /finalise` with `classificationCode` | Single-call fast path for feed-entry capture that skips PULSE |
| `draft`/`classified` | `discarded` | explicit discard, **or** the reaper at 24h | No media in `ready` state |
| `final` | `final` | media/moderation/workflow updates | `status` never regresses |

Enforced by a `CHECK` constraint on `status` **plus** a transition guard in the Signal facade **plus** an `UPDATE … WHERE status = $expected` optimistic predicate. Three layers because a signal that flips back to draft mid-pilot is an unrecoverable data-integrity story.

### 5.3 Retry, orphan and failure handling

| Failure | Handling |
|---|---|
| S3 PUT fails / offline | Exponential backoff in the service worker: 2s, 8s, 30s, 2m, 10m — up to 6 attempts over ~30 min. Blob persists in IndexedDB. `signal_media.attempt_count++` on each `/complete` failure. |
| App closed mid-upload | Service worker `sync` event (Chrome/Android) resumes; on iOS Safari, resume happens on next app open — a documented platform limitation, and the reason the feed must render gracefully without media. |
| Presigned URL expired (>15 min) | `POST /media/{id}/presign-retry` issues a fresh URL. `state` stays `reserved`. |
| Upload succeeds, `/complete` never called | **Reconciler** (worker, every 10 min): for `signal_media` in `reserved`/`uploading` older than 20 min, HEAD S3. Object present ⇒ promote to `uploaded` and continue the pipeline. Absent ⇒ `state='orphaned'`. This closes the most common real-world hole. |
| Object in S3 with no DB row | **S3 lifecycle rule** deletes objects under `staging/` prefix after 48h; the reconciler moves confirmed objects out of `staging/` on promotion. |
| Draft never finalised | Reaper at 24h: `status='discarded'`, associated media `state='orphaned'`, S3 objects deleted. |
| Processing (sharp/ffmpeg) fails | 3 retries with backoff → `state='failed'`, `behaviour_signal.media_state='failed'`. **The signal remains visible and final** — the observation is the value; the photo is supporting evidence. Alerted to Sentry. |
| Transcription provider down | `transcript_state='failed'`. Text stays empty. Non-blocking by construction (CQA-006: voice preferred, never required). |

### 5.4 What the feed renders while media is pending

The feed **never waits for media** and **never hides a signal because its media is not ready.**

| `media_state` | Card rendering |
|---|---|
| `none` | Text/classification card, classification-coloured left border. No image affordance. |
| `pending` | Skeleton tile at the correct aspect ratio (from `signal_media.width/height`, captured client-side pre-upload) + subtle "Photo uploading…". **No spinner** — a spinner on someone else's upload reads as broken. |
| `partial` | Ready items render; pending siblings show skeletons. |
| `ready` | Thumbnail via presigned GET (5-min TTL, issued in the feed response); full image on tap. |
| `failed` | Card renders normally with a small muted "Photo unavailable". Never an error state, never a broken-image icon. |

**Author-side optimism:** the capturing device renders its own signal from the local Blob URL immediately, so the author sees their photo in the feed instantly even while the upload is in flight. Everyone else sees a skeleton until `ready`.

Because `media_state` is a denormalised column on `behaviour_signal`, the feed query needs no join or subquery to decide what to render — one index scan.

---

## 6. QR Resolution Flow & URL/Token Design

### 6.1 URL design

```
https://s5.app/q/7K3M9PQR2XVT
                └── 12-char Crockford base32, 60 bits CSPRNG
```

- **Short host** (`s5.app` or similar), short path. QR module count scales with URL length; a short URL prints smaller and scans faster on a dirty, scuffed sticker at an oblique angle in a quarry. `https://safein5.example.com/qr/context/7K3M9PQR2XVT` is roughly a version-6 QR; the above is version 3.
- **Crockford base32**: no `I`, `L`, `O`, `U` (no ambiguity, no accidental profanity), case-insensitive — so the code can be printed as a human-readable fallback ("or enter code 7K3M-9PQR-2XVT") when the camera cannot get a lock. Cheap, and field-realistic.
- **Opaque and unguessable.** 60 bits over ~30 codes makes enumeration infeasible. There is **no signature or expiry in the token**: QR codes are physically public and permanently mounted, so a token that expires is a sticker that must be reprinted. Authority lives in `qr_code.status`, which is server-side and revocable instantly.
- **Query params are additive, never authoritative:** `?s=<sticker_serial>` may be appended by the printer for physical inventory tracking; the server ignores it for resolution and logs it for QA-004 placement verification.
- **QR error-correction level H** (30%) — these stickers get mud, abrasion and UV.

### 6.2 Resolution flow

```
1. Camera → https://s5.app/q/7K3M9PQR2XVT
2. Next.js edge/route handler /q/[token]
     └─ ensure guest cookie (guest_session) if no JWT
     └─ GET /v1/qr/{token}/resolve   (single indexed query, unauthenticated)
3. API: SELECT qr_code JOIN qr_context JOIN site/sub_site/asset
        LEFT JOIN pulse_template, rescue_plan, learn5_binding→learn5_item
        WHERE token = $1        -- unique btree index; ~1ms
   ├─ not found        → 200 + {status:'unknown'}  → friendly "Code not recognised" page
   ├─ status='inactive'→ 200 + {status:'inactive'} → "This code is not active yet"
   ├─ status='revoked' → 200 + {status:'retired', fallback:{siteName}} → "Retired — see site notice board"
   └─ status='active'  → 200 + full context envelope
4. Fire-and-forget INSERT qr_scan_event {qr_code_id, author_token, occurred_at,
                                        is_first_scan_for_token}    [SIGNAL]
   + UPDATE qr_code SET scan_count = scan_count + 1
   + outbox: qr.scanned
5. Context Engine UPSERTs context_binding for this actor (8h TTL) — WRK-015/016:
   this single write is what makes "scan another QR and everything updates" work
6. PWA routes to qr_context.default_destination (normally PULSE) and renders a
   persistent context chip: "Quarry North · Lift Zone B · Heavy Lift"
7. If not installed, an "Add to Home Screen" prompt appears AFTER the destination
   renders — never before. The safety content must never be gated behind an install prompt.
```

**Resolve response envelope:**
```jsonc
{ "status": "active",
  "context": { "tenantId":"…", "tenantKind":"corporate", "siteId":"…", "siteName":"Quarry North",
               "subSiteId":"…", "subSiteName":"Lift Zone B", "assetId":"…", "assetName":"Spreader Beam SB-14",
               "taskType":"heavy_lift", "riskType":"suspended_load", "contextVersion": 3 },
  "destinations": [
    {"type":"pulse","ref":"…","label":"PULSE — Heavy Lift","default":true},
    {"type":"rescue_plan","ref":"…","label":"Rescue Plan"},
    {"type":"learn5","ref":"…","label":"Suspended loads & pinch points"},
    {"type":"feed","label":"What's being shared here"}],
  "auth": {"required": false, "submitRequiresAccount": true},
  "guestToken": "…" }
```

**Hard rules.**
1. **Resolution is unauthenticated, always.** A worker at a confined-space entry must reach the rescue plan with zero taps of friction. The corporate *feed* behind that same QR requires auth; the *safety content* never does.
2. **One query, one round trip.** The 4-hop `token → context → site → destinations` walk is a single joined SELECT. Target p95 < 100 ms server-side.
3. **The resolve response is cacheable** (`Cache-Control: private, max-age=60`) — repeat scans of the same code in a shift are common.
4. **Never 404 a printed code.** Every non-active state returns 200 with a helpful page. A 404 on a physical safety sticker destroys trust in the whole system.

### 6.3 QR generation (admin)

Auto-generated on site/sub-site/asset creation (ADM-012/018) — token minted, `qr_context` created from the entity, `status='draft'`. Admin binds destinations, activates, and downloads a print-ready SVG/PNG (`qrcode` lib, ECC level H, with a label caption rendered below the module matrix). ~30 mappings for pilot; the admin UI is a list + edit form, deliberately not a QR "management suite" (Dev Pack §8.6).

---

## 7. Key API Surface

REST, `/v1`, JSON, Zod-validated in and out, OpenAPI generated from the same schemas. Cursor pagination (`?cursor=&limit=`) everywhere — never offset.

**Identity & Access** (`IdentityModule`)
```
POST   /v1/auth/magic-link           {email}                    → 204 (always, no enumeration)
POST   /v1/auth/otp/request          {email}
POST   /v1/auth/otp/verify           {email, code}              → {accessToken} + refresh cookie
POST   /v1/auth/refresh                                          → {accessToken}
POST   /v1/auth/logout
POST   /v1/auth/guest                {tenantSlug?}              → guest cookie + authorToken
POST   /v1/auth/guest/promote        {}                          → links guest_session → user
POST   /v1/admin/auth/login          {email, password}          (ADM-001/002, bcrypt)
POST   /v1/admin/auth/forgot         {email}                    (ADM-003)
GET    /v1/me                                                    → profile, memberships, sites, roles
PATCH  /v1/me                        {displayName?, defaultAnonymous?}   (PRD §5.5)
POST   /v1/me/erasure                                            → GDPR Art.17 (§4.4)
GET    /v1/me/export                                             → GDPR Art.15
```

**QR & Context** (`QrContextService`, `ContextEngine`)
```
GET    /v1/qr/{token}/resolve                                    unauth, §6
POST   /v1/context/bind              {qrToken? | siteId, subSiteId?}
GET    /v1/context/current
```

**PULSE** (`BehaviourSignalService`)
```
POST   /v1/pulse/sessions            {qrCodeId?, contextHint, entryPoint}
PATCH  /v1/pulse/sessions/{id}       {stepsCompleted[], outcome}
POST   /v1/pulse/sessions/{id}/complete
GET    /v1/pulse/templates/resolve?riskType=&taskType=&subSiteId=
```

**Signals** (`BehaviourSignalService`, `ClassificationService`)
```
POST   /v1/signals/draft             {signalId, pulseSessionId?, qrCodeId?, geo?}   idempotent
PATCH  /v1/signals/{id}              {bodyText?, bodySource?}
POST   /v1/signals/{id}/classify     {code, latencyMs}
POST   /v1/signals/{id}/finalise     {bodyText?, captureLatencyMs}
DELETE /v1/signals/{id}                                          author-only, pre-finalise
GET    /v1/signals/{id}
GET    /v1/classifications                                       reference data, cacheable
```

**Media** (`MediaService`)
```
POST   /v1/signals/{id}/media/presign        {mediaId, kind, mimeType, byteSize, checksum}
POST   /v1/media/{mediaId}/complete          {etag}
POST   /v1/media/{mediaId}/presign-retry
DELETE /v1/media/{mediaId}                                       author-only, pre-finalise
POST   /v1/media/{mediaId}/transcribe                            audio → STT dispatch
```

**Feed & Search** (`SearchFeedService`)
```
GET    /v1/feed?scope=site|subsite|org|community
          &siteId=&subSiteId=&classification=&since=&cursor=&limit=
GET    /v1/feed/unseen-count                                     WRK-013 "You're caught up"
POST   /v1/feed/read                  {signalIds[]}
GET    /v1/search?q=&classification=&siteId=&subSiteId=&from=&to=&cursor=
```

**Learn5 & Rescue Plans**
```
GET    /v1/learn5?riskType=&taskType=&subSiteId=&cursor=
GET    /v1/learn5/{id}
POST   /v1/learn5/{id}/view           {source, qrCodeId?}        → learn5_view
POST   /v1/learn5/{id}/complete       {dwellMs}
GET    /v1/rescue-plans/{id}
GET    /v1/rescue-plans/resolve?subSiteId=&assetId=
```

**Supervisor / Workflow** (`WorkflowService`)
```
GET    /v1/review-tasks?state=&siteId=&cursor=
POST   /v1/review-tasks/{id}/acknowledge   {note?}
POST   /v1/review-tasks/{id}/close         {closureNote}
POST   /v1/review-tasks/{id}/evidence      {kind, storageKey, note}    schema-ready, UI Phase 2
GET    /v1/review-tasks/{id}/transitions
```

**Notifications**
```
POST   /v1/push/subscribe             {endpoint, keys}
DELETE /v1/push/subscribe             {endpoint}
GET    /v1/notifications?cursor=
POST   /v1/notifications/{id}/read
```

**Admin console** (`/v1/admin/*`, all `runAsSystem`-audited)
```
GET|POST|PATCH|DELETE  /v1/admin/organisations[/{id}]
GET|POST|PATCH|DELETE  /v1/admin/sites[/{id}]
GET|POST|PATCH|DELETE  /v1/admin/sub-sites[/{id}]
GET|POST|PATCH|DELETE  /v1/admin/assets[/{id}]
GET|POST|PATCH|DELETE  /v1/admin/users[/{id}]
POST                   /v1/admin/users/{id}/invite            (ADM-026)
POST                   /v1/admin/users/{id}/block|unblock     (ADM-028)
POST                   /v1/admin/users/{id}/site-assignments  (ADM-027/029)
GET|POST|PATCH         /v1/admin/qr-codes[/{id}]
POST                   /v1/admin/qr-codes/{id}/activate|revoke|verify
GET                    /v1/admin/qr-codes/{id}/render.svg|.png
GET|POST|PATCH         /v1/admin/qr-contexts[/{id}]
GET|POST|PATCH|DELETE  /v1/admin/learn5[/{id}]
POST                   /v1/admin/learn5/{id}/publish
GET|POST|PATCH         /v1/admin/rescue-plans[/{id}]
GET|POST|PATCH         /v1/admin/pulse-templates[/{id}]
GET                    /v1/admin/moderation/queue
POST                   /v1/admin/moderation/{signalId}/hide|unhide|remove
PATCH                  /v1/admin/moderation/{signalId}          (ADM-033, audited)
POST                   /v1/admin/moderation/{signalId}/block-author   (token-only, §4.4)
GET                    /v1/admin/analytics/summary?from=&to=&siteId=   (ADM-004/038)
GET                    /v1/admin/analytics/engagement                   (repeat usage, QR, Learn5)
GET                    /v1/admin/analytics/export.csv                   (QA-003 exportable data)
GET                    /v1/admin/audit?entityType=&entityId=&cursor=
```

**Ops:** `GET /healthz`, `GET /readyz`, `GET /metrics` (Prometheus).

---

## 8. Event / Outbox Taxonomy for Future SIGNAL

Naming: `<aggregate>.<past-tense-verb>`, `event_version` from 1. Payloads are **pseudonymised at write time** (`authorToken`, never `userId`/email) so the stream can be replayed into an analytics store with no re-scrubbing pass — the difference between a 2-day and a 2-month Phase 2 start.

| SIGNAL stage | Event | Emitted when | Key payload |
|---|---|---|---|
| **Sense** | `qr.scanned` | QR resolved | qrCodeId, contextRef, siteId, subSiteId, assetId, taskType, riskType, authorToken, isFirstScan, entryPoint |
| | `pulse.session_started` | PULSE opened | sessionId, templateId, entryPoint, contextRef |
| | `pulse.step_completed` | Each P/U/L/S/E | sessionId, step, dwellMs |
| | `pulse.session_completed` | Completed/abandoned | outcome, durationMs, stepsCompleted[], producedSignal |
| | `signal.draft_created` | Draft written | signalId, contextRef, entryPoint |
| | `signal.media_attached` | Media reserved | signalId, mediaId, kind |
| | `learn5.viewed` / `learn5.completed` | Learn5 open/finish | itemId, source, qrCodeId, dwellMs |
| | `feed.signal_viewed` | Card opened | signalId, viewerToken, dwellMs |
| **Identify** | `signal.classified` | Classification | signalId, code, severityOrdinal, latencyMs |
| | `signal.reclassified` | Moderator/admin change | fromCode, toCode, source, actorRole |
| | `signal.finalised` | Finalise | full denormalised context + classification + captureLatencyMs + isAnonymous + hasMedia |
| | `signal.marked_duplicate` | Moderator | signalId, duplicateOfId |
| **Gather** | `context.binding_changed` | New QR/geo binding | actorToken, fromContext, toContext |
| | `signal.context_enriched` | Context resolved post-hoc | signalId, siteId, subSiteId, assetId, taskType, riskType |
| | `metrics.daily_rollup` | Nightly worker | tenantId, siteId, counts by classification, distinct authorTokens, repeat-author count |
| **Navigate** | `review_task.created` | Task opened | taskId, signalId, siteId, severityOrdinal, dueAt |
| | `review_task.assigned` | Assignment *(Phase-2 shape, emitted if used)* | taskId, assigneeMembershipId |
| | `review_task.acknowledged` | Ack | taskId, firstResponseMs |
| | `review_task.closed` | Close | taskId, timeToCloseMs, closureNote |
| | `moderation.action_taken` | Any moderation | targetType, targetId, action, reasonCode |
| **Alert** | `threshold.breached` | Rule-based evaluator (SCP-064/ADM-040) | ruleCode, scope{siteId,subSiteId}, windowHours, count, classification. **Explicitly labelled rule-based, not predictive** |
| | `notification.queued` / `.sent` / `.failed` | Notification lifecycle | notificationId, kind, channel, dedupeKey |
| **Loop** | `learn5.surfaced_from_signal` | Learn5 shown because of a related signal | itemId, sourceSignalId, contextRef |
| | `signal.closure_broadcast` | Closure published to feed | signalId, siteId |
| **Platform** | `tenant.created`, `user.invited`, `user.accepted`, `user.blocked`, `user.erased`, `site.created`, `qr.activated`, `qr.revoked`, `learn5.published` | Admin ops | audit + future provisioning hooks |

**Consumers at MVP** (all in `safein5-worker`, all idempotent on `event_id`):

| Consumer | Subscribes to | Does |
|---|---|---|
| `WorkflowTaskCreator` | `signal.finalised` where `classification.triggers_workflow` | Creates `review_task` |
| `NotificationDispatcher` | `review_task.acknowledged`, `.closed`, `threshold.breached` | Renders + sends push/email |
| `ThresholdEvaluator` | `signal.finalised` | Windowed count per sub-site per classification → `threshold.breached` |
| `MetricsProjector` | all | Appends to `metrics_daily` for the dashboard |
| `TelemetryForwarder` | curated subset | Mixpanel (server-side, token-keyed — never emits PII to a third party) |

**Phase 2 needs no new instrumentation** — the Identify/Gather/Navigate consumers are added against a stream that already exists and has been accumulating since Milestone 2. That is the concrete answer to Dev Pack §10's demand that the stack "support the future SIGNAL Intelligence Layer without requiring a full system rebuild."

---

## 9. Build-Order & Risk Notes

**Schema-first sequencing against the 5 milestones.**

| Milestone | Schema landed | Rationale |
|---|---|---|
| M1 (2w) | Migration framework, `tenant`/`organisation`/`site`/`sub_site`/`asset`, `user`/`membership`/`role`, RLS policies + the generated RLS test suite, `outbox_event`, `audit_log` | **RLS, `author_token` and the outbox must exist before the first domain table.** Retrofitting RLS across 40 tables in M4 is a schedule-killer; retrofitting the outbox means the SIGNAL corpus starts 8 weeks late. |
| M2 (4w) | `pulse_session`, `behaviour_signal`, `signal_media`, `classification`, `signal_classification_event`, `pulse_template` | The <60s path end-to-end. |
| M3 (3w) | `qr_code`, `qr_context`, `context_binding`, `learn5_*`, `rescue_plan`, `signal_read_state`, FTS | Context + learning. |
| M4 (3w) | `review_task`, `workflow_*`, `evidence`, `moderation_action`, `notification`, `device_subscription`, `metrics_daily`, GDPR endpoints | Supervisor + governance. |
| M5 (2w) | none | UAT, defects, handover. |

**Top schema/architecture risks.**

1. **RLS deferred past M1** — the single highest-severity risk. Mitigate with the generated policy test in CI from week 2.
2. **`author_token` litigated late.** §4 revises a PRD decision; if Discovery re-opens it in M3, `behaviour_signal`, `learn5_view`, `signal_read_state`, `audit_log` and every outbox payload change shape. **Force this decision in Milestone 1.**
3. **iOS Safari PWA background upload.** No reliable background sync. Accepted, mitigated by IndexedDB + resume-on-open + graceful feed rendering (§5.4). Must be an explicit UAT acceptance note, not a bug.
4. **Speech-to-text cost/latency and EU residency.** Provider selection is an M1 decision with a data-residency constraint; the STT call must be async and non-blocking regardless of provider (`transcript_state` machine already accommodates failure).
5. **Video at 30s on a quarry uplink** — a 30s 1080p clip is ~40–60 MB. Cap capture bitrate client-side (`MediaRecorder` `videoBitsPerSecond ≈ 1.5 Mbps` → ~6 MB) or the "async upload" promise fails in the field even though the architecture is correct.
6. **`asset` table.** Recommended as in-scope here; if Discovery cuts it for budget, keep the `asset_id` **column** on `qr_context`, `behaviour_signal` and `pulse_session` as nullable and unused. The column is free; the backfill is not.

---

**Files referenced (absolute paths):**
`c:\Users\YaswanthK\Desktop\safeIn\md\SafeIn5 Dev Pack V9 Issue.md` ·
`c:\Users\YaswanthK\Desktop\safeIn\md\SafeIn5 MVP Requirements Specification and Tender Pack v1.0.md` ·
`c:\Users\YaswanthK\Desktop\safeIn\md\Talentica Proposal- SafeIn5.md` ·
`c:\Users\YaswanthK\Desktop\safeIn\md\SafeIn5.md` ·
`c:\Users\YaswanthK\Desktop\safeIn\SafeIn5-PRD.md`
