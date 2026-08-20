# SafeIn5 — SCHEMA IMPLEMENTATION GUIDE

Source files (all absolute paths):

- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0001_foundation.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0002_identity.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0003_context_qr.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0004_learning.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0005_signal.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0006_workflow_ops.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0007_rls_roles.sql`
- `C:\Users\YaswanthK\Desktop\safeIn\db\migrations\0008_seed_demo.sql`

Target: PostgreSQL 16. Extensions permitted: `pgcrypto`, `citext` only.

Where I state something the SQL does not itself define (event payload shapes, the `media_state` derivation rule, the interceptor code), I flag it as **convention** — it is a contract the application must implement, not something the database enforces.

---

## 1. How to run the migrations

### What each file does

| File | One line |
|---|---|
| `0001_foundation.sql` | Extensions, `set_updated_at()`, `tenant` (RLS anchor, and the organisation profile — `industry_code`, `country_code`), `role` (5 seeded roles), `site`, `sub_site`, `asset`; seeds the Community tenant; enables RLS on the three tenant-scoped tables. |
| `0002_identity.sql` | `app_user` (global, no RLS), `user_tenant_membership` (holds `author_token` — the anonymity keystone), `user_site_assignment`, `guest_session`, `auth_token` (pre-tenant, no RLS), `tenant_secret` (per-tenant salt). |
| `0003_context_qr.sql` | `task_type` / `risk_type` global vocabularies, `pulse_template`, `qr_context`, `qr_code` (the physical sticker), `qr_scan_event`, `context_binding` (one live binding per actor, 8h TTL). |
| `0004_learning.sql` | `learn5_item`, `learn5_binding`, `learn5_view`, `rescue_plan`; adds the `rescue_plan` / `learn5_item` FKs back onto `qr_context`. |
| `0005_signal.sql` | `classification` (3 seeded tiers), `pulse_session`, `behaviour_signal` (the core object), `signal_media`, `signal_classification_event` (append-only), `signal_read_state`; the Community public-read policy. |
| `0006_workflow_ops.sql` | `workflow_state_def` + `workflow_transition_def` (state machine as config data), `review_task`, `workflow_transition`, `evidence`, `moderation_action`, `audit_log` (partitioned), `device_subscription`, `notification`, `outbox_event` (partitioned). |
| `0007_rls_roles.sql` | Creates the four DB roles, **all** grants (nothing is granted in 0001–0006), the column-restricted grants on `app_user` / `user_tenant_membership`, plus two deploy-time backstops (RLS coverage, no-DELETE). |
| `0008_seed_demo.sql` | Demo data for the Brackley Aggregates "spreader beam" scenario. **Demo/pilot environments only — production stops after 0007.** |

### Exact commands

Run every file as the **owner** role (`safein5_migrator`), in numeric order, with `ON_ERROR_STOP` on. The files are not individually idempotent (except the role-creation `DO` block in 0007) — they are run once, in order, against a clean schema.

Bash / Git Bash:

```bash
export PGHOST=localhost PGPORT=5432 PGDATABASE=safein5 PGUSER=safein5_migrator
DIR="C:/Users/YaswanthK/Desktop/safeIn/db/migrations"

for f in 0001_foundation 0002_identity 0003_context_qr 0004_learning \
         0005_signal 0006_workflow_ops 0007_rls_roles; do
  echo "== $f"
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$DIR/$f.sql" || exit 1
done

# demo/pilot environments ONLY
psql -v ON_ERROR_STOP=1 --single-transaction -f "$DIR/0008_seed_demo.sql"
```

PowerShell:

```powershell
$env:PGHOST='localhost'; $env:PGDATABASE='safein5'; $env:PGUSER='safein5_migrator'
$dir = 'C:\Users\YaswanthK\Desktop\safeIn\db\migrations'
foreach ($f in '0001_foundation','0002_identity','0003_context_qr','0004_learning',
                '0005_signal','0006_workflow_ops','0007_rls_roles') {
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$dir\$f.sql"
  if (-not $?) { throw "migration $f failed" }
}
```

Two things to watch on the run:

- **`--single-transaction` is safe here.** 0001 deliberately seeds `role` and `tenant` *before* the `ALTER TABLE ... FORCE ROW LEVEL SECURITY` statements precisely so the seed does not depend on a GUC being set, and so the file works whether or not the runner wraps it in a transaction (see the block comment at 0001 §9).
- **0007 will abort the deploy** if the RLS backstop or the no-DELETE backstop fails. That is intended. A `NOTICE: SafeIn5 RLS backstop passed` / `no-delete backstop passed` pair on stdout is the success signal — grep for them in CI.

Login credentials for the four roles are granted **out of band** by the deployment pipeline. The migrations create them `NOLOGIN NOBYPASSRLS`; no password ever appears in these files.

```sql
-- pipeline, not migration:
ALTER ROLE safein5_app      LOGIN PASSWORD :'app_pw';
ALTER ROLE safein5_identity LOGIN PASSWORD :'identity_pw';
ALTER ROLE safein5_worker   LOGIN PASSWORD :'worker_pw';
-- safein5_migrator gets LOGIN only for the duration of a deploy.
```

### Reset

Roles are cluster-level and are created idempotently, so a reset only needs to drop the schema:

```bash
psql -v ON_ERROR_STOP=1 -U safein5_migrator -d safein5 -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; \
   GRANT USAGE ON SCHEMA public TO safein5_app, safein5_identity, safein5_worker; \
   GRANT CREATE ON SCHEMA public TO safein5_migrator;"
# then re-run 0001..0007 (and 0008 locally)
```

Full nuke for local dev (fastest, and what CI should do per run):

```bash
dropdb --if-exists safein5_test && createdb -O safein5_migrator safein5_test
```

Note `DROP SCHEMA public CASCADE` also drops `audit_log_id_seq` and `outbox_event_id_seq` (they are `OWNED BY` the partitioned tables' columns), so ids restart at 1. That is fine — `outbox_event.event_id` (a UUID) is the idempotency key, not `id`.

---

## 2. The tenancy contract

### The shape of the hierarchy

**`tenant` → `site` → `sub_site`.** Three levels, not four. One tenant **is** one client organisation: the customer-facing organisation profile (`name`, `industry_code`, `country_code`) lives on the `tenant` row itself, which is why `org_admin` is the role that administers a *tenant*. There is no `organisation` table — `site` hangs directly off `tenant` via `site.tenant_id`, and `sub_site` off `site` via the composite `(site_id, tenant_id)` FK, depth-capped at 1.

That single-level collapse is what makes `tenant_id` the one and only isolation key: there is no intermediate scope a query could forget to filter on, and no second ownership column that could disagree with `tenant_id`.

### The mechanism, end to end

Every tenant-scoped table carries `tenant_id uuid NOT NULL` and has RLS both **ENABLED** and **FORCED**, with a policy of exactly this shape (verbatim from 0001, repeated on every table in 0002–0006):

```sql
CREATE POLICY pol_tenant_isolation_<table> ON <table>
    USING (
            current_setting('app.bypass_rls', true) = 'on'
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
            tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );
