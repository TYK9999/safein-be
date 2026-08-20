# SafeIn5 Backend — Design & Delivery Plan

> Owner: Principal backend engineer (this document is my ownership plan, not a survey).
> Baseline commit: `main` @ `a021fa6`. Target stack is fixed: NestJS 11 on Fastify · Kysely over managed Postgres 16 · Zod · S3-compatible object store · transactional outbox with an in-process polling worker · no Redis, no broker, no ORM.
> Status of source design: the authoritative schema (`docs/db/migrations/0001..0008`, ~5,940 lines, 38 tables, 44 RLS policies, 4 roles) is **complete and forensically strong but has never been executed by code and is not tracked in git** (`git ls-files docs` returns 0). This plan makes it real.

---

## 0. TL;DR — what I am building and in what order

**The spine.** I adopt the authoritative Postgres schema wholesale, make it executable and version-controlled in week 1, and build every contested product behaviour against the schema's **config-as-data** tables (`workflow_transition_def.enabled`, `workflow_state_def.enabled_in_mvp`, `classification.triggers_workflow`, `tenant.allow_guest_submission`, `tenant.retention_policy`). That single discipline converts roughly fifteen open register decisions from schedule blockers into `UPDATE` statements at Discovery — it is the highest-leverage risk reduction available and it is why I sequence risk-first rather than layer-first or slice-first.

I graft three things onto that spine:
1. **From vertical-slice:** every foundation milestone is demoed as a *journey*, not a CI badge. The M1 exit is a phone scanning a physically printed sticker (`token HJ7K3M9PQR2X` from the demo seed) and getting back *Brackley North Quarry / Lifting Zone 3 / Spreader Beam SB-14* — same substrate, reviewable output.
2. **From contract-first:** `@safein5/contracts` (Zod → OpenAPI) + a Prism mock seeded from the real `0008` data is published to the frontend on **Wednesday of week 1** as `v0.x` under a versioned change-note process — *not* a hard freeze, because freezing ~40 shapes before the media and RLS realities are executed once locks in guesses.
3. **From foundation-first:** two named production alarms (the `42501` write-path rate and the empty-feed-response read-path ratio) and a concrete demo artefact per milestone.

**Milestone sequence (14 weeks, 2 backend engineers):**

| M | Weeks | One-line goal |
|---|-------|---------------|
| **M0** | W1 | Schema in git · runnable migration runner · first green migration · **F-1 fix** · contracts + mock published · bootstrap hardened |
| **M1** | W2–3 | Tenancy spine + anonymity, **demoed as QR resolve** · partition-maintenance job · migrations 0009–0012 · T1–T15 isolation suite green in CI |
| **M2** | W4–6 | Identity/guest auth · PULSE · Rescue Plan (offline) · Learn5 read · consent capture · outbox + flusher · staging from IaC |
| **M3** | W7–9 | Capture under field conditions: signal draft→classify→finalise + **media pipeline rebuilt onto `signal_media`** · <60s NFR proven from production data |
| **M4** | W10–12 | Feed + read-state + search · Acknowledge/Close · moderation soft-hide · escalation record · Community public feed · **production stood up from IaC** |
| **M5** | W13–14 | GDPR export/erasure · retention purge · audit redaction · pen-test window · UAT · cutover (a promotion, not a build) |

**The three things that decide whether this ships:**
1. **Staffing honesty.** A *single* owner delivers, in 14 weeks, only: the tenancy spine + anonymity (F-1 closed) + the <60s capture path + the feed + Acknowledge/Close — **and nothing else**. The full feature set is a **two-engineer** plan (~85–105 dev-days of platform work, ~60 on the critical path; a solo owner nets ~4 productive dev-days/week ≈ ~56 over 14 weeks, *less than the critical path alone*). This is stated at Discovery, not discovered at Milestone 4. **§7 marks every explicit scope cut.**
2. **The cloud account exists on day 1 of M2.** It is a client responsibility with no date in the pack; late provisioning is day-for-day slip. I mitigate by developing against docker-compose + LocalStack so migration is a re-apply, not a rebuild.
3. **The anonymity change-note is signed in week 1.** The literal Dev Pack §7 reading ("strip user metadata at the DB level") is self-defeating; I proceed on the schema's pseudonymous `author_token` and get the deviation minuted before the first signal row is written.

---

## 1. Where we are today

### 1.1 The application code (24 `.ts` files, ~1,376 LOC)

The repository is roughly two days of scaffolding plus one genuinely developed feature (S3 multipart upload). Concretely:

**What exists and is broken / must go:**
- `src/main.ts` (22 lines) — no CORS (the PWA cannot call the API cross-origin), no helmet, no global prefix, no versioning, no exception filter, no body limit, no `enableShutdownHooks()` (so `DatabaseService.onModuleDestroy` at `src/database/database.service.ts:14` **never fires** — the pool is never drained on SIGTERM). `bootstrap()` is an unawaited floating promise.
- `src/database/database.provider.ts:11-18` — a single untyped `Kysely<unknown>` over `new Pool({connectionString})` with **zero** tuning (default `max: 10`, no timeouts, no `statement_timeout`, no SSL). One shared pool, one implicit role. No RLS, no `set_config`, no `AsyncLocalStorage`, no `tenant_id` anywhere.
- `src/user/**` — `GET /users` is an unauthenticated, unpaginated `selectFrom('users').selectAll()` returning every user's email; `src/user/user.service.ts:18` logs the raw email as PII; `GET /users/:id` does not validate the UUID; `CreateUserDto` is declared twice.
- `src/qrcode/**` — `create()` bakes **mutable business data** (site, asset, risk type) into the QR image itself (unfixable once printed); no `GET /:id` so a scanned code cannot be resolved; `console.log(encoded)` at `qrcode.service.ts:48`; the correct redirect strategy exists as dead code (`createWithRedirect`).
- `src/config/configuration.ts` re-reads `process.env` independently of the Zod-validated `env.schema.ts`, so `PORT` resolves to `NaN` unless `@nestjs/config`'s implicit backfill runs first.
- `src/uploads/s3.provider.ts:10-16` — hard-wires static AWS keys, disabling the IAM provider chain and blocking LocalStack/MinIO in dev/CI.
- Tests are red or vacuous: the two qrcode specs throw at DI resolution (no mocks for `DATABASE`/`ConfigService`); `test/app.e2e-spec.ts` asserts `GET /` = 200 against an `AppController` that is **not registered** in `AppModule`; the 501-line uploads service has **zero** tests; `testcontainers` is installed and unused.

**What is genuinely reusable (the one substantive asset):**
- `src/uploads/uploads.video.service.ts` (~501 LOC) — the S3 multipart **state-machine shape** is correct: `initiated → completed | aborted`, idempotent complete/abort, `409 PART_MISMATCH` on `InvalidPart`, `410 Gone` on non-active state, `ListParts` pagination, resume via re-presign. **~40% survives as logic; every line of its persistence and auth changes.** It carries three defects I must NOT port mechanically (§6.6).
- The **stack choice** (NestJS-on-Fastify + Kysely + Zod + nestjs-pino + `@nestjs/config`) matches the committed architecture exactly. Keep it.
- The **DI seam**: `@Global() DatabaseModule` exporting a `DATABASE` symbol. Keep the seam; replace the provider internals.

**Dead weight to remove in week 1:** `kafkajs`, `@nestjs/microservices`, `sharp`, `@nestjs/mapped-types` (pinned `*`) — all zero references in `src/`; `@types/express` in a Fastify-only app. `sharp` cannot extract video poster frames anyway.

### 1.2 The schema — verdict

There are two schemas on disk and they are not two versions of one design; they are a throwaway prototype and the real thing:

- **Ad-hoc** (`src/database/migrations/001_create_video_uploads.sql`, `002_...sql`, `qr_code.sql`, `src/seedData.sql`): 3 flat tables, **zero `tenant_id`**, no RLS, no audit, `qr_code.sql` not re-runnable, `users.email` not unique, `TIMESTAMP` not `TIMESTAMPTZ`.
- **Authoritative** (`docs/db/migrations/0001..0008`): 38 tables + 14 partitions, 44 RLS policies (`ENABLE + FORCE`), 4 `NOBYPASSRLS` roles, composite `(id, tenant_id)` FKs throughout, anonymity `CHECK` invariants, partitioned append-only `audit_log` + `outbox_event`, config-as-data workflow machine, two deploy-time backstops that `RAISE EXCEPTION` if any tenant-scoped relation lacks RLS or any runtime role holds an unexpected `DELETE`.

**Verdict: adopt the authoritative schema wholesale; delete the ad-hoc set and `src/seedData.sql`.** No production data exists (there is no migration runner), and the `0007` backstop cannot coexist with the ad-hoc tables. Verified today: `grep -c tenant_id` across the authoritative files ≫ 0; across `src/` = 0. This is 15–20 dev-days of completed design work that currently survives only untracked on one laptop, in two undiffed copies. **The first commit of Monday morning is `git add` of this schema.**

