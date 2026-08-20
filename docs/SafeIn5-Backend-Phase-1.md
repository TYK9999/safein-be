# SafeIn5 Backend — Phase 1: Foundation + QR Resolve

> **Purpose.** This is the *first* build phase. It tells you the smallest coherent set of **tables** and **APIs** to develop before anything else, why they come first, and exactly where the phase boundary sits. It is a companion to [SafeIn5-Backend-Plan.md](SafeIn5-Backend-Plan.md) (the full plan) — read this one to *start*, that one for the whole arc.
>
> **Owner:** backend (solo). **Target:** NestJS 11 · Fastify · Kysely · Postgres 16.

---

## 1. Why the schema must be sliced deliberately

The authoritative schema in `docs/db/migrations/0001..0008` is **one interdependent design** — 38 tables wired together with composite foreign keys. You cannot naively "run the first file and stop", because a later table references an earlier one and a Kysely migrator applies migrations **in order**. So phasing is not just "pick some tables"; it is a deliberate cut that respects three rules:

1. **Migration order = build order.** Once a migration has run, you cannot insert an earlier-numbered one behind it. So each phase's migrations are numbered sequentially as you build them, even though they draw their DDL from the authoritative domain files (`0001`, `0003`, …). A mapping is given in §6.
2. **RLS travels with its table.** Good news: `ENABLE/FORCE ROW LEVEL SECURITY` and the `CREATE POLICY` statements live **inline** in each domain file (`0001`, `0003`), *not* in `0007`. Only **role creation and GRANTs** are centralised in `0007`. So `0001` and `0003` are each independently applyable — you only need to slice the *grants* out of `0007` per phase.
3. **Cross-phase FKs are deferred, never forced.** When a Phase-1 table points at a Phase-2 table, we create the *column* now and add the *FK constraint* in the later phase. The schema already does this itself (`qr_context.rescue_plan_id`'s FK is declared in `0003` but added in `0004`), so we are following an established pattern, not inventing one.

**The whole-arc roadmap** (so you can see where Phase 1 sits):

| Phase | Domain | Tables it adds | Headline capability | Demo |
|------:|--------|----------------|---------------------|------|
| **1** | **Foundation + QR** | `tenant, role, site, sub_site, asset, task_type, risk_type, pulse_template, qr_context, qr_code, qr_scan_event` | **Unauthenticated QR resolve** | Scan a printed sticker → get its site/zone/asset/task context back |
| 2 | Identity & Access | `app_user, user_tenant_membership, user_site_assignment, guest_session, auth_token, tenant_secret, context_binding` | Login (OTP/magic-link), guest sessions, tenant-context from JWT | A guest and a member each authenticate; QR scan now logs a `qr_scan_event` |
| 3 | PULSE + Signal + Media | `pulse_session, behaviour_signal, signal_media, classification, signal_classification_event, signal_read_state` | The **<60s capture path** | Gloved capture of a photo/voice/text signal in under a minute |
| 4 | Feed + Supervisor | `review_task, workflow_*, evidence, moderation_action, notification, device_subscription` | Feed, Acknowledge/Close, moderation | Supervisor closes a signal; author sees the closure |
| 5 | Learn5 / Rescue / Community | `learn5_*, rescue_plan, escalation_record, content_report, consent_record` | Offline rescue plan, Learn5, community feed | Rescue plan renders offline; community card visible unauthenticated |
| 6 | Governance | `audit_log, outbox_event` hardening, GDPR | Export/erase, retention, audit | GDPR export/erase end-to-end |

> Phases 2–6 are summarised only. This document specifies **Phase 1** in full.

---

## 2. Phase 1 in one paragraph

Phase 1 stands up the **platform substrate** (migration runner, the four database roles, row-level security, the request-scoped tenant transaction, health checks, the RLS isolation test harness) and delivers exactly **one user-facing journey: scanning a QR code and resolving it to a work context** — `GET /v1/q/:token`. This journey is chosen first on purpose: it is the product's front door, it is the **only** journey that needs *no login* (so you build zero auth in Phase 1), and it forces you to get the two hardest, un-retrofittable things right — **multi-tenancy/RLS** and the **unauthenticated-but-tenant-safe read** — while the surface area is still tiny. Data is provisioned by a **seed script**; the admin API to manage QR codes is a small supporting surface you can build now or defer.

**Exit demo:** a phone scans the printed token `HJ7K3M9PQR2X` and the API returns *Brackley North Quarry · Lifting Zone 3 · Spreader Beam SB-14 · Heavy Lift · Suspended Load*.

---

## 3. Phase 1 tables

Eleven tables, in three groups. Every column below is from the real DDL — nothing invented. `[SIGNAL]` marks a column written now but not *read* by any MVP feature (future analytics); it costs nothing now and is un-backfillable later, so it stays.

### 3.1 Foundation — tenancy & site hierarchy (from `0001_foundation.sql`)

| Table | RLS? | Purpose | Key columns |
|-------|:----:|---------|-------------|
| **`tenant`** | No (it *is* the RLS anchor) | One row = one client organisation. The Community tenant is an ordinary row seeded with fixed UUID `…0000c0`. | `id`, `slug` (citext, unique), `kind` (`community\|corporate`), `name`, `is_public_readable`, `allow_guest_submission`, `data_region` (default `eu-west-1`), `retention_policy` (jsonb), `status` |
| **`role`** | No (global reference) | The five fixed MVP roles, seeded with fixed UUIDs. `permissions` is a flat jsonb string array checked by set-membership — not an RBAC engine. | `id`, `code` (`worker\|supervisor\|org_admin\|platform_admin\|moderator`), `permissions` (jsonb array) |
| **`site`** | **Yes** | A physical site (e.g. a quarry). Top of the context hierarchy. | `id`, `tenant_id`, `name`, `timezone`, `centroid_lat/lon` `[SIGNAL]`, `status`; composite unique `(id, tenant_id)` |
| **`sub_site`** | **Yes** | A named area/zone within a site. Self-nesting **capped at depth 1** by trigger `trg_sub_site_depth_cap`. | `id`, `tenant_id`, `site_id`, `parent_sub_site_id`, `kind` (`area\|zone\|task_zone\|asset_group`) |
| **`asset`** | **Yes** | A physical asset (the "spreader beam SB-14"). A real table, not free text, because the flagship supervisor insight is `GROUP BY asset_id`. | `id`, `tenant_id`, `site_id`, `sub_site_id`, `external_ref` (client's tag, e.g. `SB-14`), `asset_type` |

Also created by `0001`: shared trigger fn `set_updated_at()`, the depth-cap and asset/sub-site consistency triggers, and `tenant_enforce_self_scope()` (a runtime UPDATE to `tenant` must target the caller's own tenant, since `tenant` cannot be RLS-protected).

### 3.2 QR & context (from `0003_context_qr.sql`)

| Table | RLS? | Purpose | Key columns |
|-------|:----:|---------|-------------|
| **`task_type`** | No (global vocab, seeded) | Work-task vocabulary (`heavy_lift`, `confined_space_entry`, …). Never deleted; deactivate with `is_active`. | `code` (PK), `label`, `sort_order` |
| **`risk_type`** | No (global vocab, seeded) | Hazard vocabulary (`suspended_load`, `dropped_object`, …). | `code` (PK), `label`, `sort_order` |
| **`pulse_template`** | **Yes** (tenant_id **nullable** = global) | The 5-step P·U·L·S·E prompt set a context points at. Phase 1 only *seeds & resolves* it; running a PULSE session is Phase 3. | `id`, `tenant_id` (nullable), `steps` (jsonb, exactly 5, keyed P/U/L/S/E), `risk_type_code`, `task_type_code`, `status`, `version` |
| **`qr_context`** | **Yes** | The **logical** destination definition. Separate from `qr_code` so a sticker is re-pointed by an UPDATE, not a reprint. | `id`, `tenant_id`, `name`, `site_id`, `sub_site_id`, `asset_id`, `task_type_code`, `risk_type_code`, `destinations` (jsonb ordered), `pulse_template_id`, `status` |
| **`qr_code`** | **Yes** | One **physical** printed sticker. Its `token` is the URL path segment. Authority lives in `status`, not the token — instantly revocable without reprinting. | `id`, `tenant_id`, `token` (char(12), Crockford base32, unique), `label`, `qr_context_id`, `status` (`draft\|active\|inactive\|revoked`), `scan_count`, `last_scanned_at` |
| **`qr_scan_event`** | **Yes** | `[SIGNAL]` append-only per-scan record. **Table created in Phase 1; writes deferred to Phase 2** (needs `author_token` from the guest/identity layer). | `id`, `tenant_id`, `qr_code_id`, `qr_context_id`, `author_token` (char(32)), `entry_point`, `occurred_at` |

### 3.3 Deferred inside Phase 1 (create column now, wire later)

- **`qr_code.verified_by_membership_id` FK** → `user_tenant_membership` (Phase 2). The **column** is created in Phase 1; the **constraint `fk_qr_code_verified_by`** is added in the identity phase. (Nullable, `ON DELETE SET NULL` — provenance only.)
- **`qr_context.rescue_plan_id` / `learn5_item_id` FKs** → already deferred to Phase 5 by the schema's own design. Columns exist; FKs added with those tables.
- **`context_binding`** table → deferred to Phase 2. It caches the resolved context *per authenticated actor* across a shift; the Phase-1 resolve is stateless (re-resolves each scan), so it is not needed yet.

---

## 4. Phase 1 security substrate

This is the part that is impossible to retrofit, so it lands now even though only the resolve path exercises it.

- **Four Postgres roles** (all `NOLOGIN NOBYPASSRLS`): `safein5_migrator` (owns objects, runs migrations), `safein5_app` (runtime API pool), `safein5_worker` (background), `safein5_identity` (small pool, not used until Phase 2). Phase 1 uses `safein5_app` for the resolve.
- **RLS is already on** every tenant-scoped table (`0001`/`0003` inline). Policy shape, uniform everywhere:
  ```sql
  USING      ( current_setting('app.bypass_rls', true) = 'on'
               OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid )
  WITH CHECK ( tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid )
  ```
  Reads carry a bypass escape (worker/system only); **writes never do**. An unscoped connection sees **zero rows** and fails closed.
- **Request-scoped tenant transaction.** Every tenant-scoped operation runs inside `db.transaction()` with `SET LOCAL app.tenant_id` (via `set_config(..., true)` and a **bind parameter**, never string interpolation), resolved from `AsyncLocalStorage`. In Phase 1 the *only* thing that sets `app.tenant_id` is the resolve endpoint — sourced from the resolved tenant, **not** a JWT (there is none yet).
- **The unauthenticated-resolve mechanism** — a `SECURITY DEFINER` function, because `qr_code` is `FORCE RLS` and an anonymous caller has no `app.tenant_id`, so a plain read returns nothing:
  ```sql
  CREATE FUNCTION qr_resolve_token(p_token text)
  RETURNS TABLE(qr_code_id uuid, tenant_id uuid, qr_context_id uuid, status text)
  LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    PERFORM set_config('app.bypass_rls', 'on', true);   -- local to this call only
    RETURN QUERY
      SELECT c.id, c.tenant_id, c.qr_context_id, c.status
      FROM qr_code c WHERE c.token = upper(p_token);     -- content-free columns ONLY
  END $$;
  REVOKE ALL ON FUNCTION qr_resolve_token(text) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION qr_resolve_token(text) TO safein5_app;
  ```
  **Phase 1 = the safe place to start on tenancy:** no `behaviour_signal`, no `author_token` reads, so the F-1 de-anonymisation hole (see the main plan §3.4) is not yet reachable. Carry the grant hygiene forward when signal tables land.

---

## 5. Phase 1 APIs

Three surfaces. The resolve is the hero; health is mandatory; admin-QR is supporting (build it or seed instead).

### 5.1 Hero — `GET /v1/q/:token`  (public, unauthenticated)

The one journey Phase 1 delivers. **Two-phase**, and it **never returns 404** — a printed safety sticker must never be a dead end.

- **Phase A:** call `qr_resolve_token(:token)` → `{qr_code_id, tenant_id, qr_context_id, status}`.
- **Phase B** (only if `status='active'`): open a tenant-scoped transaction with `app.tenant_id = <resolved tenant>`, read `qr_context` joined to `site`/`sub_site`/`asset` and the `pulse_template` reference, and build the envelope. Fire-and-forget increment `qr_code.scan_count` + `last_scanned_at`.

**Five resolution states, all HTTP 200:**

| `qr_code` state | Response `status` | Body |
|-----------------|-------------------|------|
| token not found | `unknown` | `{ status: "unknown" }` |
| `draft` (minted, unbound) | `unconfigured` | `{ status: "unconfigured" }` |
| `inactive` | `inactive` | `{ status: "inactive" }` |
| `revoked` | `retired` | `{ status: "retired", fallback: { siteName } }` |
| `active` | `resolved` | full context envelope ↓ |

**Resolved envelope (shape):**
```jsonc
{
  "status": "resolved",
  "context": {
    "qrCodeId": "…", "contextId": "…", "contextVersion": 3,
    "site":    { "id": "…", "name": "Brackley North Quarry" },
    "subSite": { "id": "…", "name": "Lifting Zone 3" },
    "asset":   { "id": "…", "name": "Spreader Beam", "externalRef": "SB-14" },
    "taskType": { "code": "heavy_lift", "label": "Heavy Lift" },
    "riskType": { "code": "suspended_load", "label": "Suspended Load" },
    "destinations": [ { "type": "pulse", "ref": "…", "label": "Start PULSE" } ],
    "pulseTemplateId": "…"
  }
}
```
- **Rate-limited at the edge/WAF** on IP — an open token endpoint is otherwise an enumeration oracle for a site's sticker inventory.
- `:token` is upper-cased before lookup (tokens are case-insensitive). Reject anything not matching `^[0-9A-HJKMNP-TV-Z]{12}$` with a `400` *before* hitting the DB.

### 5.2 Ops (public/internal)

- `GET /healthz` — liveness (process up).
- `GET /readyz` — readiness (DB reachable, migrations at head). Wire via `@nestjs/terminus`.

### 5.3 Supporting — admin QR management  *(optional in Phase 1)*

You need data to resolve. Two ways to get it, pick per appetite:

- **Simplest (recommended to start): seed it.** Extend the demo seed with a tenant, site, sub-site, asset, `qr_context`, and an `active` `qr_code` with a known token. No auth, no admin API — you're resolving within the hour.
- **Fuller (exercises the RLS *write* path): a thin admin API.** Build these to create and manage codes and to generate the printable PNG (the `qrcode` lib is already a dependency). In Phase 1, guard them with a **bootstrap platform-admin token from env** (a deliberate placeholder replaced by real identity in Phase 2 — write it behind the same `@Public()`-opt-out guard so swapping it later is one change):

  | Method · Path | Purpose |
  |---|---|
  | `POST /v1/admin/sites` · `/sub-sites` · `/assets` | create the hierarchy (writes exercise `WITH CHECK` tenant isolation) |
  | `POST /v1/admin/qr-contexts` | define a logical context (destinations, template, taxonomy) |
  | `POST /v1/admin/qr-codes` | mint a code (draft, token generated) |
  | `POST /v1/admin/qr-codes/:id/activate` · `/revoke` | lifecycle (activate requires a bound context) |
  | `PATCH /v1/admin/qr-codes/:id` | **re-point** a sticker (`qr_context_id`) — the whole reason context is separate |
  | `GET /v1/admin/qr-codes/:id/render.png` | print-ready PNG, ECC level H |

> Recommendation: **seed first**, get resolve green and demoable, then add the admin API as the write-path exercise. Full self-service admin screens are Phase 4+/seed-script per the main plan.

---

## 6. Phase 1 migrations — what to run

Keep the authoritative `docs/db/migrations` files as the committed reference. For the *runnable* Phase-1 set, number by build order:

| Runnable file | Source | Change from source |
|---------------|--------|--------------------|
| `db/migrations/0001_foundation.sql` | `docs/db/migrations/0001_foundation.sql` | verbatim |
| `db/migrations/0002_context_qr.sql` | `docs/db/migrations/0003_context_qr.sql` | **comment out `fk_qr_code_verified_by`** (re-added in the Phase-2 identity migration); **omit the `context_binding` table** (Phase 2) |
| `db/migrations/0003_security_phase1.sql` | slice of `docs/db/migrations/0007_rls_roles.sql` + resolve fn | create the 4 roles; GRANT on the 11 Phase-1 tables only; add `qr_resolve_token()`; run the "every tenant-scoped table has RLS" backstop |

The one deferred FK, re-added in Phase 2:
```sql
-- Phase 2 (identity) migration, after user_tenant_membership exists:
ALTER TABLE qr_code
  ADD CONSTRAINT fk_qr_code_verified_by
  FOREIGN KEY (verified_by_membership_id)
  REFERENCES user_tenant_membership (id) ON DELETE SET NULL;
```

**Migration runner:** Kysely `Migrator` + `FileMigrationProvider` (each `.ts` runs its sibling `.sql` via `sql.raw`), giving a `kysely_migration` tracking table. Forward-only. **Exclude the demo seed from the runner** and invoke it as `db:seed:demo`, guarded on `NODE_ENV !== 'production'` (the seed file carries its own `BEGIN/COMMIT`, which would orphan the runner's transaction).

---

## 7. Build sequence (ordered)

1. **Substrate.** `git add` the schema; move `docs/db/migrations` → `db/migrations`; delete the ad-hoc `src/database/migrations/*` and `src/seedData.sql`. Write `docker-compose.yml` (Postgres 16 + MinIO), `.env.example`, the out-of-band `ALTER ROLE … LOGIN PASSWORD` bootstrap (roles are created `NOLOGIN`).
2. **Migrate.** Wire `db/migrate.ts`; get the three Phase-1 migrations to a green run (budget time — the schema has never executed; role/grant ordering and the `RAISE`-backstops will need a couple of iterations). Confirm the "all tenant tables have RLS" backstop NOTICE prints.
3. **Types + tenancy.** `kysely-codegen` → `db/types.gen.ts`; register pg parsers for `int8`/`numeric`; `strict: true`. Build the three tuned pools, the `TenantContextInterceptor` + `AsyncLocalStorage`, and the lint ban on raw `pool.query` outside it.
4. **Harden bootstrap.** Rewrite `src/main.ts`: global prefix + `/v1` versioning, CORS, helmet, body limit, `ZodValidationPipe`, `AllExceptionsFilter` (SQLSTATE + AWS/pg sanitisation), `enableShutdownHooks()`, awaited bootstrap, `/healthz` + `/readyz`.
5. **Resolve.** Author `qr_resolve_token()`; build the `qr-context` module: `GET /v1/q/:token`, two-phase, five states, envelope, edge rate-limit note, `scan_count` increment.
6. **Seed & demo.** Seed one tenant + hierarchy + an `active` code with a known token; scan it end-to-end.
7. **Prove isolation.** Testcontainers Postgres from the Phase-1 migrations; two-tenant fixture; RLS tests: cross-tenant read returns zero rows, cross-tenant write raises `42501`, unset-GUC fails closed, `qr_resolve_token` returns only its four columns. Merge-blocking in CI.

---

## 8. Explicitly NOT in Phase 1

No auth/login, no JWT, no users or memberships, no guest sessions (→ Phase 2). No `qr_scan_event` *writes* and no `context_binding` (→ Phase 2). No PULSE session execution (→ Phase 3, though the template is seeded). No signals, media, classification, feed, supervisor workflow, notifications, Learn5, rescue plan, moderation, community, GDPR, outbox, or audit-log wiring. If a task needs a logged-in user, it is not Phase 1.

---

## 9. Definition of Done (Phase 1 exit criteria)

- A fresh clone + `docker compose up` + `db:migrate` yields the 11 Phase-1 tables with RLS enabled and the backstop NOTICE, **zero manual steps**.
- `GET /v1/q/<known-token>` returns the full resolved envelope; unknown/inactive/revoked/draft tokens each return their correct 200 state; a malformed token returns 400; **nothing returns 404**.
- The RLS isolation suite is green **as `safein5_app`** (not as the owner): cross-tenant read = 0 rows, cross-tenant write = `42501`, unset GUC = fail-closed.
- `GET /healthz` and `/readyz` respond; the app drains its pool on SIGTERM.
- CI green: lint (`--max-warnings 0`), typecheck (`strict`), unit + RLS integration.
- **Demo:** a phone scans the printed sticker and the context comes back.

Then, and only then, move to Phase 2 (Identity & Access).