```

Three details carry the whole model:

1. **`USING` has a bypass, `WITH CHECK` does not.** The background worker can *read* across tenants (`app.bypass_rls = 'on'`, inside the audited `runAsSystem` helper). No code path anywhere — not the worker, not the migrator at runtime — can *write* a row into a tenant other than the one in `app.tenant_id`.
2. **`FORCE`** is set because the table owner (`safein5_migrator`) would otherwise bypass RLS implicitly. An accidental owner connection at runtime must not silently disable isolation.
3. **`current_setting(..., true)`** returns NULL (rather than erroring) when the GUC is unset, and `nullif(..., '')::uuid` turns an empty string into NULL. `tenant_id = NULL` is NULL, which is not TRUE, so **an unscoped connection sees zero rows**. Fail closed.

Three GUCs exist:

| GUC | Set by | Meaning |
|---|---|---|
| `app.tenant_id` | Request interceptor, per transaction | The tenant this transaction is scoped to. |
| `app.bypass_rls` | `runAsSystem` on the worker pool only | `'on'` widens `USING` across tenants. Never widens `WITH CHECK`. |
| `app.community_tenant_id` | Public/unauthenticated request path | Enables `pol_community_public_read` on `behaviour_signal`. Value: `00000000-0000-0000-0000-0000000000c0`. |

### JWT → GUC

The JWT carries the tenant and the pseudonym; the database never sees the JWT.

**Convention** (Architecture Sec 3.4): claims are `tid` (tenant id), `sub` (user id), `rol` (role code), `atk` (author_token), `mid` (membership id). The `atk` claim is why `safein5_app` never needs to read `user_tenant_membership.author_token` on the capture hot path — the token arrives with the request.

The exact calls at the top of every request transaction:

```sql
BEGIN;
SET LOCAL app.tenant_id = '<tid from JWT>';
-- public/community reads additionally:
SET LOCAL app.community_tenant_id = '00000000-0000-0000-0000-0000000000c0';
-- ... the request's queries ...
COMMIT;
```

`SET LOCAL` does not accept a bind parameter, so with a query builder use the function form, which does:

```sql
SELECT set_config('app.tenant_id', $1, true);   -- third arg true == LOCAL
```

Use `set_config(..., true)` from application code, always. Never string-interpolate a tenant id into a `SET LOCAL` statement — that is a SQL injection vector into your security boundary. Migration `0008_seed_demo.sql` uses exactly this form (`SELECT set_config('app.tenant_id', '...', true);` inside a `BEGIN`/`COMMIT`).

### Why `SET LOCAL`, never `SET`

`SET` is **session**-scoped. `SET LOCAL` (and `set_config(..., true)`) is **transaction**-scoped and is reverted at `COMMIT` or `ROLLBACK`.

With a connection pool, a session-scoped GUC outlives the request that set it. The failure is not theoretical and not graceful:

- Request A (tenant Alpha) runs `SET app.tenant_id = 'alpha'`, finishes, returns the connection to the pool.
- Request B (tenant Beta) is handed that same connection. If B's interceptor throws before it sets the GUC, or B is a code path that forgot to set it at all, **B executes against Alpha's data with Alpha's rows visible and writable**. RLS is satisfied. Nothing errors. This is the cross-tenant leak the whole schema exists to prevent, and three competing quarry operators share this database.

`SET LOCAL` makes that impossible: at `COMMIT` the value is gone, and a request that fails to set it sees zero rows instead of someone else's.

Two corollaries:

- **`SET LOCAL` outside an explicit transaction is a silent no-op** (with a `WARNING: SET LOCAL can only be used in transaction blocks`). Autocommit statements each form their own implicit transaction, so the GUC is set and reverted before your query runs. **Every tenant-scoped query must be inside an explicit `BEGIN`/`COMMIT`.** There is no "just one quick SELECT" path.
- Ordinary `pg_reset` / pool `DISCARD ALL` hygiene is a defence-in-depth measure, not the control. Do not rely on it.

### Connection pooling

- **PgBouncer in `transaction` pooling mode is the correct configuration** and it composes perfectly with `SET LOCAL`: the pooler hands the server connection back at transaction end, exactly when the GUC is discarded.
- **PgBouncer in `session` mode** works but wastes connections.
- **`statement` mode is forbidden** — it breaks multi-statement transactions, and every tenant-scoped operation here *is* a multi-statement transaction (`set_config` + the query).
- **Three separate pools, three separate roles.** `safein5_app` (large, the API), `safein5_identity` (small — this is the only role that may read `author_token`, `password_hash` and `tenant_secret`, and keeping the pool small is itself part of the control), `safein5_worker` (background jobs). Never share a pool across roles: a shared pool means a shared privilege surface.
- Node-side (`pg`): acquire the client, `BEGIN`, `set_config`, run, `COMMIT`/`ROLLBACK`, release — in a `try/finally`. Never `await` outside that block on a client you still hold.

### NestJS interceptor shape

**Convention** — this is the application half of the contract:

```ts
// tenant-context.interceptor.ts
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly pool: Pool, private readonly als: AsyncLocalStorage<Ctx>) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const claims = req.user;                       // populated by the JWT guard
    const tenantId = claims?.tid ?? req.resolvedTenantId; // QR resolve path sets the latter
    if (!tenantId) throw new ForbiddenException('no tenant context');

    return from(this.runScoped(tenantId, claims, () => firstValueFrom(next.handle())));
  }

  private async runScoped<T>(tenantId: string, claims: Claims, fn: () => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
      await client.query('SELECT set_config($1, $2, true)',
                         ['app.community_tenant_id', COMMUNITY_TENANT_ID]);
      const out = await this.als.run(
        { client, tenantId, authorToken: claims?.atk, membershipId: claims?.mid, role: claims?.rol },
        fn);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
}
```

Rules that make the interceptor load-bearing rather than decorative:

- **Repositories must take the client from `AsyncLocalStorage`, never from `pool.query()` directly.** A repository that reaches for the pool gets a *different* connection with no GUC set — which is the forgotten-`SET LOCAL` failure by another name. Ban `pool.query` outside the interceptor with a lint rule.
- **`runAsSystem` is the only place `app.bypass_rls` is ever set**, it is worker-pool only, and it writes an `audit_log` row for the crossing:

```ts
await client.query('BEGIN');
await client.query("SELECT set_config('app.bypass_rls','on',true)");
// ... cross-tenant read ...
await client.query('COMMIT');   // bypass evaporates here
```

### The failure mode, and how to detect it

**A forgotten `SET LOCAL` returns zero rows, not an error.** A worker's feed is empty. A supervisor's queue is empty. The signal "disappears" after submission. Every one of these reads as an application bug — a bad filter, a caching problem, a broken join — and it will be triaged as one for days. It is not a breach; it is the fail-closed behaviour working. But it is indistinguishable at the UI from a dozen ordinary bugs, and that is what makes it expensive.

The asymmetry to exploit:

- **Reads fail silently** — `SELECT` returns 0 rows.
- **Writes fail loudly** — an `INSERT` with no `app.tenant_id` violates `WITH CHECK` and raises `42501: new row violates row-level security policy for table "..."`.

So the write path already self-reports. Only the read path needs help.

How to detect it, in order of cheapness:

1. **A CI test that asserts the unscoped read is empty and the unscoped write errors** (§8, tests 2 and 4). This proves the fail-closed property still holds.
2. **A guard query at the top of every transaction.** After `set_config`, assert it took:
   ```sql
   DO $$ BEGIN
     IF nullif(current_setting('app.tenant_id', true), '') IS NULL THEN
       RAISE EXCEPTION 'SafeIn5: no tenant context on this connection'
         USING ERRCODE = '42501';
     END IF;
   END $$;
   ```
   One round trip per request buys you a loud error instead of a silent empty list. Worth it.
3. **A repository-level assertion in tests.** Wrap the test DB client so any query issued while `current_setting('app.tenant_id', true)` is NULL throws. This turns "the test returned []" into "the test threw NoTenantContext" — the difference between a two-day triage and a two-minute fix.
4. **Fixture design.** Every integration test fixture must contain rows for **two** tenants. A test that seeds one tenant passes identically whether RLS works, is disabled, or the GUC is unset — it proves nothing. With two tenants seeded, a correct query returns *some* rows and a forgotten GUC returns *zero*, so the assertion `expect(rows.length).toBeGreaterThan(0)` becomes a real RLS test for free, in every test you write.
5. **Production telemetry.** Alert on `42501` rate (a forgotten GUC on a write path) and on the ratio of empty-result feed responses. A step change in "feed returned 0 items" after a deploy is the read-path signature.

---

## 3. The anonymity contract

### Derivation

From `0002_identity.sql` §6 and the `user_tenant_membership.author_token` comment:

```
pepper       = 32-byte secret, KMS / Secrets Manager. NEVER in this database, never in git.
tenant_salt  = tenant_secret.author_token_salt -- 16 CSPRNG bytes, one row per tenant.

author_token = base32( HMAC-SHA256( pepper, tenant_salt || ':' || user_id )[0..19] )
             -- 20-byte slice -> 32 unpadded uppercase base32 characters
```

Constraint: `CHECK (author_token ~ '^[0-9A-Z]{32}$')` — deliberately permissive across uppercase alphanumerics rather than pinned to one base32 alphabet, so RFC4648 ↔ Crockford is a code change, not a CHECK migration.

Uniqueness: `uq_user_tenant_membership_tenant_author_token (tenant_id, author_token)` — unique **within** a tenant, deliberately **not** globally. Same person, different tenant, different pseudonym. That is what stops a corporate admin correlating a worker's Community posts with their on-site reports.

Properties this buys:

- **Deterministic** — same user + same tenant = same token forever, so repeat usage (the pilot's primary success measure) is countable across anonymous signals.
- **Per-tenant** — cross-tenant correlation is not merely forbidden, it is uncomputable without the pepper.
- **One-way** — there is no token → user_id computation.
- **Dump-resistant** — a stolen database contains the salt but not the pepper.

**Guests** (`guest_session.author_token`) carry the same shape but are **not derived** — they are 20 random bytes minted at session creation, base32-encoded. There is no user to derive from. This is why every activity table (`qr_scan_event`, `learn5_view`, `signal_read_state`) can key on `author_token` alone and needs no `user_id` column at all.

**Rotation.** `tenant_secret.salt_version` and `rotated_at` exist as an escape hatch after a suspected compromise. Bumping the version **forks every existing pseudonym in the tenant** and destroys repeat-usage continuity. Any migration that does it must explicitly decide what happens to existing signals. `pepper_key_ref` names *which* KMS key was used (never the pepper), so the pepper can rotate in KMS while historical tokens stay reproducible.

### The exact column-level grants

The single most misunderstood mechanic in the schema, spelled out in 0007 §6: **in PostgreSQL, column privileges are additive to table privileges.** A table-level `GRANT SELECT` followed by a column-level `REVOKE SELECT (col)` does **not** hide the column — the table grant already covers every column and the revoke has nothing to subtract. The only way to withhold a column is to never issue the table-level privilege and enumerate the permitted columns instead.

```sql
-- app_user: every column EXCEPT password_hash
GRANT SELECT (id, email, email_verified_at, display_name, default_anonymous,
              locale, status, erased_at, last_seen_at,
              created_at, updated_at, deleted_at) ON app_user TO safein5_app;
GRANT INSERT (id, email, email_verified_at, display_name, default_anonymous,
              locale, status, created_at)        ON app_user TO safein5_app;
GRANT UPDATE (email, email_verified_at, display_name, default_anonymous,
              locale, status, last_seen_at, updated_at, deleted_at)
                                                  ON app_user TO safein5_app;
REVOKE SELECT (password_hash) ON app_user FROM safein5_app;   -- tripwire, not the control

-- user_tenant_membership: every column EXCEPT author_token
GRANT SELECT (id, tenant_id, user_id, role_id, anonymous_override,
              invited_at, invited_by_membership_id, accepted_at,
              blocked_at, blocked_reason, blocked_by_membership_id,
              removed_at, status, created_at, updated_at, deleted_at)
    ON user_tenant_membership TO safein5_app;
GRANT UPDATE (role_id, anonymous_override, accepted_at,
              blocked_at, blocked_reason, blocked_by_membership_id,
              removed_at, status, updated_at, deleted_at)
    ON user_tenant_membership TO safein5_app;
REVOKE SELECT (author_token) ON user_tenant_membership FROM safein5_app;

REVOKE ALL ON tenant_secret FROM safein5_app, safein5_worker;
```

Note what is *absent*: `safein5_app` has **no INSERT at all** on `user_tenant_membership`. `author_token` is `NOT NULL` with no default, so withholding INSERT forces every membership to be created through the Identity module — the only component that can derive a token.

`safein5_worker` gets an even narrower slice (0007 §9):

```sql
REVOKE ALL ON tenant_secret          FROM safein5_worker;
REVOKE ALL ON user_tenant_membership FROM safein5_worker;
GRANT SELECT (id, tenant_id, user_id, role_id, status, blocked_at, deleted_at)
    ON user_tenant_membership TO safein5_worker;
```

### What each role can and cannot see

| | `author_token` mapping | `password_hash` | `tenant_secret` | Signal bodies | Audit / outbox | DELETE |
|---|---|---|---|---|---|---|
| `safein5_app` | **No** (gets it from the JWT `atk` claim) | **No** | **No** | Yes (tenant-scoped) | INSERT only | **None** |
| `safein5_identity` | **Yes** — the only role | **Yes** | **Yes** | SELECT + narrow UPDATE for GDPR redaction | INSERT only | `user_tenant_membership` only |
| `safein5_worker` | **No** — 7 non-sensitive columns only | **No** | **No** | SELECT + UPDATE (denormalisation) | SELECT + INSERT; UPDATE of 4 outbox delivery columns | **None** |
| `safein5_migrator` | (owner — not used at runtime) | | | | | |

The one deliberate `DELETE` in the entire schema:

```sql
GRANT UPDATE (author_user_id, is_anonymous, body_text, updated_at, deleted_at)
    ON behaviour_signal TO safein5_identity;
GRANT UPDATE (author_user_id, is_anonymous, updated_at, deleted_at)
    ON pulse_session TO safein5_identity;