---

## 2. Target architecture for the MVP

### 2.1 Shape: one deployable, two processes, modular monolith

Per the architecture doc, I ship **one** backend deployable, `safein5-api`, as a NestJS modular monolith, plus a **second process from the same image** (`NODE_ROLE=worker`) for the outbox flusher and background jobs. Microservices are rejected: the transactional outbox requires the domain write and the event write to commit in **one** Postgres transaction, and splitting services would add 3–4 weeks of infrastructure with no pilot-visible feature. Production runs `min-instances >= 1` because in-process polling workers stop on a scale-to-zero PaaS.

The eight core services from the architecture doc map to NestJS modules; each exposes only its `*.facade.ts`, owns its own tables, and no other module writes them. Cross-module repository imports are blocked by an ESLint `no-restricted-imports` rule **plus** a `dependency-cruiser` CI check.

| Core service | NestJS module | Owns |
|---|---|---|
| Behaviour Signal | `signal` | `behaviour_signal`, `pulse_session`, `signal_read_state`, `signal_classification_event` |
| Media | `media` | `signal_media` + S3 objects |
| Classification | `classification` | `classification` (global ref) |
| Search & Feed | `feed` | read-only over domain tables + Postgres FTS |
| QR / Context | `qr-context` | `qr_code`, `qr_context`, `qr_scan_event`, `context_binding` |
| Workflow | `workflow` | `review_task`, `workflow_transition`, `evidence`, `moderation_action` |
| Notification | `notification` | `notification`, `device_subscription` |
| Context Engine | (folded into `qr-context`) | `context_binding` resolution + `context_snapshot` |

Supporting modules: `identity` (the **only** module bound to the `safein5_identity` pool), `tenancy` (RLS runtime), `learning` (`learn5_*`, `rescue_plan`, `pulse_template`), `community` (`escalation_record`, public feed write path), `consent`, `admin` (thin, seed-script-first for the pilot — see §7), `platform` (http/outbox/audit/observability primitives).

### 2.2 Request path (steady state)

```
PWA → HTTPS → Fastify
  → AuthGuard (verify JWT: sub, tid, mid, rol, atk)          [global APP_GUARD, @Public() opt-out]
  → TenantContextInterceptor
        db.transaction().execute(async trx =>
          SET LOCAL app.tenant_id            (bind param, is_local=true)
          SET LOCAL app.community_tenant_id  ONLY on the community/unauth path
          guard: RAISE 42501 if app.tenant_id did not take
          AsyncLocalStorage.run({trx, tenantId, authorToken, membershipId, role})
          → ZodValidationPipe → Controller → Module Facade → Repository (client from ALS)
              + OutboxWriter INSERT in the same trx
          COMMIT | ROLLBACK)
  → AllExceptionsFilter → { code, message, requestId, details? }

Worker: poll outbox_event WHERE published_at IS NULL FOR UPDATE SKIP LOCKED, 1s
```

The **unauthenticated QR-resolve path** is the deliberate exception: it is two-phase (§3.5) and never runs the tenant interceptor for phase 1.

### 2.3 Folder tree I am adopting

```
safein5-be/
├─ db/
│  ├─ migrations/                 # moved from docs/db/migrations, committed
│  │   ├─ 0001_foundation.sql … 0008_seed_demo.sql   (authoritative, unchanged)
│  │   ├─ 0009_fix_app_grants.sql          # F-1
│  │   ├─ 0010_media_multipart.sql         # signal_media s3_upload_id/part_size/part_count
│  │   ├─ 0011_qr_resolve_fn.sql           # SECURITY DEFINER content-free lookup + signal_media community policy
│  │   └─ 0012_consent_escalation_reporting.sql   # missing MUST entities
│  ├─ migrate.ts                  # Kysely Migrator + FileMigrationProvider (excludes 0008)
│  ├─ seed-demo.ts                # runs 0008 only, guarded on NODE_ENV !== production
│  ├─ types.gen.ts                # kysely-codegen output (never hand-edited)
│  └─ tests/rls/                  # T1–T15 isolation suite + two-tenant fixture
├─ ops/
│  ├─ partitions/create-next.ts   # monthly partition maintenance (migrator creds)
│  └─ terraform/                  # dev / staging / prod IaC
├─ packages/contracts/            # @safein5/contracts — Zod + generated OpenAPI
├─ mock/                          # Prism config + examples generated from the seed
├─ specifications/                # DevX AI-Pods artifact chain (§11)
├─ progress.md
└─ src/
   ├─ main.ts  bootstrap.ts
   ├─ platform/{database, tenancy, http, outbox, audit, observability}/
   ├─ modules/{identity, qr-context, signal, media, classification, feed,
   │           learning, workflow, notification, community, consent, admin}/
   └─ worker/{worker.main.ts, outbox.flusher.ts, media.finaliser.ts, reconciler.ts,
              draft-reaper.ts, notification.dispatcher.ts, retention.purge.ts}
```

---

## 3. Non-negotiable foundations

### 3.1 Multi-tenancy + RLS: the exact mechanism

Every tenant-scoped table is `ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY` (so the owner cannot implicitly bypass), with the uniform policy shape from `0007`:

```sql
CREATE POLICY pol_tenant_isolation_<t> ON <t>
  USING (current_setting('app.bypass_rls', true) = 'on'
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
```

`USING` (reads) carries a bypass escape for the worker/system path; `WITH CHECK` (writes) carries the tenant match **only** — so even the cross-tenant flusher physically cannot write into the wrong tenant. `current_setting(..., true)` returns `NULL` when unset, so an unscoped connection **fails closed** (zero rows on read, `42501` on write).

Four roles, all `NOLOGIN NOBYPASSRLS`, three runtime pools: `safein5_app` (large), `safein5_identity` (deliberately **small** — the only role permitted to read the pseudonym mapping and `tenant_secret`; pool size is itself part of the control), `safein5_worker`. `safein5_migrator` owns every object and is used only for migrations and partition maintenance. **PgBouncer runs in transaction pooling mode** (session mode wastes connections; statement mode is forbidden because every tenant-scoped operation is a multi-statement transaction).

### 3.2 Request-scoped DB context (the interceptor)

`SET LOCAL` is a no-op outside an explicit transaction and must use a bind parameter, never string interpolation (that would be SQL injection straight into the security boundary). I resolve the tenant client from `AsyncLocalStorage`; a repository that reaches for the pool instead of ALS is banned by lint.

```ts
// src/platform/tenancy/tenant-context.interceptor.ts
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(@Inject(DATABASE) private readonly db: Kysely<DB>,
              private readonly als: AsyncLocalStorage<TenantCtx>) {}

  async intercept(exec: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = exec.switchToHttp().getRequest();
    const claims = req.jwt;                 // { tid, sub, mid, rol, atk } or undefined for @Public()
    const communityMode = req.communityRead === true;   // set only by the community/unauth resolver

    const result = await this.db.transaction().execute(async (trx) => {
      // is_local=true → SET LOCAL semantics, auto-reset at COMMIT/ROLLBACK, safe under PgBouncer txn pooling
      await sql`select set_config('app.tenant_id', ${claims?.tid ?? null}, true)`.execute(trx);
      if (communityMode) {
        await sql`select set_config('app.community_tenant_id', ${COMMUNITY_TENANT_ID}, true)`.execute(trx);
      }
      // Guard: a forgotten GUC on a READ path returns zero rows silently — fail loud instead.
      if (!communityMode) {
        await sql`do $$ begin
          if nullif(current_setting('app.tenant_id', true), '') is null then
            raise exception 'tenant context not set' using errcode = '42501';
          end if; end $$`.execute(trx);
      }
      return this.als.run(
        { trx, tenantId: claims?.tid, authorToken: claims?.atk, membershipId: claims?.mid, role: claims?.rol },
        async () => firstValueFrom(next.handle())
      );
    });
    return of(result);
  }
}
```

> **Corrected from the losing plans:** `app.community_tenant_id` is set **only** on the community/unauthenticated read path, never on authenticated corporate requests. `pol_community_public_read` is a *permissive* policy that ORs community-public rows into any `behaviour_signal` SELECT whenever `tenant_id = app.community_tenant_id`; setting that GUC unconditionally would silently mix community rows into corporate feeds that forget an explicit tenant predicate. (Verified: the policy exists on `behaviour_signal` at `0005_signal.sql:770`.)

`runAsSystem(reason, fn)` is the **only** place `app.bypass_rls='on'` is ever set, worker-pool only, and it writes an `audit_log` row *before* the bypassed work. An ESLint `no-restricted-properties` rule bans `pool.query`/`pool.connect` outside the interceptor and `runAsSystem`.

### 3.3 Kysely transaction + repository convention

Repositories never open their own transaction; they take `trx` from ALS via a base class:

```ts
// src/platform/database/repository.base.ts
export abstract class Repo {
  protected get db(): Kysely<DB> {
    const ctx = tenantAls.getStore();
    if (!ctx?.trx) throw new Error('No tenant transaction in scope');
    return ctx.trx;      // the request-scoped, GUC-set transaction connection
  }
}
```