GRANT DELETE ON user_tenant_membership TO safein5_identity;
```

That is GDPR Art.17 erasure: tombstone the `app_user` row (`status='erased'`, all identifiers NULL — enforced by `ck_app_user_erased_is_scrubbed`), redact any attributed signal bodies, then **DELETE the membership row**, which destroys the only stored token mapping. After that, every historical `author_token` for that person in that tenant is permanently unresolvable.

Anonymity is additionally a **database invariant**, not an application convention:

```sql
CONSTRAINT ck_behaviour_signal_anonymity CHECK (is_anonymous = false OR author_user_id IS NULL)
```

There is no way to store an anonymous signal that still carries a user id. Same constraint on `pulse_session`. And `ck_signal_media_exif_always_stripped CHECK (exif_stripped = true)` means there is no way to record a stored derivative that kept its GPS EXIF.

### The honest limits — what must be told to pilot workers

**This is pseudonymisation, not anonymisation.**

Under GDPR **Recital 26**, data is anonymous — and therefore outside the Regulation — only where the data subject is *no longer identifiable*, accounting for "all the means reasonably likely to be used" by the controller or any other person. Pseudonymised data, where the re-identification key still exists somewhere, remains **personal data** and remains fully in scope (Art. 4(5)).

For a live SafeIn5 tenant, the key **does** still exist: the `user_tenant_membership` row plus the KMS pepper. `safein5_identity` can resolve a token to a person. Therefore:

- A "Post anonymously" signal is **pseudonymous**, not anonymous, for as long as that membership row exists.
- It becomes genuinely anonymous only after erasure destroys the mapping — at which point the residual signal ceases to be personal data.
- Small-population re-identification is a real residual risk that no schema control removes. In a crew of six on a night shift, "anonymous report about the spreader beam in Lifting Zone 3 at 02:40" narrows to one or two people regardless of what the database stores. The schema mitigates the obvious vectors (geo rounded to ~110 m for anonymous captures; EXIF stripped unconditionally; IP and user-agent stored only as salted SHA-256) but it cannot mitigate context.

**Verbatim text for the pilot worker notice.** This must be shown before first capture, not buried in a privacy policy:

> **What "anonymous" means here, honestly.**
>
> When you post anonymously, your name is not attached to your report. Your supervisor, your site manager and your employer cannot see who wrote it. They see a code, not a person.
>
> But we are not going to tell you it is untraceable, because that would not be true. SafeIn5 holds a one-way code that links your reports together so we can tell that the same person came back, and a small number of SafeIn5 staff can technically reverse that link. We only do that in two situations: if we are legally required to, or if a report is being used to abuse or harass someone. It is recorded every time it happens.
>
> Your employer can never do it. There is no button, no export and no report anywhere in this product that turns an anonymous signal back into a name.
>
> One more thing we want you to know: if you describe something that only a couple of people were present for, someone reading it may well work out it was you, whatever the app says. That is not a flaw we can fix with software. Please bear it in mind when you write.
>
> If you ask us to delete your account, we destroy the link permanently. Your safety reports stay — they are useful to the people who work here after you — but from that point nobody, including us, can tell they were yours.

Do not soften this. The pilot's value depends on workers reporting things they would not report if they doubted the promise, and an overclaim discovered later destroys that permanently.

---

## 4. The signal lifecycle

`draft → classified → final`, plus terminal `discarded`. **Draft and final are the same row**, distinguished by `status` — splitting them into two tables would force a copy-and-delete on finalisation and break the `signal_media` FKs already attached during the draft phase.

Enforced at three layers: the `CHECK` constraint, the Signal facade's transition guard, and an optimistic `UPDATE ... WHERE status = $expected` on the wire.

### The constraints that shape the machine

```sql
ck_behaviour_signal_status                  CHECK (status IN ('draft','classified','final','discarded'))
ck_behaviour_signal_final_requires_finalised_at
                                            CHECK (status <> 'final' OR finalised_at IS NOT NULL)
ck_behaviour_signal_classified_requires_code
                                            CHECK (status NOT IN ('classified','final') OR classification_code IS NOT NULL)
ck_behaviour_signal_classified_at           CHECK (classification_code IS NULL OR classified_at IS NOT NULL)
```

**Zero mandatory fields at capture.** `body_text`, all media and `classification_code` are nullable, so a draft is insertable with `tenant_id + author_token + status` and the defaults alone.

### Step 1 — draft (`POST /v1/signals/draft`)

The client mints the `id` (UUIDv7) **on device, before the first network call**. The `gen_random_uuid()` default is a fallback for server/admin inserts only.

```sql
BEGIN;
SELECT set_config('app.tenant_id', $tenant, true);

INSERT INTO behaviour_signal (
    id, tenant_id, status, visibility,
    author_token, author_user_id, is_anonymous, guest_session_id,
    pulse_session_id, qr_code_id, entry_point,
    site_id, sub_site_id, asset_id, context_snapshot,
    task_type_code, risk_type_code,
    geo_lat, geo_lon, geo_accuracy_m, occurred_at)
VALUES ($id, $tenant, 'draft', $visibility,
        $atk, CASE WHEN $isAnon THEN NULL ELSE $userId END, $isAnon, $guestSessionId,
        $pulseSessionId, $qrCodeId, $entryPoint,
        $siteId, $subSiteId, $assetId, $contextSnapshot::jsonb,
        $taskTypeCode, $riskTypeCode,
        $geoLat, $geoLon, $geoAccuracyM, coalesce($occurredAt, now()))
ON CONFLICT (id) DO NOTHING
RETURNING id, status;

COMMIT;
```

Written at this step: identity/pseudonym, resolved context (both the FK columns *and* the immutable `context_snapshot` jsonb), geo, `occurred_at`. Not written: classification, `finalised_at`, `media_state` (stays `'none'`).

`is_anonymous` is **materialised at capture** from `user_tenant_membership.anonymous_override ?? app_user.default_anonymous`. It is deliberately not read live — the account setting may be flipped later, but the promise made at the moment of capture must be immutable.

`context_snapshot` is written once and **never updated**. A sub-site renamed six months later must not rewrite what the worker was standing in.

### Step 2 — classify (`POST /v1/signals/:id/classify`)

```sql
BEGIN;
SELECT set_config('app.tenant_id', $tenant, true);

UPDATE behaviour_signal
   SET status                    = 'classified',
       classification_code       = $code,
       classified_at             = now(),
       classification_latency_ms = $clientMeasuredMs
 WHERE id = $id
   AND status IN ('draft', 'classified')      -- idempotent re-classify allowed
   AND deleted_at IS NULL
RETURNING id, status, classification_code;
-- 0 rows => 409 Conflict. Never blind-UPDATE.

INSERT INTO signal_classification_event
    (tenant_id, signal_id, from_code, to_code, changed_by_role, changed_by_token, source)
VALUES ($tenant, $id, $previousCode, $code, $roleCode, $atk, 'worker');
-- ck_..._changed: from_code IS DISTINCT FROM to_code -- skip the insert if unchanged.

COMMIT;
```

`signal_classification_event` is append-only (INSERT-only grant). It exists because the **disagreement** between the worker who was standing there and the reviewer who was not is training data, and it is irrecoverable if only the final value is kept.

`classification_latency_ms` is client-measured (classification screen appearing → tile tapped) and is how the "<10s to classify" NFR is proven at UAT with production data rather than a stopwatch. It cannot be backfilled.

### Step 3 — finalise (`POST /v1/signals/:id/finalise`)

```sql
BEGIN;
SELECT set_config('app.tenant_id', $tenant, true);

UPDATE behaviour_signal
   SET status             = 'final',
       finalised_at       = now(),
       body_text          = coalesce($bodyText, body_text),
       body_source        = coalesce($bodySource, body_source),
       transcript_confidence = coalesce($confidence, transcript_confidence),
       capture_latency_ms = $captureLatencyMs,
       moderation_state   = CASE WHEN $isFirstEverFromToken THEN 'under_review'
                                 ELSE moderation_state END
 WHERE id = $id
   AND status = 'classified'                  -- the guard
   AND deleted_at IS NULL
RETURNING id, tenant_id, classification_code, author_token, site_id, sub_site_id,
          asset_id, task_type_code, risk_type_code, visibility, media_state;
-- 0 rows => 409. Already 'final' => return the existing row, 200 (idempotent).

INSERT INTO outbox_event (tenant_id, event_type, aggregate_type, aggregate_id, payload)
VALUES ($tenant, 'signal.finalised', 'behaviour_signal', $id, $payload::jsonb);

INSERT INTO audit_log (tenant_id, actor_type, actor_token, action, entity_type, entity_id, request_id)
VALUES ($tenant, 'user', $atk, 'signal.finalise', 'behaviour_signal', $id::text, $requestId);

COMMIT;   -- domain write + outbox row + audit row, one transaction
```

`search_vector` is a `GENERATED ALWAYS ... STORED` tsvector over `body_text` and updates itself. `capture_latency_ms` (first tap → finalise) is the single number the pilot is judged on.

Downstream, `WorkflowTaskCreator` consumes `signal.finalised`, checks `classification.triggers_workflow` (only `needs_attention_now` at MVP), and opens a `review_task`.

### `discarded` and the reaper

```sql
UPDATE behaviour_signal SET status = 'discarded'
 WHERE id = $id AND status IN ('draft','classified');
```

A nightly/hourly reaper discards drafts older than 24h, using `idx_behaviour_signal_stale_drafts (tenant_id, created_at) WHERE status IN ('draft','classified')`:

```sql
UPDATE behaviour_signal SET status = 'discarded'
 WHERE status IN ('draft','classified')
   AND created_at < now() - interval '24 hours';
```

Discarded rows are **not** deleted and **not** soft-deleted for rate-limiting purposes: `idx_behaviour_signal_author_token` is intentionally *not* partial on `deleted_at`, because rate limiting must see discarded rows or discarding becomes a spam bypass.

### Idempotency: client UUIDs and retried POSTs

The whole design assumes a flaky quarry 3G link where the client cannot tell "request lost" from "response lost".

| Call | Idempotency mechanism | Retry outcome |
|---|---|---|
| `POST /draft` | Client-minted UUIDv7 as PK + `ON CONFLICT (id) DO NOTHING` | Second POST is a no-op, returns 200 with the same row. |
| `POST /classify` | `WHERE status IN ('draft','classified')` + skip the event row when `from_code = to_code` | Re-classify to the same code: row unchanged, no duplicate event (blocked by `ck_signal_classification_event_changed` anyway). |
| `POST /finalise` | `WHERE status = 'classified'`; if 0 rows and the row is already `final`, return it | Second POST returns the finalised row, no second outbox event. |
| Media presign | Client-minted `signal_media.id` + `uq_signal_media_storage_key` | Second presign returns the same reserved row. |
| Outbox consumers | `outbox_event.event_id` | Duplicate delivery is a no-op at every consumer. |

**Get the finalise retry right.** Naive code does `UPDATE ... WHERE status='classified'`, sees 0 rows, and returns 409 — so the worker's phone shows "submission failed" for a signal that is already stored. Correct shape:

```sql
WITH upd AS (
  UPDATE behaviour_signal SET status='final', finalised_at=now(), ...
   WHERE id=$id AND status='classified' AND deleted_at IS NULL
  RETURNING *, true AS did_transition)
SELECT * FROM upd
UNION ALL
SELECT *, false FROM behaviour_signal
 WHERE id=$id AND status='final' AND NOT EXISTS (SELECT 1 FROM upd);
```

Emit the outbox event only when `did_transition` is true.

---

## 5. The media pipeline

Bytes **never traverse the API container**. The browser PUTs directly to S3 via a presigned URL, so the `signal_media` row is created before the object exists.

```
reserved -> uploading -> uploaded -> processing -> ready
                              \-> failed        \-> failed
   \-> orphaned (reconciler: reserved row with no object, or parent draft reaped)
```

`CHECK (state IN ('reserved','uploading','uploaded','processing','ready','failed','orphaned'))`

### Who drives each transition

| Transition | Driven by | What is written |
|---|---|---|
| → `reserved` | **API**, on `POST /v1/signals/:id/media` | Row created with client-minted `id`, `storage_key`, `kind`, plus `width`/`height`/`byte_size`/`checksum_sha256` **captured client-side before upload**. API returns the presigned PUT URL. |
| `reserved → uploading` | **Client**, on `PUT /v1/media/:id/started` (or optimistically by the API at presign) | `upload_started_at` |
| `uploading → uploaded` | **Client**, on `POST /v1/media/:id/complete` after the S3 PUT returns 200 | `upload_completed_at`; API verifies the client checksum against the stored object |
| `uploaded → processing` | **Worker**, when it picks the row up | — |
| `processing → ready` | **Worker** (sharp / ffmpeg) | `thumb_key`, `poster_key` (video), `processed_at`, `duration_ms`; EXIF stripped **unconditionally** |
| `→ failed` | **Worker**, after 3 attempts | `attempt_count`, `last_error` |
| `→ orphaned` | **Worker reconciler**, every 10 min | Reserved row with no S3 object after a HEAD, or parent draft was reaped |
| audio `transcript_state` | **Worker**, independently | `none → pending → ready|failed`; never blocks anything |

Grants match exactly: `safein5_app` has `SELECT, INSERT, UPDATE`; `safein5_worker` has `SELECT, UPDATE` (0007 §9, "media finaliser + reconciler"). Neither has DELETE.

`width` and `height` are captured **before** upload specifically so the feed can reserve a correctly proportioned skeleton tile while the object is still in flight — a mis-sized placeholder that reflows on load reads as broken.

### Presigned URL flow

```
client                          API                              S3
  |  POST /signals/:id/media  -->|
  |  {mediaId, kind, mime,       | INSERT signal_media (state='reserved',
  |   bytes, w, h, sha256}       |   storage_key = '{tenant}/{yyyy}/{mm}/{signalId}/{mediaId}.{ext}')
  |                              | presign PUT (short TTL, content-length + checksum bound)
  |<-- {uploadUrl, mediaId}      |
  |                                                                |
  |  PUT uploadUrl (bytes)  ------------------------------------->  |
  |<-- 200 -------------------------------------------------------  |
  |  POST /media/:id/complete -->|
  |                              | HEAD object, verify sha256/size
  |                              | UPDATE state='uploaded', upload_completed_at=now()
  |                              | recompute behaviour_signal.media_state
  |<-- 202 ----------------------|
```

The key is tenant-prefixed **by constraint**:

```sql
CONSTRAINT ck_signal_media_storage_key_tenant_prefixed
    CHECK (position(tenant_id::text in storage_key) > 0)
```

so retention and GDPR erasure can be executed as an S3 prefix operation, and a mis-keyed object is caught at write time. `uq_signal_media_storage_key` makes a re-presign for the same media id return the same row rather than creating a second one.

Video is capped at 30 s in the database (`ck_signal_media_video_duration`) as well as client-side, because the cap is what keeps the upload inside the 60-second end-to-end budget on a 3G link.

### Keeping `behaviour_signal.media_state` in sync

`media_state` is a **denormalisation** on the signal (`none | pending | partial | ready | failed`) so the feed can decide what to render — thumbnail, skeleton, or nothing — without a join or subquery. One index scan per feed page. The feed never waits for media and never hides a signal because its media is not ready.

The derivation rule is **convention** (the schema stores the value but does not compute it). Recompute it in the same transaction as any `signal_media` state change:

```sql
UPDATE behaviour_signal b
   SET media_state = m.derived
  FROM (
    SELECT signal_id,
           CASE
             WHEN count(*) = 0                                   THEN 'none'
             WHEN count(*) FILTER (WHERE state = 'ready') = count(*) FILTER (WHERE state <> 'orphaned')
                  AND count(*) FILTER (WHERE state = 'ready') > 0 THEN 'ready'
             WHEN count(*) FILTER (WHERE state = 'ready') > 0     THEN 'partial'
             WHEN count(*) FILTER (WHERE state IN ('reserved','uploading','uploaded','processing')) > 0
                                                                  THEN 'pending'
             WHEN count(*) FILTER (WHERE state = 'failed') > 0    THEN 'failed'
             ELSE 'none'
           END AS derived
      FROM signal_media
     WHERE signal_id = $signalId AND deleted_at IS NULL
     GROUP BY signal_id
  ) m
 WHERE b.id = m.signal_id
   AND b.media_state IS DISTINCT FROM m.derived;
```

Because it is a denormalisation it *will* drift — a worker crash between the `signal_media` UPDATE and the `behaviour_signal` UPDATE leaves it stale. Run the same recompute as a nightly reconciliation over signals whose `media_state <> 'ready'`; it is idempotent and the `IS DISTINCT FROM` guard makes the no-op case free.

A failed photo does **not** fail the signal. `attempt_count` feeds a 3-retry-then-`failed` policy, and the signal stays visible and `final` throughout, because the observation is the value and the photo is supporting evidence.

### Orphan reaping

Two sweeps, both driven by `idx_signal_media_pending_reconcile (created_at) WHERE state IN ('reserved','uploading','uploaded','processing')` — a partial index bounded by the in-flight set, not by table size.

**Reconciler, every 10 minutes:**

```sql
-- Candidates: in-flight for too long.
SELECT id, tenant_id, signal_id, state, storage_key, created_at
  FROM signal_media
 WHERE state IN ('reserved','uploading','uploaded','processing')
   AND created_at < now() - interval '30 minutes'
 ORDER BY created_at
 LIMIT 500;
```

For each: S3 `HEAD` the `storage_key`.

- Object exists and state is `reserved`/`uploading`/`uploaded` → the `/complete` call was lost. Promote to `uploaded` and let processing proceed. This closes the "upload succeeded but /complete never arrived" hole.
- Object absent and older than the presign TTL → `UPDATE signal_media SET state='orphaned', last_error='no object after reconcile' WHERE id = $id AND state = 'reserved'`.
- `processing` stuck past its budget → increment `attempt_count`; at 3, set `failed`.

**Reaped-parent sweep**, after the 24h draft reaper runs:

```sql
UPDATE signal_media m SET state = 'orphaned'
  FROM behaviour_signal b
 WHERE m.signal_id = b.id
   AND b.status = 'discarded'
   AND m.state IN ('reserved','uploading','uploaded','processing');
```

`orphaned` and `failed` rows are **retained** — nothing here has DELETE. The S3 object deletion is a separate, audited retention job driven by `tenant.retention_policy.media_days`, operating on the tenant-prefixed key space.

---

## 6. The outbox contract

`outbox_event` is described in its own migration as *the most valuable artefact the MVP produces*: it is both the transactional outbox and the training/analysis corpus for the future SIGNAL intelligence layer.

**Rows are never deleted after publishing during the pilot.** Publishing sets `published_at`; it removes nothing. The monthly partitioning is for index locality and future archival (detach + cold storage), **not** deletion. Do not point the audit retention job at this table.

### What writes an event

Every write path emits **in the same transaction as the domain write**. That is the entire point — if the domain write commits, the event exists; if it rolls back, so does the event. There is no dual-write window.

```sql
INSERT INTO outbox_event (tenant_id, event_type, aggregate_type, aggregate_id, payload)
VALUES ($tenant, 'signal.finalised', 'behaviour_signal', $signalId, $payload::jsonb);
```

`event_id` (UUID), `id` (sequence), `occurred_at`, `event_version` (default 1) all default. Grants: `INSERT` to `safein5_app`, `safein5_identity`, `safein5_worker`; `SELECT` to `safein5_worker`; and one narrow column UPDATE for the flusher:

```sql
GRANT UPDATE (published_at, attempt_count, last_error, next_attempt_at)
    ON outbox_event TO safein5_worker;