The application layer **also** carries an explicit `WHERE tenant_id = :t` predicate on every query. RLS is defence-in-depth; the explicit predicate is what lets the composite `(tenant_id, …)` indexes drive the scan.

### 3.4 Anonymity: the pseudonym, and the F-1 fix (verified critical)

`author_token` is a per-user-per-tenant one-way HMAC pseudonym, **always** populated, while `author_user_id` is `NULL` iff anonymous (enforced by `ck_behaviour_signal_anonymity`). It is minted only by the `identity` module on the `safein5_identity` pool:

```ts
// src/modules/identity/author-token.service.ts  (identity pool only)
function deriveAuthorToken(userId: string, tenantSalt: Buffer, pepper: Buffer): string {
  const mac = crypto.createHmac('sha256', pepper)
    .update(Buffer.concat([tenantSalt, Buffer.from(':'), Buffer.from(userId)]))
    .digest();
  // RFC4648 base32, uppercase, no padding; first 20 bytes (160 bits) → 32 chars in [A-Z2-7] ⊂ ^[0-9A-Z]{32}$
  return base32.encode(mac.subarray(0, 20), { padding: false }).toUpperCase();
}
```

The **pepper** (32 bytes) lives in KMS/Secrets Manager — never in the DB, never in git. The per-tenant `author_token_salt` (16 bytes) lives in `tenant_secret`, readable only by `safein5_identity`. Guest tokens are minted **randomly** (20 CSPRNG bytes → base32), not derived — identical shape, so `qr_scan_event`, `learn5_view` and `signal_read_state` key on `author_token` alone with no `user_id` column. `is_anonymous` is **materialised at capture** from `membership.anonymous_override ?? app_user.default_anonymous` and never read live. The token travels in the JWT `atk` claim, so `safein5_app` never needs to read the mapping on the hot path.