```

A bug in the worker therefore cannot rewrite `payload`, `event_type` or `tenant_id` — which would silently corrupt the corpus.

Two structural guards:

```sql
ck_outbox_event_type_format CHECK (event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
ck_outbox_event_payload_pseudonymous
    CHECK (NOT (payload ?| ARRAY['userId','user_id','email',
                                 'authorUserId','author_user_id',
                                 'displayName','display_name']))
```

The second is a **top-level-key tripwire**, not the real control — the serialiser allowlist is. It catches the common mistake in CI and in production. It will **not** catch a nested `{"actor":{"userId":...}}`, so do not treat a passing insert as proof of pseudonymisation.

### The polling query

The flusher uses `FOR UPDATE SKIP LOCKED` so N worker replicas can poll concurrently without contending or double-publishing:

```sql
BEGIN;
SELECT set_config('app.bypass_rls', 'on', true);   -- flusher crosses tenants (read only)

WITH claimed AS (
  SELECT id, occurred_at
    FROM outbox_event
   WHERE published_at IS NULL
     AND (next_attempt_at IS NULL OR next_attempt_at <= now())
   ORDER BY occurred_at, id
   LIMIT 100
   FOR UPDATE SKIP LOCKED
)
SELECT o.id, o.occurred_at, o.event_id, o.tenant_id,
       o.event_type, o.event_version, o.aggregate_type, o.aggregate_id, o.payload
  FROM outbox_event o
  JOIN claimed c ON c.id = o.id AND c.occurred_at = o.occurred_at
 ORDER BY o.occurred_at, o.id;

-- ... publish each ...

UPDATE outbox_event
   SET published_at = now(), attempt_count = attempt_count + 1, last_error = NULL
 WHERE (id, occurred_at) IN (...);          -- successes

UPDATE outbox_event
   SET attempt_count   = attempt_count + 1,
       last_error      = left($err, 2000),
       next_attempt_at = now() + (interval '30 seconds' * power(2, least(attempt_count, 8)))
 WHERE (id, occurred_at) IN (...);          -- failures: exponential backoff

COMMIT;
```

Points that matter:

- **`FOR UPDATE SKIP LOCKED`** is what makes horizontal scaling of the flusher safe. Locked rows are skipped, not waited on, so a slow publish in replica A does not stall replica B.
- **The `(id, occurred_at)` composite** is required everywhere — `occurred_at` is the partition key and the PK is `(id, occurred_at)`. A `WHERE id = $1` alone forces a scan of every partition.
- **Ordering is `(occurred_at, id)`**, as documented on the column.
- **The index is partial**: `idx_outbox_event_unpublished ON (next_attempt_at NULLS FIRST, occurred_at, id) WHERE published_at IS NULL`. It stays bounded by the pending backlog — a few hundred rows — even as the retained corpus grows to millions. `NULLS FIRST` puts never-attempted rows ahead of backed-off ones.
- **Truncate `last_error` before writing.** A provider stack-trace loop can otherwise dominate table size.
- `last_error = NULL` on success, so a row that recovered does not look permanently broken in the console.

### Idempotency via `event_id`

```sql
CONSTRAINT uq_outbox_event_event_id UNIQUE (event_id, occurred_at)
```

The partition key must be in the unique constraint, hence the composite. `event_id` is a random UUID, so this is uniqueness in practice as well as in intent.

**Every consumer must be idempotent on `event_id`.** At-least-once delivery is guaranteed; exactly-once is not. The two MVP patterns:

- **Consumers with a natural key** — `WorkflowTaskCreator` relies on `uq_review_task_signal UNIQUE (signal_id)`: a replayed `signal.finalised` hits the constraint and is a no-op.
- **Consumers without one** — `NotificationDispatcher` writes `notification.dedupe_key` (e.g. `signal_closed:<signalId>:<userId>`, `zone_alert:<subSiteId>:<yyyymmddhh>`), protected by `uq_notification_dedupe (tenant_id, channel, dedupe_key) WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL`. This is described in the migration as *the single most effective defence against notification storms* — and rightly: no amount of application-level guarding survives two worker processes running concurrently, and the first time a rule misfires and every phone in a quarry buzzes repeatedly, the pilot's trust in notifications is gone permanently.

`notification.outbox_event_id` records the causing event. It is deliberately **not** a foreign key — `outbox_event`'s only unique key is the composite `(event_id, occurred_at)`, and PostgreSQL cannot FK a single column against it. Join by value.

### The event taxonomy

The naming rule is enforced by CHECK: `<aggregate>.<past-tense-verb>`, both lowercase snake. The table below is the **MVP taxonomy** assembled from what the migrations state (`signal.finalised`, `review_task.closed`, `qr.scanned`, `user.invited` / `accepted` / `blocked` / `erased`) plus what the consumers and `notification.kind` values require. Payload shapes are **convention** — treat them as the contract to implement, and increment `event_version` rather than mutating a shape.

Every payload carries `authorToken`, **never** `userId`, `email` or a display name.

| `event_type` | `aggregate_type` | Emitted by | Consumers |
|---|---|---|---|
| `signal.drafted` | `behaviour_signal` | API, on draft insert | metrics projector |
| `signal.classified` | `behaviour_signal` | API, on classify | metrics projector |
| `signal.finalised` | `behaviour_signal` | API, on finalise | `WorkflowTaskCreator`, `NotificationDispatcher`, metrics |
| `signal.discarded` | `behaviour_signal` | API / draft reaper | metrics |
| `signal.reclassified` | `behaviour_signal` | API (admin, ADM-033) | audit, disagreement analysis |
| `media.ready` / `media.failed` | `signal_media` | worker | feed invalidation |
| `pulse.completed` / `pulse.abandoned` | `pulse_session` | API | metrics (completion rate) |
| `qr.scanned` | `qr_code` | API resolve path | scan-count rollup, metrics |
| `review_task.created` | `review_task` | `WorkflowTaskCreator` | notifications |
| `review_task.acknowledged` | `review_task` | API | `NotificationDispatcher` (`signal_acknowledged`) |
| `review_task.closed` | `review_task` | API | `NotificationDispatcher` (`signal_closed`) |
| `learn5.viewed` | `learn5_view` | API | metrics |
| `moderation.acted` | `moderation_action` | API | audit, feed invalidation |
| `user.invited` / `user.accepted` | `user_tenant_membership` | Identity | notifications (`invitation`), ADM-026 funnel |
| `user.blocked` / `user.erased` | `user_tenant_membership` | Identity | audit |

Example payloads:

```jsonc
// signal.finalised  (v1)
{
  "signalId": "b0000000-0000-0000-0000-000000000091",
  "authorToken": "K4M2P9XQ7R3T8VW5Y6Z1A0BC2DEF3GHJ",   // never a user id
  "isAnonymous": true,
  "classificationCode": "be_aware",
  "severityOrdinal": 2,
  "visibility": "site",
  "siteId": "b0000000-0000-0000-0000-000000000003",
  "subSiteId": "b0000000-0000-0000-0000-000000000004",
  "assetId": "b0000000-0000-0000-0000-000000000006",
  "taskTypeCode": "heavy_lift",
  "riskTypeCode": "suspended_load",
  "entryPoint": "qr",
  "mediaState": "pending",
  "captureLatencyMs": 41200,
  "classificationLatencyMs": 6100,
  "occurredAt": "2026-07-19T09:14:02.113Z",
  "finalisedAt": "2026-07-19T09:14:43.318Z"
}
```

```jsonc
// review_task.closed  (v1)
{
  "reviewTaskId": "b0000000-0000-0000-0000-0000000000b1",
  "signalId": "b0000000-0000-0000-0000-000000000094",
  "fromState": "acknowledged",
  "toState": "closed",
  "actorMembershipId": "b0000000-0000-0000-0000-000000000022",  // supervisors are attributable
  "actorRole": "supervisor",
  "closureNote": "Beam withdrawn pending LOLER re-inspection.",
  "notifyAuthorToken": "K4M2P9XQ7R3T8VW5Y6Z1A0BC2DEF3GHJ",       // who to tell, pseudonymously
  "firstResponseMs": 5400000,
  "timeToCloseMs": 86400000
}
```

```jsonc
// qr.scanned  (v1)
{
  "qrCodeId": "b0000000-0000-0000-0000-000000000072",
  "qrContextId": "b0000000-0000-0000-0000-000000000071",
  "token": "7K9MNP2QR4TV",
  "authorToken": "9ZB4C7D2E5F8G1H3J6K0M2N4P7Q9R1S3",   // guest tokens look identical
  "actorKind": "guest",
  "isFirstScanForToken": true,
  "entryPoint": "qr",
  "stickerSerial": "BRK-LZ3-014"
}
```

```jsonc
// user.invited  (v1)  -- note: NO email in the payload
{
  "membershipId": "b0000000-0000-0000-0000-000000000023",
  "authorToken": "3H6J0K2M4N7P9Q1R3S5T8V0W2X4Y6Z8A",
  "roleCode": "worker",
  "invitedByMembershipId": "b0000000-0000-0000-0000-000000000021",
  "invitedAt": "2026-07-15T08:00:00.000Z"
}
```

The email address lives only in `auth_token.email` and in the email itself. Putting it in a payload trips `ck_outbox_event_payload_pseudonymous` at the top level — and if you nest it, it silently poisons the corpus. That is the case the serialiser allowlist exists for.

The asymmetry in `review_task.closed` is deliberate and correct: **supervisors are attributable** (`actorMembershipId`), **authors are not** (`notifyAuthorToken`). The dispatcher resolves that token to a person through the Identity module only, so the identity appears on the `notification` row and never on the signal.

---

## 7. Partition maintenance

Both `audit_log` and `outbox_event` are `PARTITION BY RANGE (occurred_at)`, monthly, with partitions seeded **2026-07 through 2026-12** plus a `DEFAULT` partition each.

**Today is 2026-07-21. You have five months of runway. The job below must be running in production before October.**

### The exact monthly command

Run as the **owner** (`safein5_migrator`), from the retention/maintenance job, creating at least 3 months of headroom:

```sql
-- ===== audit_log, e.g. 2027-01 =====
CREATE TABLE audit_log_2027_01 PARTITION OF audit_log
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
ALTER TABLE audit_log_2027_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2027_01 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2027_01 ON audit_log_2027_01
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT INSERT ON audit_log_2027_01 TO safein5_app, safein5_worker, safein5_identity;
GRANT SELECT ON audit_log_2027_01 TO safein5_worker;

-- ===== outbox_event, same month =====
CREATE TABLE outbox_event_2027_01 PARTITION OF outbox_event
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
ALTER TABLE outbox_event_2027_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2027_01 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2027_01 ON outbox_event_2027_01
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT INSERT ON outbox_event_2027_01 TO safein5_app, safein5_worker, safein5_identity;
GRANT SELECT ON outbox_event_2027_01 TO safein5_worker;
GRANT UPDATE (published_at, attempt_count, last_error, next_attempt_at)
    ON outbox_event_2027_01 TO safein5_worker;
```

**Every one of those statements is required.** `CREATE TABLE ... PARTITION OF` inherits column defaults but inherits **neither RLS enable/force nor policies nor grants**. A partition created with the `CREATE TABLE` line alone is a table with no tenant isolation on it at all — and while access through the parent is still filtered by the parent's policies, anyone who queries `audit_log_2027_01` directly reads every tenant's audit trail. That is why the schema declares policies on the parent **and** on every partition.

**Locking caution.** Creating a new range partition takes an `ACCESS EXCLUSIVE` lock on the `DEFAULT` partition and scans it to prove no row belongs in the new range. Keep the default empty by staying ahead of the calendar; if it has filled up, the maintenance run will block writes while it scans.

Retirement (audit only):

```sql
DROP TABLE audit_log_2026_07;    -- retention per tenant.retention_policy.audit_days (default 2555 days)
```

**Never drop an `outbox_event` partition during the pilot.** The stream is the corpus and cannot be reconstructed. Archive by `ALTER TABLE outbox_event DETACH PARTITION ...` and move to cold storage if you must.

### What breaks if it is forgotten

Because both tables have a `DEFAULT` partition, a missed month **degrades rather than fails** — which is exactly why the defaults are there, and exactly why the failure is easy to miss:

- Writes keep succeeding. They land in `audit_log_default` / `outbox_event_default`.
- Query planning degrades: partition pruning stops helping, and the default partition grows unbounded and unpruned. The flusher's poll and the audit console get progressively slower.
- The **next** partition creation gets worse, not better: creating `2027_01` must scan a default partition now holding a month of rows under `ACCESS EXCLUSIVE`, blocking writes for the duration. Miss three months and that scan becomes an outage.
- Retention breaks silently: audit rows that landed in the default cannot be dropped by dropping a month partition, so a `DROP TABLE audit_log_2027_01` deletes nothing and the GDPR retention commitment quietly stops being met.

**If the defaults did not exist**, every write would fail with `no partition of relation "outbox_event" found for row` — and because the outbox insert shares the domain transaction, **every domain write in the product would fail**. The comment on `outbox_event_default` says exactly this. The defaults are a safety net, not a plan.

Monitor both, and alert on any row landing in either:

```sql
SELECT 'audit_log_default'   AS partition, count(*) FROM audit_log_default
UNION ALL
SELECT 'outbox_event_default',            count(*) FROM outbox_event_default;
```

Non-zero on `outbox_event_default` is a page, not a ticket.

---

## 8. Testing — the cross-tenant isolation suite

This defends the highest-consequence failure in the product: a data leak between three competing quarry operators sharing one database. **Run it in CI on every commit**, against a database built by running 0001–0007 from scratch. It should take under ten seconds.

Every test raises an exception on failure, so `psql -v ON_ERROR_STOP=1` fails the build.

### Fixture

```sql
-- rls_fixture.sql -- run as safein5_migrator on a fresh 0001..0007 database.
BEGIN;

INSERT INTO tenant (id, slug, kind, name, industry_code, country_code) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','tenant-alpha','corporate','Alpha Quarries','0812','GB'),
  ('bbbbbbbb-0000-0000-0000-000000000001','tenant-beta','corporate','Beta Aggregates','0812','GB');

INSERT INTO tenant_secret (tenant_id, author_token_salt) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', decode('00112233445566778899aabbccddeeff','hex')),
  ('bbbbbbbb-0000-0000-0000-000000000001', decode('ffeeddccbbaa99887766554433221100','hex'));

-- Alpha
SELECT set_config('app.tenant_id','aaaaaaaa-0000-0000-0000-000000000001',true);
INSERT INTO site (id, tenant_id, name)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Alpha Pit');
INSERT INTO sub_site (id, tenant_id, site_id, name)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001',
          'aaaaaaaa-0000-0000-0000-000000000003','Alpha North Face');