**F-1 — CONFIRMED, CRITICAL, and the fix the losing plans got wrong.** Verified today at `docs/db/migrations/0007_rls_roles.sql:181`: `safein5_app` holds a *table-level* `GRANT SELECT, INSERT, UPDATE ON ... behaviour_signal, signal_media, signal_read_state ... TO safein5_app` (block L165–188). Because PostgreSQL column privileges are **additive** to table privileges (the file's own comment at L203–208 documents this exact trap), the table-level grant lets `safein5_app` read `behaviour_signal.author_token`. The column-enumeration fix was applied only to `app_user.password_hash` (L235) and `user_tenant_membership.author_token` (L258) — **never to `behaviour_signal`**. A self-join of an anonymous signal to an attributed signal sharing an `author_token`, then to `app_user`, names the anonymous author *as the ordinary application role, with no privileged access*. Every mixed-mode reporter — exactly what the repeat-usage metric captures — is exposed.

The naive fix (drop the column) is **insufficient**: it breaks the rate limiter and the repeat-usage metric (`COUNT(DISTINCT author_token)`), which legitimately run as `safein5_app`. My **two-part fix** (`0009_fix_app_grants.sql`):

1. Replace the table-level grants on `behaviour_signal` and `pulse_session` (the two tables carrying `author_user_id`) with column-enumerated grants that **keep `INSERT(author_token)`** but **omit `SELECT(author_token)`**, following the exact `app_user` pattern. Once these two are withheld, every join path from `qr_scan_event`/`learn5_view`/`signal_read_state` (no `user_id`) to identity is severed, so those tables keep `SELECT(author_token)` for the app.
2. Route the legitimate aggregates off `safein5_app`:
   - **Repeat usage** → `safein5_identity` (which holds the mapping) or a `SECURITY DEFINER` count function returning only the integer.
   - **Per-account rate limiting** → a durable `rate_limit_counter` table (§3.6), which exposes `author_token` but has no identity linkage and cannot be joined to a now-unreadable `behaviour_signal.author_token`.
3. CI assertions in the isolation suite, merge-blocking:
   ```sql
   -- must be false
   SELECT has_column_privilege('safein5_app','behaviour_signal','author_token','SELECT');
   -- must be true (writes still allowed)
   SELECT has_column_privilege('safein5_app','behaviour_signal','author_token','INSERT');
   ```
   plus a **query-shape test** proving no `safein5_app` path can return two distinct `author_user_id`s correlated via a shared `author_token`.

Secondary hardening: withhold `SELECT(author_token)` from `safein5_worker` on `behaviour_signal`/`pulse_session` too (line 382 currently grants it; no worker job needs it).

Also enforced: geolocation is rounded to 3 decimals (~110 m) by the application before storing on anonymous rows (the schema only range-checks); EXIF is stripped unconditionally (the invariant lives in `ck_signal_media_exif_always_stripped`).

### 3.5 Auth/identity + the unauthenticated QR-resolve mechanism (verified correction)

- **Workers/Community:** email OTP + magic link, tokens stored hashed, single-use, supersession by setting `consumed_at` (the live-token unique indexes cannot test expiry — `now()` is not `IMMUTABLE`), identical response **and timing** for unregistered addresses. JWT carries `{sub, tid, mid, rol, atk}`. **Asymmetric signing (EdDSA/RS256) with a `kid` and rotation** — because the JWT both authenticates *and* carries the `atk` pseudonym, a symmetric-secret compromise is total.
- **Admins:** email + bcrypt, forgot-password, sessions revocable on block/delete.
- **Guests:** signed HttpOnly cookie; `guest_session.client_token_hash = SHA-256(cookie value)` (raw value never stored); random `author_token`; `promoted_user_id` attaches prior activity on registration without re-keying any row.
- **Global `APP_GUARD`** with a `@Public()` decorator for the resolve/PULSE/rescue-plan/learn5 read paths.

**QR resolve cannot execute as three of the losing plans wrote it.** Verified: `qr_code`/`qr_context` are `FORCE RLS` with tenant-isolation policies only and *no* public-read policy. An unauthenticated resolve has no `app.tenant_id`, so `(VALUES(:token))`-driven reads return **zero rows**. Risk-first's fix (a `SECURITY DEFINER` function owned by `safein5_migrator`) also fails as stated: `safein5_migrator` is `NOBYPASSRLS`, and under `FORCE RLS` even the owner is subject to policy — so the function must **set the bypass GUC inside its body**, not rely on ownership. My `0011_qr_resolve_fn.sql`:

```sql
CREATE FUNCTION qr_resolve_token(p_token text)
RETURNS TABLE(qr_code_id uuid, tenant_id uuid, qr_context_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'on', true);   -- local; satisfies the policy USING clause
  RETURN QUERY
    SELECT c.id, c.tenant_id, c.qr_context_id, c.status
    FROM qr_code c WHERE c.token = upper(p_token);     -- content-free columns ONLY
END $$;
REVOKE ALL ON FUNCTION qr_resolve_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION qr_resolve_token(text) TO safein5_app;
```

Phase 1 calls this function (returns only the four content-free columns; `safein5_app` never gains the ability to set the bypass GUC on its own queries). Phase 2 opens a **normal tenant-scoped transaction** with `app.tenant_id` = the resolved tenant, reading the full context (site/sub-site/asset/pulse_template/rescue_plan/learn5) via the ordinary RLS path. The function is covered by its own cross-tenant isolation test. `app.bypass_rls` on the API pool is banned by lint.

The endpoint **never returns 404** for a well-formed token: the five-state resolution (`unknown | revoked | inactive | unconfigured | resolved`) all return HTTP 200 — a printed safety sticker is never a dead end. It is IP-rate-limited at the edge (an enumeration oracle for a site's sticker inventory otherwise).

### 3.6 Idempotency, audit, outbox, durable rate limiting

- **Idempotency:** `behaviour_signal.id` and `signal_media.id` are **client-minted UUIDv7** before the first network call; `POST /signals/draft` uses `ON CONFLICT (id) DO NOTHING`; finalise uses the CTE `UNION ALL` shape so a retry on an already-final row returns 200, not 409.
- **Outbox:** `OutboxWriter.emit(trx, event)` INSERTs into `outbox_event` **in the same transaction** as the domain write — if the domain write commits, the event exists; no dual-write window. `ck_outbox_event_payload_pseudonymous` only inspects **top-level** keys, so the real defence is a **serialiser allowlist** (a nested `{actor:{userId}}` passes the CHECK and permanently poisons the SIGNAL corpus). Event types match `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`; payloads carry `authorToken`, never `userId`/email. Rows are **never deleted after publishing during the pilot**.
- **Audit:** append-only (`INSERT`-only grant; `UPDATE`/`DELETE` revoked and asserted by test), same transaction as the audited action, `actor_ref` a pseudonym, `before`/`after` **PII-redacted by a column allowlist that is unit-tested as a merge gate** (a raw `JSON.stringify(row)` reintroduces the email the rest of the schema removes). `ip_hash`/`user_agent_hash` are salted SHA-256. For any field that must retain original values, **crypto-shredding**: encrypt under a per-subject key held in the erasable `user_tenant_membership`/`tenant_secret` row, so erasure destroys the key. The same allowlist applies to `outbox_event` payloads.
- **Rate limiting (durable, no Redis):** per-account counters live in a Postgres `rate_limit_counter` table keyed on `author_token`, incremented in the write transaction. Per-IP/abuse limits run **at the edge/WAF** on plaintext IP + a signed device cookie, *before* the request reaches the app — because the schema stores IP only as a one-way hash and an in-process LRU is silently defeated by a second API instance (the pilot runs ≥ 2). Guest re-mints its `author_token` on every scan, so the Community write path additionally requires a lightweight proof (OTP) or stays invite-only for the pilot (§7).

---

## 4. Data layer

### 4.1 Migration tooling

**Kysely `Migrator` + `FileMigrationProvider`.** Each migration is a thin `.ts` that executes its sibling `.sql` via `sql.raw`, giving a `kysely_migration` + `kysely_migration_lock` tracking table for free. Forward-only (no down migrations; `0002–0006` contain zero `IF NOT EXISTS`). Rejected: any ORM-owned schema (TypeORM `synchronize`, Prisma, Drizzle push) — none can express `FORCE ROW LEVEL SECURITY`, per-partition policies, column-enumerated grants, the generated `tsvector`, composite `(id, tenant_id)` FKs, or the `DO`-block backstops.

**The 0008 trap (verified).** `0008_seed_demo.sql` is the *only* file carrying its own `BEGIN;` (L27) / `COMMIT;` (L670) with `set_config(..., true)` (L60). Wrapped by the runner, its inner `COMMIT` closes the runner's outer transaction and orphans the tracking write. I **exclude 0008 from the runner** entirely and invoke it as `db:seed:demo`, hard-guarded on `NODE_ENV !== 'production'`. The `DO $$ BEGIN … END $$` blocks in `0001`/`0007` are PL/pgSQL, **not** transaction control — left intact. Verified: no `CREATE INDEX CONCURRENTLY` and no psql meta-commands anywhere, so `0001–0007` each run safely as one wrapped transaction.

**Production migration procedure** (this is a live multi-tenant DB, migrations are irreversible): take a DB snapshot immediately before every migrate; run in a maintenance window; forward-fix-only (a corrective migration, never edited history); `grep` runner stdout for **both** `SafeIn5 RLS backstop passed` and `no-delete backstop passed` and fail the deploy if either is absent; smoke-test the RLS suite against the migrated DB before cutover.

**First-run hardening is real work, not a given.** The schema has never been executed. Role/grant ordering against `NOLOGIN` roles, the `RAISE EXCEPTION` backstops, dollar-quoted functions, and 14 partition blocks will not apply clean on attempt one. Budget **2–3 dev-days** in week 1 to iterate to a green run.

### 4.2 Kysely type generation

`kysely-codegen` over the live schema → `db/types.gen.ts`, wired to `npm run db:types`, never hand-edited. It correctly emits `GeneratedAlways<>` for `behaviour_signal.search_vector` (a `GENERATED … STORED` column — any insert including it raises an error) and `Generated<>` for defaults. It does **not** fix the runtime type of `bigint`/`numeric` (node-pg returns both as JS **strings**): I register pg type parsers for OID 20 (`int8`) and OID 1700 (`numeric`) — parsing latency ints to number where safe, standardising the rest on string. Same task: turn on `tsconfig strict: true` (`noImplicitAny`, `strictBindCallApply`) so mismatches fail the build.

### 4.3 Repository conventions & the Join Cookbook

The 14 canonical read queries in `docs/db/SafeIn5-Join-Cookbook.md` are implemented verbatim: the feed's `[unread, severity_ordinal DESC, created_at DESC, id DESC]` tuple with keyset pagination on `(createdAt, id)` (never OFFSET), the `LATERAL` thumbnail join, the `WITH RECURSIVE` sub-site descendant expansion, `websearch_to_tsquery` bound once via `CROSS JOIN`, and the repeat-usage `COUNT(DISTINCT author_token)`. `severity_ordinal` lives on `classification`, so I denormalise it onto `behaviour_signal` by trigger and add `idx_behaviour_signal_feed_order` so the feed is a pure index-order scan (Cookbook flag). I add the two Cookbook-flagged missing indexes: `idx_behaviour_signal_insight (tenant_id, classification_code, occurred_at DESC)` and a `finalised_at` index — `occurred_at`/`finalised_at` are indexed nowhere today yet every analytics query filters on them.

### 4.4 Seed/demo data & integration tests

`0008` (the Brackley Aggregates spreader-beam scenario, fixed `b0000000-…-0000NN` UUIDs) is the demo/CI fixture only; production stops after `0007`. The isolation suite (`db/tests/rls/`) transcribes **T1–T14** verbatim from `docs/db/SafeIn5-Schema-Implementation-Guide.md §8`, runs as `safein5_app` (running as the owner is worthless) against a Testcontainers Postgres built from `0001–0012` from scratch, in under ten seconds, merge-blocking. **T15** is a Jest HTTP test: authenticate as Tenant Alpha and assert no Beta identifier appears in **any** response body *including error messages* (a 404 echoing a foreign id proves the row exists). **Every fixture seeds two tenants** — a single-tenant fixture passes identically whether RLS works, is disabled, or the GUC is unset, and proves nothing. `T2` (fail-closed) and `T3`'s positive control are the two tests I never delete.

---

## 5. API surface & contract

- **Convention:** REST under `/v1`, global prefix + URI versioning, Zod-validated request **and response**, OpenAPI generated from the same Zod schemas via `nestjs-zod`'s `patchNestJsSwagger()`, keyset pagination everywhere. Full inventory in **Appendix B**.
- **Error envelope:** `{ code, message, requestId, details? }`. A global filter maps SQLSTATE `23505/23503/23514/22P02/42501` **plus the named constraint** (every constraint is `ck_/uq_/fk_`-prefixed for exactly this) to field-level errors and **sanitises all driver/AWS text** — the current code returns the raw AWS message verbatim (`uploads.video.service.ts:328`), leaking bucket names and request ids.
- **Contract published Wednesday of week 1.** `@safein5/contracts` (a workspace package: Zod schemas + generated TS types + generated `openapi.json`, with `enums.ts` mirrored from the DB `CHECK` constraints) is the single source of truth for api/pwa/admin. A Prism mock serves example payloads **extracted from the seeded `0008` database** (real UUIDs, real token `HJ7K3M9PQR2X`, real four signals), so the frontend integrates against real-shaped data, not hand-written fakes. This unblocks both parallel frontend streams on day 3.
- **Soft freeze, not hard freeze.** The contract for the nine worker-critical endpoints ships as `v0.x` with a **versioned change-note process**; a CI **contract-drift check** regenerates `openapi.json` and fails the build if it differs from the committed file (this is also what stops the anonymity response-DTO union — no `author` field on the anonymous variant — silently eroding as endpoints are added). I do **not** freeze all ~40 shapes at W3 before the media and RLS realities are executed once.

---

## 6. Feature build-out

For each module: MVP scope, key endpoints, key tables, and a **corrected** effort estimate.

### 6.1 Identity & auth · M2 · ~5–6 dev-days
Email OTP + magic link; JWT issue/verify with `atk`; guest session + promotion; bcrypt admin login + forgot-password; `app_user` global identity with `user_tenant_membership` per tenant and many-to-many `user_site_assignment`; invitation creating memberships not duplicate users. Authorisation reads `role.permissions` (a flat jsonb string array) by **set-membership** against `workflow_transition_def.required_permission` — never a hardcoded role enum. Endpoints: `POST /v1/auth/otp/request|verify`, `/v1/auth/magic-link`, `/v1/auth/guest`, `/v1/auth/guest/promote`, `/v1/admin/auth/login|forgot`, `GET/PATCH /v1/me`.

### 6.2 QR & context · M1 (resolve) + M2 (admin) · ~11–13 dev-days
Two-phase resolve (§3.5). `context_binding` UPSERT on `(tenant, actor_kind, actor_ref)` with 8h expiry (expired = **absent**, fall back to `user_site_assignment` then manual — never silently extended). Crockford base32 12-char token, uppercased on lookup. Emits `qr.scanned`. Endpoints: `GET /v1/q/:token`, `POST /v1/context/bind`, `GET /v1/context/current`, admin `GET/POST/PATCH /v1/admin/qr-contexts`, `POST /v1/admin/qr-codes/:id/activate|revoke`, render SVG/PNG (ECC level H). Tables: `qr_code`, `qr_context`, `qr_scan_event`, `context_binding`, `pulse_template`.

### 6.3 PULSE · M2 · ~5–7 dev-days
`pulse_template` resolution (`qr_context.pulse_template_id` → `risk_type_code` → `task_type_code`, admitting `tenant_id IS NULL` globals). Session lifecycle with `entry_point`, `context_snapshot` (written once), `steps_completed[]`, `duration_ms`, `outcome`. Guest-capable; persists with `context_source='none'` on direct launch; always the full five steps. Endpoints: `POST /v1/pulse-sessions`, `PATCH /v1/pulse-sessions/:id`, `POST /v1/pulse-sessions/:id/complete`, `GET /v1/pulse/templates/resolve`.

### 6.4 Signal capture · M3 · ~11–13 dev-days
Draft/final are the **same row** (splitting breaks the `signal_media` FKs attached during draft). Three-layer status guard (DB `CHECK` + facade transition guard + optimistic `UPDATE … WHERE status=$expected`). Zero mandatory fields. Records `capture_latency_ms` and `classification_latency_ms` client-measured (unbackfillable; the <60s and <10s NFRs are unprovable without them). Emits `signal.finalised` + `audit_log` in the same transaction. Endpoints: `POST /v1/signals/draft`, `PATCH /v1/signals/:id`, `POST /v1/signals/:id/classify|finalise`, `GET /v1/signals/:id`, `GET /v1/signals/mine`.

### 6.5 Classification · M3 · ~2–3 dev-days
Global seeded reference table (`good_practice/1`, `be_aware/2`, `needs_attention_now/3`; only the last `triggers_workflow=true`); `severity_ordinal` `UNIQUE` so feed ordering lives in SQL. Append-only `signal_classification_event` (worker-vs-reviewer disagreement is training data). Retired labels *Emerging Risk* / *Stop & Act Now* appear nowhere.

### 6.6 Media pipeline · M3 · **~8–12 dev-days (NOT a "port")**
This is the estimation critic's correction and I take it. Verified: `signal_media` has **no** multipart columns (`grep upload_id` = 0). The rework is: `0010` adds `s3_upload_id text`, `part_size int`, `part_count int` + `CREATE UNIQUE INDEX uq_signal_media_s3_upload_id … WHERE s3_upload_id IS NOT NULL` (the current ad-hoc table's missing uniqueness lets the completion UPDATE hit multiple rows); re-point the existing state machine onto `signal_media` with `tenant_id` + `signal_id` + a tenant-prefixed `storage_key` (CHECK-enforced); **auth every route**; presigned direct-to-S3 with a compensating `AbortMultipartUpload` if the DB insert fails; `HeadObject` verification of real bytes/duration/type at complete (the 30s/200MB limits are client-declared lies today); extension allow-list cross-checked against a sniffed MIME; SSE-KMS on `CreateMultipartUpload`; short-TTL **signed GET** for playback (the stored public `us-east-1` URL 403s on a private bucket); worker finaliser strips EXIF **before** deriving thumbnails, generates the poster frame, and only then sets `state='ready'`. **Serving is gated on `state='ready' AND processed_at IS NOT NULL`, never on `exif_stripped`** — verified `exif_stripped` is `DEFAULT true` + `CHECK`, so it can never signal "stripping happened". A 10-minute reconciler HEADs S3 to close the "upload succeeded but `/complete` never arrived" hole; a 24h draft reaper; an S3 `AbortIncompleteMultipartUpload` lifecycle rule.

Three defects I must **not** port mechanically: `abortUpload`'s `!row` early-return that returns 200 without calling S3 (it hides the exact orphans the non-atomic insert creates); the dead `NoSuchUpload` catch in `resignParts` (makes the documented 410-on-expiry contract a lie — `getSignedUrl` never contacts S3); and the `ListParts` infinite-loop when `IsTruncated` is true with an undefined `NextPartNumberMarker`.

### 6.7 Feed & read state · M4 · ~9–11 dev-days
The Join-Cookbook feed (§4.3). Anonymity enforced at the **serialisation boundary** (a Zod response union with no `author` field on the anonymous variant, never a mapper conditional). `signal_read_state` keyed `(author_token, signal_id)`, written after ≥1000ms card visibility; unseen-count anti-join drives the verbatim "You're caught up" boundary card; closing a signal re-marks it unread site-wide for 24h. Corporate feed requires an authenticated, site-assigned user at RLS; cross-tenant direct-ID returns **not-found**, never a permission error that confirms existence. Endpoints: `GET /v1/feed`, `GET /v1/feed/unseen-count`, `POST /v1/feed/read`, `GET /v1/search`.

### 6.8 Learn 5 & Rescue Plan · M2 · ~7–9 dev-days
`learn5_item` with nullable `tenant_id` (NULL = SafeIn5-global); `learn5_binding` six-arm `num_nonnulls(...)=1` resolution; deterministic designated PULSE card; `learn5_view` telemetry keyed on `author_token` only (a named Phase-1 success metric, unreconstructable retrospectively). Rescue Plan is a **structured six-field** record (ordered `immediate_actions` with `seq`, tap-to-call `escalation_contacts`, version, review date), served **unauthenticated** with `ETag`/`Last-Modified` so the service worker caches it offline — the **only** screen with a mandated offline guarantee. An expired `review_date` still **displays** with a staleness banner, never withheld.

### 6.9 Supervisor workflow · M4 · ~9–11 dev-days
`review_task` created by the `WorkflowTaskCreator` outbox consumer when `classification.triggers_workflow` is true (idempotent via `uq_review_task_signal`). **Every transition is validated by a lookup against `workflow_transition_def`** — absent or `enabled=false` ⇒ 409 regardless of caller role. Only `open→acknowledged→closed` is enabled; `open→closed` is seeded **disabled** so `first_response_ms` survives. Acknowledge = one idempotent tap; Close = mandatory comment, stamps both timestamps in one transaction if New. Immutable `workflow_transition` rows with snapshotted `actor_role`; `first_response_ms`/`time_to_close_ms` materialised at transition time; `behaviour_signal.workflow_state` denormalised in the same transaction. **No notification route is keyed to signal authorship** — closure renders publicly on the card. Endpoints: `POST /v1/review-tasks/:id/acknowledge|close`, `GET /v1/supervisor/needs-response|latest`.

### 6.10 Notifications · M4 · ~6 dev-days (reduced scope)
In-app notification centre is the **guaranteed** channel; web-push (VAPID) is best-effort (iOS needs 16.4+ and a home-screen-installed PWA). `device_subscription`; `notification.dedupe_key` under the partial unique index (the single most effective defence against notification storms); dispatcher is an **outbox consumer only**, never on a request path; minimised payload (classification, site name, relative time, signal id — no caption, transcript, media, or author). Recipient identity for a closure on an anonymous signal is resolved token→membership→user **through the identity module only**. Note: `WRK-022`'s decision cells are a verbatim copy of the voice requirement and its dependencies are graded WON'T — I build the in-app loop, not predictive push.

### 6.11 Moderation & Community tier · M4 · ~8–10 dev-days
Reversible **soft-hide** (never hard delete) propagating to every feed/filter/search/deep-link within 5s; fixed reason codes including "identifies an individual"; caption correction writing `previous_value`/`new_value` to `moderation_action`; classification immutable to admins; block-author resolved by token so the moderator blocks a pseudonym and never learns a name. **Community write path (verified gap):** the app must explicitly set `visibility='public'` when `tenant.kind='community'` — the column DEFAULTs to `'site'` for every tenant, so `pol_community_public_read` returns nothing until this exists and the entire adoption tier is silently empty. **New in `0012`:** `escalation_record` (referral target, date, internal note, mandatory ≤280-char public status note, status, resolved_at — no outbound integration) surfaced on the Community card; `content_report` (target signal, reporter token, reason, `UNIQUE(signal_id, author_token)`) feeding the report-count queue; `audience` on `user_tenant_membership` and denormalised on `behaviour_signal` for the tri-state Community feed filter. **`pol_community_public_read` on `signal_media`** (verified missing — `grep` shows it exists only on `behaviour_signal`) so unauthenticated Community cards render their thumbnails, covered by a test that fetches a media-bearing community signal on the unauthenticated path.

### 6.12 Consent · M2 · ~2–3 dev-days (new, MUST, verified missing)
Verified: no `consent_record` table anywhere. GDPR export (`§11 FR007`) and the audit event (`FR037`) are unbuildable without it. **New in `0012`:** `consent_record` (tenant_id, user_id nullable, guest_session_id nullable, document_type, document_version, `accepted_at` UTC, source), RLS + grants; acceptance wired into onboarding, into both export builders, and into the audit catalogue (`consent.accepted`). Guests get a static notice on the QR landing page. Lawful basis (Register #28): legitimate-interest Corporate / consent Community, minuted week 1.

### 6.13 GDPR export/erasure & retention · M5 · ~6–8 dev-days
Runs on the `safein5_identity` pool. **Art.15 export** resolves the subject's `author_tokens` through `user_tenant_membership UNION guest_session.promoted_user_id` and queries **by token** — an export keyed on `author_user_id` silently misses every anonymous signal. **Art.17 erasure** is one ordered transaction: capture tokens → redact `body_text` by `(tenant_id, author_token)` → null author FKs → delete credentials/devices/notifications → `DELETE` the membership row (the schema's **only** DELETE, which destroys the token mapping and the crypto-shred key) → tombstone `app_user` under `ck_app_user_erased_is_scrubbed`. A **restore-reconciliation** step re-applies erasures and moderation-hides recorded after a restore point (driven from the audit log), because a naive DB restore resurrects erased personal data. Nightly retention purge driven by `tenant.retention_policy` (config, not constants); the purge never points at `outbox_event`.

---

## 7. Milestone plan

**Staffing:** primary owner from W1; **a second backend engineer joins by end of W2** and runs a parallel track (IaC, contracts/test-infra hardening, Learn5/rescue content plumbing, Community, GDPR). **A single owner alone delivers, in 14 weeks, only M0–M1 + the capture path of M3 + the feed and Acknowledge/Close of M4 — the rest is the second engineer's track.** This is stated at Discovery.

| M | Wks | Goal | Key deliverables | Exit criteria | Demo |
|---|-----|------|------------------|---------------|------|
| **M0** | W1 | Schema real, contract live, F-1 closed | schema→git; runner (excl. 0008); first green migration; `0009` F-1 fix; `main.ts` hardening; `@safein5/contracts` + Prism mock; CI (lint `--max-warnings 0`, typecheck, unit, migrate+backstop grep) | `git ls-files db` ≥ 8; a fresh clone + `docker compose up` + `db:migrate` yields 52 tables/14 partitions/44 policies with zero manual steps and both backstop NOTICEs; `has_column_privilege(app, behaviour_signal, author_token, SELECT)=false`; frontend has merged one commit against `@safein5/contracts` | migrate runs clean on a fresh DB; CI green on a pushed branch |
| **M1** | W2–3 | Tenancy spine + anonymity, **as a QR journey** | 3 role-bound pools; `TenantContextInterceptor` + ALS + `runAsSystem`; `0010`–`0012`; `qr_resolve_token` fn; T1–T15 suite; partition-maintenance job; kysely-codegen + pg parsers + `strict:true` | disabling RLS on any table fails the suite; `42501` on cross-tenant write, unaffected by `bypass_rls`; a printed sticker resolves against staging; T13 fails 60 days before a `_default` partition would take writes | **phone scans `HJ7K3M9PQR2X` → Brackley North Quarry / Lifting Zone 3 / Spreader Beam SB-14** |
| **M2** | W4–6 | Identity, guest, PULSE, Rescue Plan, Learn5, consent, outbox, staging | OTP/magic-link + JWT(`atk`); guest sessions; PULSE lifecycle; offline Rescue Plan; Learn5 read; `consent_record`; `OutboxWriter` + flusher; staging from IaC | guest completes PULSE with no account; Rescue Plan renders from cache in airplane mode after one visit; a domain write + its outbox event commit/roll back together (forced-failure test); staging deploys from CI, not by hand | guest phone: scan → PULSE → one-tap Rescue Plan → back, no lost step |
| **M3** | W7–9 | Capture under field conditions | signal draft/classify/finalise; **media rebuilt onto `signal_media`**; EXIF/derivatives worker; transcription port | p95 capture <60s and classification <10s on a named mid-range Android at a named 3G profile, read from `capture_latency_ms`; a signal finalises with only a photo / only a voice note / only text; app kill mid-upload → resume, no duplicate; anonymous raw API response contains no resolvable author field | timed gloved capture on a throttled device, p95 read off the DB column |
| **M4** | W10–12 | Feed, supervisor loop, community, **production** | feed + read-state + search; Acknowledge/Close via config-as-data; moderation soft-hide; `escalation_record`; Community public write path + `signal_media` community policy; production stood up from IaC (backup taken, restore tested, min-instances ≥1) | same feed query twice = identical order; unread Good Practice outranks read Needs-Attention-Now; Acknowledge refused **by the API** for an unassigned supervisor; `open→closed` returns 409; a media-bearing Community signal renders a thumbnail unauthenticated; closure visible to guests with no author-keyed notification route | worker A captures NAN → supervisor B acknowledges + closes → anonymous A sees the closure banner |
| **M5** | W13–14 | GDPR, governance, UAT, cutover | Art.15 export (by token) + Art.17 erasure + restore-reconciliation; retention purge; audit redaction gate; pen-test window; UAT | erasure removes the person, retains the signal, leaves dashboard counts unchanged; export of a named worker returns **zero** anonymous-authored signals; partitions exist through ≥ 2027-03; zero P1/P2 open | GDPR export/erase demonstrated end-to-end on real data; cutover is a promotion |

### 7.1 Explicitly cut from MVP (and why)
- **Full self-service admin console (~43 ADM MUST rows) → seed script.** For a 3-org / 9-site / ~30-QR pilot I provision organisations/sites/sub-sites/users/QR contexts by extending `0008`. I build **only** the moderation soft-hide and the supervisor Acknowledge/Close (both in the PWA). Full CRUD screens → Phase 2. *Rationale: 9–11 dev-days of screens cannot survive a single week alongside UAT; the cut ladder is pre-agreed so a slip drops screens, never QR management — a mispointed sticker at a live quarry must be fixable same-day.*
- **Video → Phase 2**, via the `CQA-007` phase-column ambiguity ("MUST" in text, "Phase 2" in its own phase column). Photo + voice + text only. Saves 3–5 dev-days (ffmpeg, HEVC/HEIC normalisation, poster frames) and cross-device UAT risk. If the client insists: 30s server-verified cap + placeholder poster + a **priced change request**.
- **Community open registration → invite-only pilot.** Preserves the "Community vs Corporate Use" MUST metric (the architecture is demonstrated) and removes the Online Safety Act, unblurred-faces, and unfunded-moderator exposure. `tenant.allow_guest_submission` already defaults closed.
- **Learn5 / Rescue Plan / PULSE-prompt authoring UI → seed script + admin API only.**
- **The full Dev Pack §7 five-state workflow → config-disabled.** Seeded in `workflow_state_def`/`workflow_transition_def` with the extra states/edges disabled; Phase 2 is an `UPDATE`, not a migration.
- **`evidence` table ships (schema-ready), UI does not.**

---

## 8. Week 1 — day by day

**Mon AM (first 30 min, before anything else):** `git add` the schema. Verified today: `git ls-files docs` = 0 — ~5,940 lines defining 38 tables, 44 policies, 4 roles exist only untracked, in two undiffed copies. Then `git mv docs/db/migrations db/migrations`, byte-diff and delete the out-of-repo copy at `safeIn/db/migrations`, push to remote, and correct the two path snippets in `docs/db/SafeIn5-Schema-Implementation-Guide.md §1`.

**Mon (rest):** `git rm` the ad-hoc set (`src/database/migrations/*.sql`, `src/seedData.sql`), the dead `AppController/AppService` + their specs, `test/app.e2e-spec.ts`, and the two red qrcode specs. Remove `kafkajs`, `@nestjs/microservices`, `sharp`, `@nestjs/mapped-types`, `@types/express`. Write `docker-compose.yml` (Postgres 16 + MinIO) and `.env.example` mirroring `env.schema.ts` (incl. the four role passwords + KMS pepper ref). Add the out-of-band `ALTER ROLE … LOGIN PASSWORD` bootstrap (migrations create roles `NOLOGIN`).

**Tue:** Run `0001–0007` by hand with `psql -v ON_ERROR_STOP=1 --single-transaction` until **both** backstop NOTICEs print (this is the 2–3 day first-run hardening, started). Wire `db/migrate.ts` (Kysely Migrator, `sql.raw` per file, tracking table); add `db:migrate`, `db:seed:demo` (0008 excluded, NODE_ENV-guarded), `db:reset`.

**Wed:** Write **`0009_fix_app_grants.sql`** (F-1 two-part fix) with the `has_column_privilege` assertions. Stand up `@safein5/contracts` (write `enums.ts` mirrored from the DB CHECKs first; then the nine worker-critical endpoint schemas), generate + commit `openapi.json`, boot Prism on :4010 with examples extracted from the seeded DB. **Send both frontend leads the mock URL, `openapi.json`, package name, and the versioned change-note rule — the unblock lands on Wednesday.**

**Thu:** Rewrite `src/main.ts`: `setGlobalPrefix('api')`, URI versioning v1, `enableCors`, `@fastify/helmet`, explicit `bodyLimit`, `ZodValidationPipe`, `AllExceptionsFilter` (SQLSTATE map + AWS/pg sanitisation), `enableShutdownHooks()`, awaited bootstrap with `unhandledRejection`/`uncaughtException` handlers. Add `/healthz` + `/readyz` via `@nestjs/terminus`. Fix `configuration.ts` to consume `EnvSchema.parse()` output (single config source). Wire kysely-codegen + pg type parsers; delete the hand-written `database.types.ts`; turn on `strict:true`.

**Fri:** Write the three role-bound tuned pools + the `TenantContextInterceptor` + ALS + `runAsSystem` + the `no-restricted-properties` lint ban. Transcribe **T1, T2, T3** (with the two-tenant fixture) and get them green as `safein5_app`. Push `.github/workflows/ci.yml` (lint `--max-warnings 0`, `no-floating-promises: error`, typecheck, unit, Testcontainers + RLS suite, backstop-notice grep, contract-drift check). **Send the decision memo (§9/§10)** with the anonymity change-note first, and formally request the cloud account with billing/EU region/delegated admin dated for the last day of W3.

---

## 9. Decisions I am taking now (as backend owner)

| Decision | My call | Rationale | Confirm with | By |
|---|---|---|---|---|
| Schema source of truth | Adopt authoritative `0001–0008` wholesale; delete ad-hoc | No production data; the `0007` backstop cannot coexist with the flat tables | — | W1 |
| Migration tool | Kysely Migrator; exclude 0008; forward-only; snapshot-before-migrate | Reuses a dependency; gives a tracking table; ORM DDL cannot express FORCE RLS/partitions/column grants | — | W1 |
| **F-1 fix shape** | Two-part: column-omit `SELECT(author_token)` on `behaviour_signal`/`pulse_session`, keep `INSERT`; aggregates via identity pool; rate limit via `rate_limit_counter` | Naive column-drop breaks the primary metric + rate limiter | Security reviewer | W1 |
| QR resolve mechanism | `SECURITY DEFINER` fn setting `bypass_rls` locally, content-free columns only, then phase-2 tenant-scoped | Owner-owned definer alone fails under FORCE+NOBYPASSRLS | — | W2 |
| Config-as-data | Read `*_def.enabled`, `triggers_workflow`, `allow_guest_submission`, `retention_policy` — never hardcode | Turns ~15 Discovery items into `UPDATE`s | — | W1 |
| Contract cadence | Publish `v0.x` W1; versioned change-note; CI drift check; **no hard freeze at W3** | Freezing ~40 shapes before media/RLS run once locks in guesses | Frontend leads | W1 |
| Secrets/creds | Default AWS provider chain (IAM roles); asymmetric JWT with `kid`; pepper never-rotate + break-glass; all secrets from a manager | Static keys + symmetric secret are total-compromise vectors | DevOps | W2 |
| Data residency | `AWS_REGION` required (no default), pinned EU (eu-west-2 for UK pilot); sub-processor register; drop Clarity on capture path | Current default `us-east-1` ships PII to the wrong continent | Counsel | W2 |
| Rate limiting | Edge/WAF on IP + durable Postgres `rate_limit_counter` on `author_token`; no in-process LRU | LRU fails multi-instance; hashed IP unusable for counting | — | W3 |
| Metrics surface | On-read aggregation per Join Cookbook; delete the `metrics_daily` projector concept; add `idx_behaviour_signal_insight` | `metrics_daily` is a phantom table (verified: 0 hits) | Analytics owner | W3 |
| Partition maintenance | Build the job **W1–2**, migrator creds, ≥3 months headroom, all 7 statements/partition, alert on `_default` | Runway expires 2026-12; failure is a silent cross-tenant hole then an outage | DevOps | W2 |

---

## 10. Blockers I must escalate

| Blocker | Pragmatic default I proceed on | Urgency |
|---|---|---|
| **Anonymity mechanism** — literal DB-strip (Dev Pack §7) vs pseudonym (schema) | Pseudonymous `author_token`, with a **written change-note** superseding §7 and honest disclosure copy to pilot workers | **Week 1** — a write-time property; every signal captured before it is settled cannot be pseudonymised retroactively |
| **Cloud account + EU region + KMS pepper** | Develop against docker-compose + LocalStack so migration is a re-apply; log late provisioning as client-caused day-for-day slip | **Week 1** — gates all of M2 |
| **Second engineer / honest 14-week scope** | Single owner delivers only the spine (tenancy + anonymity + <60s capture + feed + Ack/Close); rest needs eng #2 | **Week 1 (Discovery)** |
| Guest read boundary for the **corporate** feed | Restrictive: PULSE/Rescue/Learn5 open; corporate feed requires an authenticated site-assigned user at RLS; resolve returns no signal content to anonymous callers — signed by each pilot org | Week 2 — it is an RLS predicate |
| Supervisor workflow scope (5-state vs Ack+Close) | Ack+Close via config-disabled tables; minute the reduction (largest contractual exposure) | Week 3–4 |
| STT provider/region/DPA (and whether it counts as "AI") | On-device transcript, raw audio **discarded**, behind a `TranscriptionPort`; EU-region cloud fallback under a no-training DPA; never blocks submit | Week 6 |
| Video in/out | **Phase 2** (CQA-007 phase-column ambiguity); 30s server-verified + placeholder + priced CR if insisted | Week 3 |
| Community moderation staffing / open vs invite-only | Invite-only pilot | Week 8 |
| Retention numbers (exist nowhere) | Config defaults (signals 730d, media 365d, audit 2555d, raw audio purged post-transcription, drafts 24h) | Week 3 for the model; values ratifiable by W13 |
| Consent lawful basis (Register #28) | Legitimate-interest Corporate / consent Community | Week 1–2 |
| Response-time SLA / pen-test funding | Provisional "same-shift" ack expectation as tenant config; pen test client-funded between M5 and go-live | Week 6 |

---

## 11. Engineering standards

- **Testing.** Testcontainers Postgres built from `0001–0012` on every commit; the T1–T15 isolation suite merge-blocking; every fixture seeds **two tenants**; a test DB client that throws when `app.tenant_id` is unset (turns "the test returned `[]`" into "`NoTenantContext`"); the media state machine fully covered (idempotent complete, aborted→complete 410, PART_MISMATCH, `NoSuchUpload` on ListParts, abort idempotency, pagination); real `coverageThreshold` in CI (not `collectCoverageFrom: **/*` which is meaningless). Test infrastructure is a **named 6–8 dev-day deliverable** in M1, not an assumption.
- **CI/CD.** GitHub Actions: lint (`--max-warnings 0`, `no-floating-promises: error`), typecheck, unit, integration + RLS suite, `dependency-cruiser` boundary check, contract-drift check, SAST + dependency scan, coverage gate, build + push image, deploy to staging on merge (95% staging availability SLA). Two production alarms wired at interceptor time: the **`42501` rate** (forgotten GUC on a write path — loud) and the **empty-feed-response ratio** (forgotten GUC on a read path — silent, otherwise indistinguishable from a dozen ordinary bugs for days).
- **Observability.** Pino structured logs with `requestId` correlated into **service** logs (inject `PinoLogger`, not `@nestjs/common` `Logger` — its second string arg is the *context*, which is why nine upload call sites currently log inverted); Prometheus `/metrics`; Sentry with bodies/headers/cookies/tokens/media-URLs scrubbed and `atk`/`author_token`/`req.query.token` added to the redact allowlist; **no string-interpolated PII in any log** (lint rule); delete the `console.log` in `qrcode.service.ts:48`.
- **Security baseline.** CORS allowlist, helmet, explicit body limit, throttler; UUID validation on every `:id`; SSE-KMS on all objects; Block Public Access + object versioning on the media bucket; RPO 24h / RTO 4h with a **rehearsed** restore before go-live; a minimal incident-response runbook (cross-tenant leak, credential compromise, erasure failure) with a named on-call owner.
- **Code review & DoD.** With no second reviewer for solo stretches, **CI is the reviewer**. I honour the DevX AI-Pods artifact chain: each module emits a `specifications/NNN-<module>.md` traceable to the upstream TECHNICAL PRD/Architecture, tracked in `progress.md`, with merges routed through the org's PR-review MCP (`pr-review_get_pr_review_instructions` / `PR_review_nodejs_agent`) rather than an invented CI-only gate. **Definition of Done:** unit + integration green; one Playwright/e2e per journey; RLS suite green; contract-drift check green; performance budget met where applicable; deployed + smoke-tested on staging; `specifications/` and `progress.md` updated.

---

## 12. Risk register

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| **F-1 de-anonymisation ships** | Anonymity promise structurally broken; pilot-ending / ICO exposure | High if unfixed (3 of 4 competing plans missed it) | Two-part `0009` fix + CI assertions, **Week 1** | Backend owner |
| **14-week solo scope is fantasy** | Silent slip into Phase 2 by accident; compression lands on compliance tail | High | State the honest spine-only solo envelope at Discovery; staff eng #2 by W2; pre-agreed cut ladder | Delivery lead |
| **Cloud account late** | M2 stalls; production stand-up compresses into UAT | Medium (client-owned, no date) | Dev against LocalStack; day-for-day slip logged; escalated W1 | SafeIn5 |
| **Schema first-run debugging under-billed** | Week 1 overrun | Medium (never executed) | 2–3 day hardening budgeted; iterate to green before app code | Backend owner |
| **Media rework under-estimated as a "port"** | M3 overrun | High | Budgeted at **8–12 dev-days** (schema + verify/encrypt/signed-GET + EXIF worker), not 3–4 | Backend owner |
| **Unauthenticated QR-resolve unimplementable / RLS-off convention** | Primary entry point broken or a cross-tenant hole | Medium | `SECURITY DEFINER` content-free fn with its own isolation test; `bypass_rls` banned on API pool | Backend owner |
| **Open presigned-PUT + client-declared limits** | Bucket-write DoS; 30s/200MB bypassed | High (current code) | Auth + tenant/owner + `HeadObject` verification + SSE-KMS + edge rate limit | Backend owner |
| **Public media URLs / no entitlement on signed GET** | Worker footage of a named client world-readable (GDPR) | High (current default) | Private bucket + short-TTL signed GET behind the feed entitlement check | Backend owner |
| **GDPR erasure vs append-only audit** | Unfulfillable erasure right; DPIA failure | Medium | Redaction allowlist as a merge gate + crypto-shredding; restore-reconciliation from audit | Backend owner + DPO |
| **Community feed silently empty / media-less** | Adoption tier delivers nothing | Medium (verified: `visibility` default `site`; no `signal_media` community policy) | Explicit `visibility='public'` write path + `signal_media` community policy in `0012`, with tests | Backend owner |
| **Partition runway expires (2026-12)** | Silent cross-tenant read hole, then ACCESS-EXCLUSIVE outage | Medium | Build the maintenance job **W1–2**, migrator creds, ≥3 months headroom, alert on `_default` | DevOps |
| **Data residency / sub-processors default US** | Personal data + voice off-region | Medium | `AWS_REGION` required + pinned EU; sub-processor register; STT no-training DPA; drop Clarity on capture path | Counsel + DevOps |
| **Client decisions on client's calendar** | Front slides; compression on the tail | Medium (pack flags decision-maker availability) | Config-as-data removes ~15; force the 2–3 schema decisions W1 with written defaults + reversal costs; 1-week front buffer | Delivery lead |
| **Repeat-usage metric un-instrumented / phantom `metrics_daily`** | Primary success measure unmeasurable; events unbackfillable | Medium | On-read aggregation + `idx_behaviour_signal_insight`; emit success-metric events from the first capture build | Backend owner |
| **Missing MUST entities (consent/escalation/audience/report)** | Statutory + adoption features unbuildable | High (verified absent) | `0012` adds all four + policies; wired into onboarding/export/audit/feed | Backend owner |

---

## Appendix A — full table inventory (authoritative schema + my additions)

**Tenancy & hierarchy (0001):** `tenant` (RLS anchor + org profile) · `site` · `sub_site` (single-level nesting) · `asset` (the flagship `GROUP BY asset_id` insight depends on it) · `role` (5 seeded roles, flat permission arrays).

**Identity & anonymity (0002):** `app_user` (global, not tenant-scoped) · `user_tenant_membership` (the anonymity keystone; the only `author_token`→user mapping) · `user_site_assignment` (many-to-many) · `guest_session` (own `author_token`; `promoted_user_id`) · `auth_token` (hashed, single-use, not RLS-scoped) · `tenant_secret` (per-tenant salt; identity-only).

**Context & QR (0003):** `task_type` · `risk_type` (global seeded vocabularies) · `qr_context` (re-pointable) · `qr_code` (Crockford token; never 404) · `qr_scan_event` (append-only, `author_token` only) · `context_binding` (8h cache) · `pulse_template` (nullable-tenant globals).

**Learning (0004):** `learn5_item` (nullable-tenant globals) · `learn5_binding` (six-arm join) · `learn5_view` (engagement metric, token-only) · `rescue_plan` (structured, offline-cacheable).

**Signal core (0005):** `classification` (3 seeded tiers) · `pulse_session` · `behaviour_signal` (the core object; draft/final one row) · `signal_media` (row before object) · `signal_classification_event` (append-only disagreement log) · `signal_read_state` (token-keyed, no user column).

**Workflow & ops (0006):** `workflow_state_def` · `workflow_transition_def` (config-as-data machine) · `review_task` (≤1 per signal) · `workflow_transition` (append-only) · `evidence` (schema-only at MVP) · `moderation_action` (polymorphic, `previous_value`) · `audit_log` (append-only, monthly-partitioned) · `device_subscription` · `notification` (`dedupe_key`) · `outbox_event` (append-only, monthly-partitioned; the SIGNAL corpus). Partitions: `audit_log_2026_07..12` + `_default`; `outbox_event_2026_07..12` + `_default`.

**My additions:**
- `0012`: `consent_record` (GDPR, MUST) · `escalation_record` (Community, MUST) · `content_report` (report-count queue) · `rate_limit_counter` (durable per-account limiting) · `audience` column on `user_tenant_membership` + denormalised on `behaviour_signal` · `idx_behaviour_signal_insight` + `finalised_at` index + denormalised `severity_ordinal` + `idx_behaviour_signal_feed_order` · `pol_community_public_read` on `signal_media`.
- `0010`: `signal_media.s3_upload_id`, `part_size`, `part_count` + `uq_signal_media_s3_upload_id`.
- `0009`: F-1 grant fix. `0011`: `qr_resolve_token()` SECURITY DEFINER.

---

## Appendix B — full endpoint inventory

| Module | Method · Path | Auth | Milestone |
|---|---|---|---|
| Identity | `POST /v1/auth/otp/request`, `/verify` | public | M2 |
| Identity | `POST /v1/auth/magic-link` | public | M2 |
| Identity | `POST /v1/auth/guest`, `/guest/promote` | public / guest | M2 |
| Identity | `POST /v1/admin/auth/login`, `/forgot` | public | M2 |
| Identity | `GET/PATCH /v1/me`; `GET /v1/me/export`; `POST /v1/me/erasure` | JWT | M2 / M5 |
| QR/Context | `GET /v1/q/:token` | **public (2-phase)** | M1 |
| QR/Context | `POST /v1/context/bind`; `GET /v1/context/current` | JWT/guest | M2 |
| PULSE | `GET /v1/pulse/templates/resolve` | JWT/guest | M2 |
| PULSE | `POST /v1/pulse-sessions`; `PATCH /v1/pulse-sessions/:id`; `POST /v1/pulse-sessions/:id/complete` | JWT/guest | M2 |
| Rescue/Learn5 | `GET /v1/rescue-plans/resolve`, `/:id` | public | M2 |
| Rescue/Learn5 | `GET /v1/learn5`, `/:id`; `POST /v1/learn5/:id/view`, `/complete` | JWT/guest | M2 |
| Consent | `POST /v1/consent` | JWT/guest | M2 |
| Signal | `POST /v1/signals/draft`; `PATCH /v1/signals/:id`; `POST /v1/signals/:id/classify`, `/finalise` | JWT (guest per flag) | M3 |
| Signal | `GET /v1/signals/:id`, `/v1/signals/mine` | JWT | M3 |
| Media | `POST /v1/signals/:id/media/presign`; `POST /v1/media/:id/complete`, `/presign-retry`; `GET /v1/uploads/:id/parts`; `POST /v1/uploads/complete`, `/abort` | JWT (author) | M3 |
| Media | `GET /v1/media/:id/url` (signed GET, entitlement-checked) | JWT/guest-entitled | M3 |
| Feed | `GET /v1/feed`, `/feed/unseen-count`; `POST /v1/feed/read`; `GET /v1/search` | JWT (corporate) / public (community) | M4 |
| Community | `GET /v1/feed/community` | public | M4 |
| Community | `POST /v1/signals/:id/report`; `POST /v1/admin/signals/:id/escalate` | JWT / admin | M4 |
| Workflow | `POST /v1/review-tasks/:id/acknowledge`, `/close`; `GET /v1/supervisor/needs-response`, `/latest` | supervisor (site-scoped) | M4 |
| Moderation | `POST /v1/admin/signals/:id/hide`, `/unhide`; `PATCH /v1/admin/signals/:id` | admin/moderator | M4 |
| Notifications | `POST /v1/push/subscribe`; `GET /v1/notifications`; `POST /v1/notifications/:id/read` | JWT | M4 |
| Admin (thin/seed-first) | `GET/POST/PATCH/DELETE /v1/admin/{organisations,sites,sub-sites,users,qr-contexts,learn5,rescue-plans}`; `POST /v1/admin/users/:id/invite` | admin (`runAsSystem`, audited) | M4/M5 (seed for pilot) |
| Analytics | `GET /v1/admin/analytics/summary`, `/engagement`; `GET /v1/admin/analytics/export.csv` | admin | M4/M5 |
| GDPR | `POST /v1/admin/dsr/:userId/export`, `/erase`; `GET /v1/admin/audit` | platform admin (identity pool) | M5 |
| Ops | `GET /healthz`, `/readyz`, `/metrics` | internal | M0 |

> Every table and endpoint name above is drawn from the authoritative schema and the architecture/endpoint inventories in `docs/`, except the four new tables and their endpoints introduced in `0012` (consent, escalation, report, rate-limit), which I flag as additions in §6 and Appendix A.