INSERT INTO behaviour_signal (id, tenant_id, status, visibility, author_token,
                              is_anonymous, classification_code, classified_at,
                              finalised_at, site_id, body_text)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000091','aaaaaaaa-0000-0000-0000-000000000001',
          'final','site','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', true,
          'be_aware', now(), now(),'aaaaaaaa-0000-0000-0000-000000000003',
          'ALPHA SECRET spreader beam observation');

-- Beta
SELECT set_config('app.tenant_id','bbbbbbbb-0000-0000-0000-000000000001',true);
INSERT INTO site (id, tenant_id, name)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000001','Beta Pit');
INSERT INTO sub_site (id, tenant_id, site_id, name)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000001',
          'bbbbbbbb-0000-0000-0000-000000000003','Beta South Face');
INSERT INTO behaviour_signal (id, tenant_id, status, visibility, author_token,
                              is_anonymous, classification_code, classified_at,
                              finalised_at, site_id, body_text)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000091','bbbbbbbb-0000-0000-0000-000000000001',
          'final','site','BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', true,
          'needs_attention_now', now(), now(),'bbbbbbbb-0000-0000-0000-000000000003',
          'BETA SECRET conveyor guard missing');

-- One public Community signal, for the public-read test.
SELECT set_config('app.tenant_id','00000000-0000-0000-0000-0000000000c0',true);
INSERT INTO site (id, tenant_id, name)
  VALUES ('cccccccc-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000c0','Community');
INSERT INTO behaviour_signal (id, tenant_id, status, visibility, author_token,
                              is_anonymous, classification_code, classified_at,
                              finalised_at, moderation_state, body_text)
  VALUES ('cccccccc-0000-0000-0000-000000000091','00000000-0000-0000-0000-0000000000c0',
          'final','public','CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', true,
          'good_practice', now(), now(),'visible','COMMUNITY public post');
COMMIT;
```

### The suite

Run **as `safein5_app`** unless a test says otherwise. Running it as the owner is worthless — the owner is only constrained because of `FORCE`, and the grant tests need the real runtime role.

```sql
-- rls_isolation_suite.sql
-- psql -v ON_ERROR_STOP=1 -U safein5_app -f rls_isolation_suite.sql
\set ON_ERROR_STOP on
\set ALPHA '''aaaaaaaa-0000-0000-0000-000000000001'''
\set BETA  '''bbbbbbbb-0000-0000-0000-000000000001'''

-- ---------------------------------------------------------------------
-- T1. Structural: every tenant-scoped relation is RLS-enabled, FORCED
--     and policied. Catches a new table landing without a policy.
-- ---------------------------------------------------------------------
DO $$
DECLARE v_bad text := '';
BEGIN
  SELECT string_agg(c.relname, ' ') INTO v_bad
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
   WHERE n.nspname = current_schema()
     AND c.relkind IN ('r','p')
     AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped
     AND c.relname NOT IN ('auth_token')
     AND (c.relrowsecurity = false OR c.relforcerowsecurity = false
          OR NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid));
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'T1 FAIL: relations without ENABLE+FORCE RLS and a policy: %', v_bad;
  END IF;
  RAISE NOTICE 'T1 pass';
END $$;

-- ---------------------------------------------------------------------
-- T2. Unscoped connection sees NOTHING. The fail-closed property.
--     THE test that catches a forgotten SET LOCAL.
-- ---------------------------------------------------------------------
BEGIN;
DO $$
DECLARE n bigint;
BEGIN
  IF nullif(current_setting('app.tenant_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'T2 FAIL: GUC leaked into a fresh transaction (SET, not SET LOCAL?)';
  END IF;
  SELECT count(*) INTO n FROM behaviour_signal;
  IF n <> 0 THEN RAISE EXCEPTION 'T2 FAIL: unscoped read returned % signals', n; END IF;
  SELECT count(*) INTO n FROM site;                IF n <> 0 THEN RAISE EXCEPTION 'T2 FAIL: site'; END IF;
  SELECT count(*) INTO n FROM user_tenant_membership; IF n <> 0 THEN RAISE EXCEPTION 'T2 FAIL: membership'; END IF;
  SELECT count(*) INTO n FROM signal_media;        IF n <> 0 THEN RAISE EXCEPTION 'T2 FAIL: media'; END IF;
  SELECT count(*) INTO n FROM review_task;         IF n <> 0 THEN RAISE EXCEPTION 'T2 FAIL: review_task'; END IF;
  RAISE NOTICE 'T2 pass';
END $$;
COMMIT;

-- ---------------------------------------------------------------------
-- T3. Scoped to Alpha => Alpha's rows only, Beta invisible.
--     The core leak test. Run once per table that matters.
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.tenant_id', :ALPHA, true);
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM behaviour_signal WHERE tenant_id <> :ALPHA::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T3 FAIL: LEAK -- % foreign signals visible to Alpha', n; END IF;

  SELECT count(*) INTO n FROM behaviour_signal WHERE body_text LIKE 'BETA SECRET%';
  IF n <> 0 THEN RAISE EXCEPTION 'T3 FAIL: LEAK -- Alpha can read Beta signal bodies'; END IF;

  -- Positive control: without this, T3 passes trivially when RLS returns 0 rows for everyone.
  SELECT count(*) INTO n FROM behaviour_signal WHERE tenant_id = :ALPHA::uuid;
  IF n = 0 THEN RAISE EXCEPTION 'T3 FAIL: fixture broken -- Alpha sees none of its own rows'; END IF;

  SELECT count(*) INTO n FROM site           WHERE tenant_id <> :ALPHA::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T3 FAIL: site leak'; END IF;
  SELECT count(*) INTO n FROM sub_site       WHERE tenant_id <> :ALPHA::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T3 FAIL: sub_site leak'; END IF;
  RAISE NOTICE 'T3 pass';
END $$;
COMMIT;

-- ---------------------------------------------------------------------
-- T4. Cross-tenant WRITE is rejected. WITH CHECK has no bypass.
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.tenant_id', :ALPHA, true);
DO $$
BEGIN
  BEGIN
    INSERT INTO behaviour_signal (id, tenant_id, status, author_token)
    VALUES (gen_random_uuid(), :BETA::uuid, 'draft', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    RAISE EXCEPTION 'T4 FAIL: BREACH -- Alpha inserted a signal into Beta';
  EXCEPTION WHEN insufficient_privilege THEN            -- 42501
    RAISE NOTICE 'T4 pass (42501 as expected)';
  END;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------
-- T5. app.bypass_rls widens READS but NEVER writes.
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.tenant_id',  :ALPHA, true);
SELECT set_config('app.bypass_rls', 'on',   true);
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM behaviour_signal WHERE tenant_id = :BETA::uuid;
  IF n = 0 THEN RAISE EXCEPTION 'T5 FAIL: bypass did not widen reads (fixture or policy broken)'; END IF;
  BEGIN
    INSERT INTO behaviour_signal (id, tenant_id, status, author_token)
    VALUES (gen_random_uuid(), :BETA::uuid, 'draft', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    RAISE EXCEPTION 'T5 FAIL: BREACH -- bypass_rls allowed a cross-tenant WRITE';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'T5 pass';
  END;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------
-- T6. Community public read: SCP-024. Corporate content must never
--     leak into the community feed, even with no tenant scope at all.
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.community_tenant_id','00000000-0000-0000-0000-0000000000c0', true);
-- app.tenant_id deliberately NOT set: this is the unauthenticated path.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM behaviour_signal
   WHERE tenant_id <> '00000000-0000-0000-0000-0000000000c0'::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T6 FAIL: BREACH -- % corporate rows in the public feed', n; END IF;

  SELECT count(*) INTO n FROM behaviour_signal;
  IF n = 0 THEN RAISE EXCEPTION 'T6 FAIL: public read policy returned nothing'; END IF;

  SELECT count(*) INTO n FROM behaviour_signal
   WHERE visibility <> 'public' OR status <> 'final'
      OR moderation_state <> 'visible' OR deleted_at IS NOT NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'T6 FAIL: public feed exposed non-public/non-final/hidden rows'; END IF;
  RAISE NOTICE 'T6 pass';
END $$;
COMMIT;

-- ---------------------------------------------------------------------
-- T7. Column privilege: safein5_app cannot read the pseudonym mapping,
--     the password hash, or the salt.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF has_column_privilege('safein5_app','user_tenant_membership','author_token','SELECT') THEN
    RAISE EXCEPTION 'T7 FAIL: safein5_app can read author_token';
  END IF;
  IF has_column_privilege('safein5_app','app_user','password_hash','SELECT') THEN
    RAISE EXCEPTION 'T7 FAIL: safein5_app can read password_hash';
  END IF;
  IF has_table_privilege('safein5_app','tenant_secret','SELECT') THEN
    RAISE EXCEPTION 'T7 FAIL: safein5_app can read tenant_secret';
  END IF;
  IF has_table_privilege('safein5_worker','tenant_secret','SELECT') THEN
    RAISE EXCEPTION 'T7 FAIL: safein5_worker can read tenant_secret';
  END IF;
  IF has_column_privilege('safein5_worker','user_tenant_membership','author_token','SELECT') THEN
    RAISE EXCEPTION 'T7 FAIL: safein5_worker can read author_token';
  END IF;
  IF has_table_privilege('safein5_app','user_tenant_membership','INSERT') THEN
    RAISE EXCEPTION 'T7 FAIL: safein5_app can INSERT memberships (would mint tokens)';
  END IF;
  RAISE NOTICE 'T7 pass';
END $$;

-- ---------------------------------------------------------------------
-- T8. No DELETE anywhere except the one GDPR exception.
-- ---------------------------------------------------------------------
DO $$
DECLARE v_bad text := '';
BEGIN
  SELECT string_agg(g.grantee || ':' || c.relname, ' ') INTO v_bad
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN LATERAL (SELECT unnest(ARRAY['safein5_app','safein5_worker','safein5_identity']) AS grantee) g
      ON true
   WHERE n.nspname = current_schema() AND c.relkind IN ('r','p')
     AND has_table_privilege(g.grantee, c.oid, 'DELETE')
     AND NOT (g.grantee = 'safein5_identity' AND c.relname = 'user_tenant_membership');
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'T8 FAIL: unexpected DELETE: %', v_bad; END IF;
  RAISE NOTICE 'T8 pass';
END $$;

-- ---------------------------------------------------------------------
-- T9. Append-only tables really are append-only for the app role.
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_log','outbox_event','workflow_transition',
                           'signal_classification_event'] LOOP
    IF has_table_privilege('safein5_app', t, 'UPDATE') THEN
      RAISE EXCEPTION 'T9 FAIL: safein5_app can UPDATE append-only table %', t;
    END IF;
    IF NOT has_table_privilege('safein5_app', t, 'INSERT') THEN
      RAISE EXCEPTION 'T9 FAIL: safein5_app cannot INSERT into %', t;
    END IF;
  END LOOP;
  IF has_column_privilege('safein5_worker','outbox_event','payload','UPDATE') THEN
    RAISE EXCEPTION 'T9 FAIL: worker can rewrite outbox payloads';
  END IF;
  RAISE NOTICE 'T9 pass';
END $$;

-- ---------------------------------------------------------------------
-- T10. Composite FKs make cross-tenant referential drift impossible.
--      RLS cannot catch this class -- both rows are individually valid.
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.tenant_id', :ALPHA, true);
DO $$
BEGIN
  BEGIN
    INSERT INTO sub_site (id, tenant_id, site_id, name)
    VALUES (gen_random_uuid(), :ALPHA::uuid,
            'bbbbbbbb-0000-0000-0000-000000000003', 'Smuggled Zone');  -- Beta's site
    RAISE EXCEPTION 'T10 FAIL: created an Alpha sub_site under a Beta site';
  EXCEPTION WHEN foreign_key_violation THEN                             -- 23503
    RAISE NOTICE 'T10 pass';
  END;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------
-- T11. Anonymity is a DB invariant, not a convention.
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.tenant_id', :ALPHA, true);
DO $$
DECLARE u uuid;
BEGIN
  INSERT INTO app_user (id, display_name) VALUES (gen_random_uuid(),'T11') RETURNING id INTO u;
  BEGIN
    INSERT INTO behaviour_signal (id, tenant_id, status, author_token, is_anonymous, author_user_id)
    VALUES (gen_random_uuid(), :ALPHA::uuid, 'draft',
            'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', true, u);
    RAISE EXCEPTION 'T11 FAIL: stored an anonymous signal carrying a user id';
  EXCEPTION WHEN check_violation THEN                                   -- 23514
    RAISE NOTICE 'T11 pass';
  END;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------
-- T12. Outbox payloads cannot carry identifiers (top-level tripwire).
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.tenant_id', :ALPHA, true);
DO $$
BEGIN
  BEGIN
    INSERT INTO outbox_event (tenant_id, event_type, aggregate_type, payload)
    VALUES (:ALPHA::uuid, 'signal.finalised', 'behaviour_signal',
            '{"userId":"11111111-1111-1111-1111-111111111111"}'::jsonb);
    RAISE EXCEPTION 'T12 FAIL: outbox accepted a userId payload';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'T12 pass';
  END;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------
-- T13. Partition runway. Fails 60 days BEFORE writes start defaulting.
-- ---------------------------------------------------------------------
DO $$
DECLARE t text; horizon timestamptz := now() + interval '60 days';
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_log','outbox_event'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class p
        JOIN pg_inherits i ON i.inhrelid = p.oid
        JOIN pg_class parent ON parent.oid = i.inhparent
       WHERE parent.relname = t
         AND p.relname <> t || '_default'
         AND horizon >= (regexp_replace(p.relname, '^.*_(\d{4})_(\d{2})$', '\1-\2-01')::timestamptz)
         AND horizon <  (regexp_replace(p.relname, '^.*_(\d{4})_(\d{2})$', '\1-\2-01')::timestamptz
                         + interval '1 month')
    ) THEN
      RAISE EXCEPTION 'T13 FAIL: no % partition covers % -- run partition maintenance', t, horizon;
    END IF;
  END LOOP;
  RAISE NOTICE 'T13 pass';
END $$;

-- ---------------------------------------------------------------------
-- T14. Every partition of a partitioned table has its own RLS + policy.
--      Catches a maintenance run that created the table and stopped.
-- ---------------------------------------------------------------------
DO $$
DECLARE v_bad text := '';
BEGIN
  SELECT string_agg(p.relname, ' ') INTO v_bad
    FROM pg_class p
    JOIN pg_inherits i ON i.inhrelid = p.oid
    JOIN pg_class parent ON parent.oid = i.inhparent
   WHERE parent.relname IN ('audit_log','outbox_event')
     AND (p.relrowsecurity = false OR p.relforcerowsecurity = false
          OR NOT EXISTS (SELECT 1 FROM pg_policy x WHERE x.polrelid = p.oid));
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'T14 FAIL: partitions readable cross-tenant when queried directly: %', v_bad;
  END IF;
  RAISE NOTICE 'T14 pass';
END $$;
```

**T15 — the API-level test, in Jest, not SQL.** The suite above proves the database is correct. It does not prove the application uses it correctly. Add one integration test that drives real HTTP requests with an Alpha JWT and asserts no Beta identifier appears in any response body — including error messages, which are the most common leak vector (a 404 that echoes a Beta id back proves the row exists). Run it for every list endpoint: feed, review queue, admin directory, analytics.

The two tests to never delete: **T3's positive control** (without it, T3 passes when everything is broken and RLS returns zero rows for everyone) and **T2** (the fail-closed proof, which is the one that catches the forgotten `SET LOCAL`).

---

## 9. Index strategy

### Which index serves which query path

**The feed — the hottest query in the product**

| Index | Query path |
|---|---|
| `idx_behaviour_signal_feed (tenant_id, status, visibility, created_at DESC) WHERE deleted_at IS NULL` | The main feed page. Partial so soft-deleted rows cost nothing. |
| `idx_behaviour_signal_tenant_site (tenant_id, site_id, created_at DESC) WHERE deleted_at IS NULL` | Site-scoped feed (WRK-014). |
| `idx_behaviour_signal_subsite_classification (tenant_id, sub_site_id, classification_code, created_at DESC) WHERE deleted_at IS NULL` | WRK-013: auto-filter to the worker's current zone, "red first" ordering. |
| `idx_signal_read_state_tenant_token (tenant_id, author_token, seen_at DESC)` | The "You are caught up!" boundary. |

"Red first" ordering is `ORDER BY severity_ordinal DESC, created_at DESC` via the `classification` join — the `severity_ordinal` column exists precisely so that ordering lives in SQL rather than being re-implemented (and drifting) in application code.

**Capture and pseudonym paths**

| Index | Query path |
|---|---|
| `idx_behaviour_signal_author_token (author_token, created_at DESC)` | Repeat-usage metric (`COUNT(DISTINCT author_token)`) **and** the rate-limit window count. **Deliberately not partial** — rate limiting must see discarded and soft-deleted rows or discarding becomes a spam bypass. |
| `uq_user_tenant_membership_tenant_author_token (tenant_id, author_token)` | Identity module: token → membership resolution (closure notification, abuse blocking). |
| `uq_guest_session_tenant_client_token_hash (tenant_id, client_token_hash)` | Guest cookie → session on every guest request. |
| `idx_pulse_session_author_token (author_token, started_at DESC)` | PULSE completion rate per actor. |

**The flagship supervisor insight**

`idx_behaviour_signal_asset (tenant_id, asset_id, created_at DESC) WHERE deleted_at IS NULL AND asset_id IS NOT NULL`, plus `idx_asset_tenant_type (tenant_id, asset_type)`, serve *"3 similar Be Aware signals in 2 weeks, all on custom lifting fixtures"* — a `GROUP BY asset_id` joined back for the label/type. This is why `asset` is a real entity and not a free-text field: string matching would make the demo unreliable.

**Supervisor workflow**

| Index | Query path |
|---|---|
| `idx_review_task_tenant_state_created (tenant_id, state, created_at DESC) WHERE deleted_at IS NULL` | The supervisor queue. |
| `idx_review_task_tenant_due (tenant_id, due_at) WHERE deleted_at IS NULL AND closed_at IS NULL` | SLA/overdue list. |
| `idx_behaviour_signal_workflow_state (tenant_id, workflow_state, created_at DESC) WHERE workflow_state IS NOT NULL AND deleted_at IS NULL` | Feed badges without a join. |
| `idx_workflow_transition_task_created (review_task_id, created_at)` | Task history panel. |

**QR resolve — "one query, one round trip"**

`uq_qr_code_token (token)` is the unique btree the resolver scans. There is deliberately **no separate index on token**. `uq_context_binding_actor_live (tenant_id, actor_kind, actor_ref) WHERE deleted_at IS NULL` makes "scan another QR overwrites the binding" an UPSERT rather than an INSERT.

**Background jobs**

| Index | Job |
|---|---|
| `idx_outbox_event_unpublished (next_attempt_at NULLS FIRST, occurred_at, id) WHERE published_at IS NULL` | The flusher poll. Partial → bounded by the pending backlog, not the corpus. |
| `idx_signal_media_pending_reconcile (created_at) WHERE state IN ('reserved','uploading','uploaded','processing')` | The 10-minute media reconciler. |
| `idx_behaviour_signal_stale_drafts (tenant_id, created_at) WHERE status IN ('draft','classified')` | The 24h draft reaper. |
| `idx_auth_token_expires_at (expires_at) WHERE consumed_at IS NULL` | Token expiry sweep. |
| `idx_context_binding_expires_at (expires_at) WHERE deleted_at IS NULL` | Stale binding sweep. |
| `idx_notification_queued (tenant_id, created_at) WHERE state = 'queued' AND deleted_at IS NULL` | Notification dispatcher. |

**Search and analytics**

`idx_behaviour_signal_search_vector` (GIN over the generated `search_vector`); `idx_behaviour_signal_taxonomy (tenant_id, risk_type_code, task_type_code, created_at DESC)` for "all suspended-load signals in this zone"; `idx_signal_classification_event_disagreement (tenant_id, from_code, to_code, created_at) WHERE from_code IS NOT NULL` for worker-vs-reviewer disagreement analysis.

### What to watch as volume grows

1. **`idx_behaviour_signal_author_token`** — the only hot index that is *not* partial on `deleted_at`, by design. It grows with total signals ever created, including discarded ones. It is on the rate-limit path, so it is checked on every capture. **Watch first.** If it becomes a problem, the fix is a partial index on a recent window plus a separate cold index — not making it partial, which would reopen the spam bypass.
2. **`idx_outbox_event_unpublished`** — tiny while the flusher keeps up, unbounded the moment it does not. Alert on `count(*) FROM outbox_event WHERE published_at IS NULL` exceeding a few thousand. A growing pending backlog is a growing index on the poll path — the failure compounds.
3. **`idx_behaviour_signal_search_vector`** (GIN) — GIN indexes bloat on high-update tables. `body_text` is written once at finalise, so this should be stable, but check `pg_stat_user_indexes` and consider `fastupdate=off` if insert latency at capture matters more than index build cost. It has zero MVP query volume (there is no search UI yet), so it is pure write cost today.
4. **The four `audit_log` indexes** — they exist on *every* partition. Four indexes × N months is real storage. `idx_audit_log_action (action, occurred_at DESC)` and `idx_audit_log_actor_token` are the least selective; drop them from archived partitions before detaching if space bites.
5. **The `_default` partitions** — an unpruned default partition means every query on `audit_log` or `outbox_event` scans it. Keep it empty (§7).
6. **`idx_behaviour_signal_stale_drafts`** — the predicate `status IN ('draft','classified')` covers a set that should stay small because the reaper empties it. If this index grows, the reaper has stopped. It is a free monitor: `pg_relation_size` on it is a proxy for reaper health.
7. **Composite-FK write amplification** — nearly every table has composite `(id, tenant_id)` FKs, which means every insert does extra unique-index lookups against the parents. This buys structural cross-tenant safety and is worth it, but it means insert cost is higher than a naive schema. Budget for it in capture-latency testing; do not be surprised by it in a load test.
8. **Unused index audit** — several indexes serve Phase-2 or [SIGNAL] paths with no MVP reader (`idx_behaviour_signal_taxonomy`, `idx_review_task_assigned_to`, `idx_signal_classification_event_disagreement`). Review `pg_stat_user_indexes.idx_scan` at end of pilot before deciding — but do **not** drop them just because they are unused, since several are there to make Phase 2 cheap.

---

## 10. What is deliberately NOT here, and why

The schema ships Phase-2 structure that the MVP does not use. Every instance is the same trade: a nullable column or an unread table now, versus a migration mid-pilot against live data. Where the data is unrecoverable retrospectively, the column is written at MVP even though nothing reads it (marked `[SIGNAL]` in the column comments).

### Present but unused

**`evidence` (whole table)** — Dev Pack Sec 7 requires "evidence required before close (configurable)"; PRD Sec 5.4 ships no evidence UI. The table exists, the API can write rows from day one if a closure attaches a photo, and nothing reads them.
*To turn on:* `UPDATE workflow_state_def SET requires_evidence = true WHERE code = 'closed';` then build the upload UI and the transition-guard check. No migration.

**`review_task.assigned_to_membership_id` / `assigned_at`** — Dev Pack's "assignment required before action" step. Written at MVP only if a supervisor self-assigns; there is no assignment UI. `ON DELETE SET NULL` so GDPR erasure of a supervisor cannot block.
*To turn on:* `UPDATE workflow_transition_def SET enabled = true WHERE (from_code,to_code) IN (('open','assigned'),('assigned','acknowledged'));` plus `UPDATE workflow_state_def SET enabled_in_mvp = true WHERE code = 'assigned';` plus an assignment screen. The index `idx_review_task_assigned_to` is already there.

**Full workflow lifecycle (`assigned`, `actioned`, reopen)** — the complete Dev Pack chain `New → Assigned → Acknowledged → Actioned → Closed` is **seeded** in `workflow_state_def` / `workflow_transition_def` with `enabled_in_mvp = false` / `enabled = false`. Only `open → acknowledged → closed` is live.
*To turn on:* UPDATE the seed rows plus UI work. No `ALTER TYPE`, no migration against a table that by then holds live pilot review tasks. That is the entire reason the state machine is config data rather than a PG enum.
Note `open → closed` is seeded **deliberately disabled**: collapsing the two taps would destroy `first_response_ms`, the metric the whole "report black hole" argument rests on. Enabling it is a one-row UPDATE — do not do it casually.

**`behaviour_signal.similarity_group_id`** — a pure placeholder for Phase-2 clustering. Never written at MVP. Costs one nullable column now and a full backfill that can never be done later (you cannot recluster signals whose context you no longer have).
*To turn on:* build the clustering job, backfill from `search_vector` + `asset_id` + `risk_type_code`, add an index on `(tenant_id, similarity_group_id)`.

**`behaviour_signal.duplicate_of_id`** — self-FK, tenant-composite, guarded by `ck_behaviour_signal_not_self_duplicate`. At MVP it is written **only** via an explicit moderator "mark duplicate" action (`moderation_action.action = 'mark_duplicate'`). Automated detection is Phase 2 against the same column.
*To turn on:* build the detector; add an index on `(duplicate_of_id)` and a feed filter for `duplicate_of_id IS NULL`. The FK and the constraint already hold.

**Other deliberate placeholders**

| Structure | State at MVP | To turn on |
|---|---|---|
| `sub_site.parent_sub_site_id` | Depth capped at 1 by `trg_sub_site_depth_cap` | `DROP TRIGGER trg_sub_site_depth_cap ON sub_site;` — nothing else constrains depth |
| `tenant.allow_guest_submission` | `false` (Community pilot: guests read, accounts write) | One UPDATE per tenant; no deploy, no migration (resolves WRK-003) |
| `classification.triggers_workflow` | true only for `needs_attention_now` | UPDATE the row — making `be_aware` a workflow trigger is config, not code |
| `moderation_action.target_type = 'comment'` | Seeded in the CHECK; comments do not exist | Phase-2 comment moderation is not an ALTER |
| `role.permissions` jsonb | Flat string array, set-membership check only | A real RBAC engine is out of proportion to a 60-user pilot (QA-006) |
| `[SIGNAL]` columns — `tenant.industry_code`, `site.timezone`, centroids, `entry_point`, `steps_completed`, `duration_ms`, `assignment_source`, `due_at`, `transcript_confidence` | Written, unread | Nothing to turn on — they are being captured now precisely because they are unrecoverable retrospectively |

### Genuinely absent

- **No `organisation` table, and that is a decision rather than an omission.** An earlier draft carried `organisation` between `tenant` and `site` as future-proofing for a tenant that one day holds several organisations. The client chose simplicity instead: one tenant **is** one organisation, so the organisation profile (`industry_code`, `country_code`) collapsed onto `tenant` and `site.organisation_id` was dropped. The trade is deliberately cheap to unwind. Re-introducing the level later is **one table, one FK, and a backfill of one column on `site`** — nothing else in the schema ever referenced `organisation`, so no other table, index, RLS policy, composite FK or outbox payload has to change. Isolation stays keyed on `tenant_id` either way. Do not add it back speculatively; add it back the day a real tenant needs two organisations, and expect it to be a half-day migration.
  Its collapse is also why `behaviour_signal.visibility` is a **three-tier** scale — `site | tenant | public` — and not four. The old `organisation` tier sat between `site` and `tenant` and, with one organisation per tenant, meant exactly what `tenant` means. Two values that can never differ are a bug waiting to be written, so the tier is gone; `visibility = 'tenant'` is now the whole-organisation scope. Restoring the fourth value would be an `ALTER ... CHECK` (no PG enum anywhere), which is the same reason every other enumeration here is `text` + CHECK.
- **No `DELETE` anywhere** except `safein5_identity` on `user_tenant_membership`. Soft delete is a guarantee enforced by withheld grants, not a coding convention: a stray `.deleteFrom()` fails with `42501` instead of destroying a signal.
- **No PG `ENUM` types anywhere.** Every enumeration is `text` + named CHECK, so a Phase-2 state is an `ALTER ... CHECK` or an `INSERT`, never an `ALTER TYPE`.
- **No comments/reactions**, no analytics rollup tables (metrics are projected from `outbox_event`), no i18n tables (`app_user.locale` is captured, unread), no `search_vector` over context terms (a generated column must be IMMUTABLE and cannot join).
- **No `user_id` on any activity table** — `qr_scan_event`, `learn5_view`, `signal_read_state` are keyed by `author_token` only, and none may ever gain one. That is what makes destroying the token mapping a complete, single-step de-attribution.
- **The `permissions` guard, the serialiser allowlist, the transition guard and `runAsSystem`** are application components. The schema constrains them (`workflow_transition_def`, `ck_outbox_event_payload_pseudonymous`, the RLS policies) but cannot implement them. Those are the four places where a bug becomes a breach, and they are the four places to concentrate code review.
