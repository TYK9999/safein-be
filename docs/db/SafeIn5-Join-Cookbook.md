# SafeIn5 — JOIN COOKBOOK

Every query below was executed against `safein5_verify` (seeded through `0008_seed_demo.sql`) with:

```
PGCLIENTENCODING=UTF8 PGPASSWORD=admin "/c/Program Files/PostgreSQL/16/bin/psql" \
  -w -h localhost -U postgres -v ON_ERROR_STOP=1 -d safein5_verify -c "<query>"
```

Outputs are verbatim. Two queries needed fixtures that the seed does not contain (a revoked QR, a third Be Aware); those run inside `BEGIN … ROLLBACK` so the demo DB is unchanged, and that is stated inline.

## Demo fixtures you will reference

| Thing | Id / value |
|---|---|
| tenant | `b0000000-0000-0000-0000-000000000001` |
| site — Brackley North Quarry | `…0003` |
| sub_site — Lifting Zone 3 | `…0004` |
| sub_site — Primary Crusher Area | `…0005` |
| asset — Spreader Beam SB-14 (custom lifting fixture), `asset_type='fixture'` | `…0006` |
| Jo Mason (worker, `default_anonymous=true`) | user `…0011`, membership `…0021`, token `J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ` |
| Priya Raman (supervisor) | user `…0012`, membership `…0022`, token `K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ` |
| David Okafor (org_admin) | user `…0013`, membership `…0023`, token `M7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ` |
| signals | `…0091` be_aware ANON (Jo), `…0092` be_aware (Priya), `…0093` good_practice (David), `…0094` needs_attention_now (Jo, attributed) |
| QR token | `HJ7K3M9PQR2X` → context `…0071` |

`classification.severity_ordinal`: good_practice 1, be_aware 2, needs_attention_now 3.

**RLS note.** Every tenant table is `FORCE ROW LEVEL SECURITY` with `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. `postgres` is a superuser and bypasses RLS, so the executions below prove the *joins*, not the isolation. Every query still carries an explicit `tenant_id =` predicate — that is not redundant, it is what lets the composite `(tenant_id, …)` indexes drive the scan. In production the app sets `app.tenant_id` per request and RLS is the backstop.

---

# 1. The feed query — WRK-012 / WRK-013

The single most important query in the product. Signals for the worker's current sub-site context, joined to classification, author display (anonymity-safe), media state, thumbnail, workflow badge. Sorted severity DESC then recency DESC, keyset-paginated.

```sql
SELECT
    s.id,
    cl.code   AS classification_code,
    cl.label  AS classification_label,
    cl.colour_token,
    cl.severity_ordinal,
    CASE WHEN s.is_anonymous THEN 'Anonymous'
         ELSE COALESCE(au.display_name, 'Anonymous') END AS author_display,
    s.is_anonymous,
    left(s.body_text, 60) AS body_preview,
    s.media_state,
    m.thumb_key,
    ss.name AS sub_site_name,
    CASE WHEN s.workflow_state IS NULL THEN NULL ELSE wsd.label END AS workflow_badge,
    s.created_at
FROM behaviour_signal s
JOIN classification cl
       ON cl.code = s.classification_code
LEFT JOIN app_user au
       ON au.id = s.author_user_id
      AND s.is_anonymous = false          -- belt AND braces; see note below
LEFT JOIN sub_site ss
       ON ss.id = s.sub_site_id AND ss.tenant_id = s.tenant_id
LEFT JOIN workflow_state_def wsd
       ON wsd.code = s.workflow_state
LEFT JOIN LATERAL (
    SELECT sm.thumb_key
      FROM signal_media sm
     WHERE sm.signal_id = s.id
       AND sm.tenant_id = s.tenant_id
       AND sm.deleted_at IS NULL
       AND sm.state = 'ready'
       AND sm.thumb_key IS NOT NULL
     ORDER BY sm.created_at
     LIMIT 1
) m ON true
WHERE s.tenant_id        = 'b0000000-0000-0000-0000-000000000001'
  AND s.sub_site_id      = 'b0000000-0000-0000-0000-000000000004'
  AND s.status           = 'final'
  AND s.deleted_at       IS NULL
  AND s.moderation_state = 'visible'
ORDER BY cl.severity_ordinal DESC, s.created_at DESC, s.id DESC
LIMIT 20;
```

**Executed output** (3 rows; `thumb_key` truncated here for width, it was returned in full):

```
                  id                  | classification_code | classification_label | colour_token | severity_ordinal | author_display | is_anonymous |                     body_preview                     | media_state |  thumb_key   | sub_site_name  | workflow_badge |            created_at
--------------------------------------+---------------------+----------------------+--------------+------------------+----------------+--------------+------------------------------------------------------+-------------+--------------+----------------+----------------+----------------------------------
 b0000000-0000-0000-0000-000000000091 | be_aware            | Be Aware             | amber        |                2 | Anonymous      | t            | Shackle pin on SB-14 is not the pin listed on the ... | ready       | s3://…_thumb.webp | Lifting Zone 3 |                | 2026-07-21 19:20:38.890733+05:30
 b0000000-0000-0000-0000-000000000092 | be_aware            | Be Aware             | amber        |                2 | Priya Raman    | f            | SWL plate on the spreader beam is worn and hard from | none        |              | Lifting Zone 3 |                | 2026-07-12 22:20:38.890733+05:30
 b0000000-0000-0000-0000-000000000093 | good_practice       | Good Practice        | green        |                1 | David Okafor   | f            | Night crew barriered the full 15 m exclusion zone... | none        |              | Lifting Zone 3 |                | 2026-07-16 22:20:38.890733+05:30
(3 rows)
```

## Why this can never leak a name

There are exactly three things doing the work, and they are independent:

1. **The database makes it impossible.** `ck_behaviour_signal_anonymity CHECK (is_anonymous = false OR author_user_id IS NULL)`. When `is_anonymous` is true, `author_user_id` is already NULL, so the `LEFT JOIN app_user` produces no row and `au.display_name` is NULL.
2. **The `CASE` short-circuits before the column is read.** `WHEN s.is_anonymous THEN 'Anonymous'` is evaluated first; `au.display_name` is never reached on an anonymous row.
3. **The join predicate is guarded too** (`AND s.is_anonymous = false`), so even if someone drops the CHECK constraint in a future migration, the join still yields no row.

The `COALESCE(au.display_name, 'Anonymous')` on the else-branch covers the erased-user case: after GDPR erasure `display_name` is NULL and the feed degrades to `Anonymous` rather than rendering a blank byline.

**Do not select `s.author_token` in the feed.** See finding **F-1** in §14 — it is a working de-anonymisation vector.

## Cursor pagination (keyset, not OFFSET)

The cursor is the full sort tuple `(severity_ordinal, created_at, id)`, base64-encoded by the API. Row-value comparison gives correct ordering across all three keys in one predicate:

```sql
  AND (cl.severity_ordinal, s.created_at, s.id)
      < (:cursor_severity::smallint, :cursor_created_at::timestamptz, :cursor_id::uuid)
```

Executed with the cursor set to row 1 of the page above:

```sql
SELECT s.id, cl.severity_ordinal, s.created_at,
       CASE WHEN s.is_anonymous THEN 'Anonymous' ELSE COALESCE(au.display_name,'Anonymous') END AS author_display
FROM behaviour_signal s
JOIN classification cl ON cl.code = s.classification_code
LEFT JOIN app_user au ON au.id = s.author_user_id AND s.is_anonymous = false
WHERE s.tenant_id   = 'b0000000-0000-0000-0000-000000000001'
  AND s.sub_site_id = 'b0000000-0000-0000-0000-000000000004'
  AND s.status      = 'final'
  AND s.deleted_at  IS NULL
  AND s.moderation_state = 'visible'
  AND (cl.severity_ordinal, s.created_at, s.id)
      < (2::smallint,
         '2026-07-21 19:20:38.890733+05:30'::timestamptz,
         'b0000000-0000-0000-0000-000000000091'::uuid)
ORDER BY cl.severity_ordinal DESC, s.created_at DESC, s.id DESC
LIMIT 20;
```

```
                  id                  | severity_ordinal |            created_at            | author_display
--------------------------------------+------------------+----------------------------------+----------------
 b0000000-0000-0000-0000-000000000092 |                2 | 2026-07-12 22:20:38.890733+05:30 | Priya Raman
 b0000000-0000-0000-0000-000000000093 |                1 | 2026-07-16 22:20:38.890733+05:30 | David Okafor
(2 rows)
```

Note this is *not* the same as `created_at < cursor` — `…0093` is newer than `…0092` in wall-clock terms but sorts after it because its severity is lower. OFFSET pagination would double-serve or skip rows as new signals arrive at the top of the feed; keyset does not.

## Index reliance

`EXPLAIN (COSTS OFF)` with `enable_seqscan=off` (the seed is 4 rows, so the planner otherwise seq-scans):

```
 Limit
   ->  Sort
         Sort Key: cl.severity_ordinal DESC, s.created_at DESC, s.id DESC
         ->  Nested Loop
               ->  Index Scan using idx_behaviour_signal_subsite_classification on behaviour_signal s
                     Index Cond: ((tenant_id = '…0001') AND (sub_site_id = '…0004'))
                     Filter: (status = 'final'::text)
               ->  Index Scan using pk_classification on classification cl
```

Relies on **`idx_behaviour_signal_subsite_classification (tenant_id, sub_site_id, classification_code, created_at DESC) WHERE deleted_at IS NULL`** — exists.

⚠️ **FLAG — index that does not yet exist.** The `Sort` node is unavoidable today: `severity_ordinal` lives on `classification`, so no index on `behaviour_signal` can supply the feed's primary sort key. At 4 rows this is free; at 100k signals per sub-site the feed does a full sort of the sub-site's history to return 20 rows, and keyset pagination stops helping because the cursor predicate cannot be pushed into the index either. Two options:

- **Denormalise** `severity_ordinal smallint` onto `behaviour_signal` (maintained by trigger from `classification`, which is a tiny static lookup that changes ~never), then add
  ```sql
  CREATE INDEX idx_behaviour_signal_feed_order
      ON behaviour_signal (tenant_id, sub_site_id, severity_ordinal DESC, created_at DESC, id DESC)
      WHERE deleted_at IS NULL AND status = 'final' AND moderation_state = 'visible';
  ```
  This makes the feed a pure index-order scan with the keyset predicate as an index condition.
- Or **three UNION ALL branches**, one per classification, each index-ordered and `LIMIT`ed, merged in order. No schema change, but the query gets ugly and the cursor logic has to track which branch it is in.

The denormalised column is the right call and should land before pilot. The `LEFT JOIN LATERAL` for the thumbnail is fine — it uses `idx_signal_media_signal (signal_id) WHERE deleted_at IS NULL`, one index probe per returned row, bounded by `LIMIT 20`.

---

# 2. "You're caught up" — WRK-013

Unseen-signal count for an `author_token`, via anti-join against `signal_read_state`. Read state is keyed by the **reader's** token, never a user id — which is what lets a guest and a logged-in worker use the same code path.

```sql
SELECT
    count(*)                 AS unseen_count,
    count(*) = 0             AS is_caught_up,
    max(cl.severity_ordinal) AS top_unseen_severity
FROM behaviour_signal s
JOIN classification cl ON cl.code = s.classification_code
LEFT JOIN signal_read_state rs
       ON rs.signal_id    = s.id
      AND rs.tenant_id    = s.tenant_id
      AND rs.author_token = 'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ'
WHERE s.tenant_id        = 'b0000000-0000-0000-0000-000000000001'
  AND s.site_id          = 'b0000000-0000-0000-0000-000000000003'
  AND s.status           = 'final'
  AND s.deleted_at       IS NULL
  AND s.moderation_state = 'visible'
  AND s.author_token    <> 'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ'   -- your own signals are not "news"
  AND rs.signal_id IS NULL;
```

**Executed output** (Priya, site-wide):

```
 unseen_count | is_caught_up | top_unseen_severity
--------------+--------------+---------------------
            1 |            f |                   1
(1 row)
```

Correct: Priya has read `…0091` and `…0094`, authored `…0092`, so the one unseen signal is `…0093` (good_practice, severity 1). `top_unseen_severity` is what drives the badge colour — a worker with an unseen red gets a different affordance from one with an unseen green.

The true case, same query scoped to the Primary Crusher Area where the only signal is one she has already read:

```sql
SELECT count(*) AS unseen_count, count(*) = 0 AS is_caught_up
FROM behaviour_signal s
LEFT JOIN signal_read_state rs
       ON rs.signal_id = s.id AND rs.tenant_id = s.tenant_id
      AND rs.author_token = 'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ'
WHERE s.tenant_id   = 'b0000000-0000-0000-0000-000000000001'
  AND s.sub_site_id = 'b0000000-0000-0000-0000-000000000005'
  AND s.status = 'final' AND s.deleted_at IS NULL
  AND s.moderation_state = 'visible'
  AND s.author_token <> 'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ'
  AND rs.signal_id IS NULL;
```

```
 unseen_count | is_caught_up
--------------+--------------
            0 |            t
(1 row)
```

**Index reliance.** `idx_behaviour_signal_tenant_site (tenant_id, site_id, created_at DESC) WHERE deleted_at IS NULL` for the driving scan; `pk_signal_read_state (author_token, signal_id)` for the anti-join probe — the PK column order is exactly right for this, one probe per candidate row. `idx_signal_read_state_tenant_token (tenant_id, author_token, seen_at DESC)` is the wrong shape for the anti-join but is what you want for "what have I seen recently". No missing index.

The anti-join scales with *unread depth*, not feed size, only if you also bound it by time. For a worker returning after three months, add `AND s.created_at >= now() - interval '30 days'` and cap the display at `99+`; nobody reads a 4,000-item backlog.

---

# 3. Feed filters — WRK-014

## By classification

The `ARRAY[…] IS NULL OR …` shape lets one prepared statement serve both the filtered and unfiltered cases with a single bound parameter.

```sql
SELECT s.id, cl.code AS classification, ss.name AS sub_site,
       CASE WHEN s.is_anonymous THEN 'Anonymous' ELSE COALESCE(au.display_name,'Anonymous') END AS author_display,
       s.created_at
FROM behaviour_signal s
JOIN classification cl ON cl.code = s.classification_code
LEFT JOIN sub_site ss ON ss.id = s.sub_site_id AND ss.tenant_id = s.tenant_id
LEFT JOIN app_user au ON au.id = s.author_user_id AND s.is_anonymous = false
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.status = 'final' AND s.deleted_at IS NULL AND s.moderation_state = 'visible'
  AND (ARRAY['be_aware','needs_attention_now']::text[] IS NULL
       OR s.classification_code = ANY (ARRAY['be_aware','needs_attention_now']::text[]))
  AND (NULL::uuid IS NULL OR s.sub_site_id = NULL::uuid)
ORDER BY cl.severity_ordinal DESC, s.created_at DESC, s.id DESC
LIMIT 20;
```

```
                  id                  |   classification    |       sub_site       | author_display |            created_at
--------------------------------------+---------------------+----------------------+----------------+----------------------------------
 b0000000-0000-0000-0000-000000000094 | needs_attention_now | Primary Crusher Area | Jo Mason       | 2026-07-19 22:20:38.890733+05:30
 b0000000-0000-0000-0000-000000000091 | be_aware            | Lifting Zone 3       | Anonymous      | 2026-07-21 19:20:38.890733+05:30
 b0000000-0000-0000-0000-000000000092 | be_aware            | Lifting Zone 3       | Priya Raman    | 2026-07-12 22:20:38.890733+05:30
(3 rows)
```

The good_practice signal is correctly excluded; the anonymous one still renders as `Anonymous` under a filter.

## By sub-site, including descendants

`sub_site.parent_sub_site_id` is self-referential (with a depth cap enforced by `sub_site_enforce_depth_cap()`), so "signals in Lifting Zone 3" must mean "and everything nested under it" or a supervisor filtering to a zone silently loses its bays.

```sql
WITH RECURSIVE scope AS (
    SELECT ss.id
      FROM sub_site ss
     WHERE ss.tenant_id = 'b0000000-0000-0000-0000-000000000001'
       AND ss.id        = 'b0000000-0000-0000-0000-000000000004'
       AND ss.deleted_at IS NULL
    UNION ALL
    SELECT c.id
      FROM sub_site c
      JOIN scope p ON c.parent_sub_site_id = p.id
     WHERE c.tenant_id = 'b0000000-0000-0000-0000-000000000001'
       AND c.deleted_at IS NULL
)
SELECT s.id, cl.code AS classification, ss.name AS sub_site, s.created_at
FROM behaviour_signal s
JOIN classification cl ON cl.code = s.classification_code
JOIN scope    sc ON sc.id = s.sub_site_id
JOIN sub_site ss ON ss.id = s.sub_site_id AND ss.tenant_id = s.tenant_id
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.status = 'final' AND s.deleted_at IS NULL AND s.moderation_state = 'visible'
ORDER BY cl.severity_ordinal DESC, s.created_at DESC, s.id DESC;
```

```
                  id                  | classification |    sub_site    |            created_at
--------------------------------------+----------------+----------------+----------------------------------
 b0000000-0000-0000-0000-000000000091 | be_aware       | Lifting Zone 3 | 2026-07-21 19:20:38.890733+05:30
 b0000000-0000-0000-0000-000000000092 | be_aware       | Lifting Zone 3 | 2026-07-12 22:20:38.890733+05:30
 b0000000-0000-0000-0000-000000000093 | good_practice  | Lifting Zone 3 | 2026-07-16 22:20:38.890733+05:30
(3 rows)
```

The seed hierarchy is flat, so the recursive term contributes nothing here — the query is correct but under-exercised by the demo data. Worth adding a child sub-site to the seed so this branch is actually covered.

**Index reliance.** `idx_behaviour_signal_subsite_classification` (classification filter is the third column, so it is usable as an index condition once `sub_site_id` is fixed); `idx_sub_site_parent (parent_sub_site_id) WHERE parent_sub_site_id IS NOT NULL AND deleted_at IS NULL` drives the recursion. Both exist.

⚠️ **FLAG.** The *unfiltered-by-sub-site* classification filter falls back to `idx_behaviour_signal_feed (tenant_id, status, visibility, created_at DESC)` and then filters `classification_code` on the heap. Acceptable — `needs_attention_now` is the rare, selective case and it is the one people filter to. No new index needed unless tenant-wide classification filtering becomes a hot path.

---

# 4. QR resolution — Dev Pack Sec 8

Token → context → all destinations in **one** query, one round trip (Architecture Sec 6.2). The trick is driving from a `VALUES` row rather than from `qr_code`, so the query returns exactly one row *even for a token that does not exist* — which is what lets the API distinguish "unknown" from "revoked" from "resolved" without a second lookup or a NOT FOUND branch.

```sql
SELECT
    t.token AS scanned_token,
    CASE
      WHEN q.id IS NULL              THEN 'unknown'
      WHEN q.deleted_at IS NOT NULL  THEN 'unknown'      -- deleted reads as never-existed
      WHEN q.status = 'revoked'      THEN 'revoked'
      WHEN q.status <> 'active'      THEN 'inactive'     -- draft / inactive sticker
      WHEN c.id IS NULL
        OR c.status <> 'active'
        OR c.deleted_at IS NOT NULL  THEN 'unconfigured'
      ELSE 'resolved'
    END AS resolution,
    q.id AS qr_code_id, q.label AS qr_label, q.revoked_at, q.revoked_reason,
    c.id AS qr_context_id, c.name AS context_name, c.context_version,
    c.default_destination, c.destinations,
    c.task_type_code, tt.label AS task_type_label,
    c.risk_type_code, rt.label AS risk_type_label,
    si.id AS site_id, si.name AS site_name, si.timezone,
    ss.id AS sub_site_id, ss.name AS sub_site_name,
    a.id  AS asset_id,  a.name  AS asset_name, a.asset_type,
    pt.id AS pulse_template_id, pt.name  AS pulse_name,        pt.status AS pulse_status,
    rp.id AS rescue_plan_id,    rp.title AS rescue_plan_title,  rp.status AS rescue_status,
    li.id AS learn5_item_id,    li.title AS learn5_title,       li.estimated_seconds
FROM (VALUES (:token::bpchar)) AS t(token)
LEFT JOIN qr_code        q  ON q.token = t.token
LEFT JOIN qr_context     c  ON c.id  = q.qr_context_id     AND c.tenant_id = q.tenant_id AND c.deleted_at IS NULL
LEFT JOIN site           si ON si.id = c.site_id           AND si.tenant_id = c.tenant_id AND si.deleted_at IS NULL
LEFT JOIN sub_site       ss ON ss.id = c.sub_site_id       AND ss.tenant_id = c.tenant_id AND ss.deleted_at IS NULL
LEFT JOIN asset          a  ON a.id  = c.asset_id          AND a.tenant_id  = c.tenant_id AND a.deleted_at IS NULL
LEFT JOIN pulse_template pt ON pt.id = c.pulse_template_id AND pt.deleted_at IS NULL
LEFT JOIN rescue_plan    rp ON rp.id = c.rescue_plan_id    AND rp.tenant_id = c.tenant_id AND rp.deleted_at IS NULL
LEFT JOIN learn5_item    li ON li.id = c.learn5_item_id    AND li.deleted_at IS NULL
LEFT JOIN task_type      tt ON tt.code = c.task_type_code
LEFT JOIN risk_type      rt ON rt.code = c.risk_type_code;
```

**Executed output** for `HJ7K3M9PQR2X` (`-x` expanded):

```
scanned_token       | HJ7K3M9PQR2X
resolution          | resolved
qr_code_id          | b0000000-0000-0000-0000-000000000072
qr_label            | Lifting Zone 3 entry barrier
revoked_at          |
revoked_reason      |
qr_context_id       | b0000000-0000-0000-0000-000000000071
context_name        | Heavy lift - Lifting Zone 3 (SB-14)
context_version     | 3
default_destination | pulse
destinations        | [{"ref": "…0041", "type": "pulse", "label": "PULSE - Heavy Lift", "default": true},
                       {"ref": "…0061", "type": "rescue_plan", "label": "Rescue Plan"},
                       {"ref": "…0051", "type": "learn5", "label": "Suspended loads and pinch points"},
                       {"type": "feed", "label": "What is being shared here"}]
task_type_code      | heavy_lift          task_type_label | Heavy Lift
risk_type_code      | suspended_load      risk_type_label | Suspended Load
site_id             | b0000000-…-000000000003   site_name     | Brackley North Quarry   timezone | Europe/London
sub_site_id         | b0000000-…-000000000004   sub_site_name | Lifting Zone 3
asset_id            | b0000000-…-000000000006   asset_name    | Spreader Beam SB-14 (custom lifting fixture)  asset_type | fixture
pulse_template_id   | b0000000-…-000000000041   pulse_name    | Heavy Lift PULSE        pulse_status  | active
rescue_plan_id      | b0000000-…-000000000061   rescue_plan_title | Lifting Zone 3 - dropped or unstable load  rescue_status | published
learn5_item_id      | b0000000-…-000000000051   learn5_title  | Suspended loads and pinch points  estimated_seconds | 150
```

One scan, one round trip, and the client has everything to render the PULSE *and* pre-fill the signal's context if the worker reports.

## Revoked vs unknown

The seed has only one QR code, and it is active. To exercise all three arms the revoked sticker is inserted and rolled back:

```sql
BEGIN;
SELECT set_config('app.tenant_id','b0000000-0000-0000-0000-000000000001',true);
INSERT INTO qr_code (id, tenant_id, token, label, status, revoked_at, revoked_reason)
VALUES ('b0000000-0000-0000-0000-0000000000f1','b0000000-0000-0000-0000-000000000001',
        'ZZ9K3M9PQR2X','Retired sticker - Lifting Zone 3 gate','revoked',
        now() - interval '30 days','sticker_replaced');

SELECT t.token AS scanned_token,
       CASE
         WHEN q.id IS NULL OR q.deleted_at IS NOT NULL THEN 'unknown'
         WHEN q.status = 'revoked'  THEN 'revoked'
         WHEN q.status <> 'active'  THEN 'inactive'
         WHEN c.id IS NULL OR c.status <> 'active' THEN 'unconfigured'
         ELSE 'resolved'
       END AS resolution,
       q.revoked_at, q.revoked_reason,
       c.name AS context_name, c.default_destination,
       si.name AS site_name, ss.name AS sub_site_name, a.name AS asset_name,
       pt.name AS pulse_name, rp.title AS rescue_plan_title, li.title AS learn5_title
FROM (VALUES ('HJ7K3M9PQR2X'::bpchar), ('ZZ9K3M9PQR2X'), ('AAAAAAAAAAAA')) AS t(token)
LEFT JOIN qr_code q ON q.token = t.token
LEFT JOIN qr_context     c  ON c.id  = q.qr_context_id     AND c.tenant_id = q.tenant_id AND c.deleted_at IS NULL
LEFT JOIN site           si ON si.id = c.site_id           AND si.tenant_id = c.tenant_id AND si.deleted_at IS NULL
LEFT JOIN sub_site       ss ON ss.id = c.sub_site_id       AND ss.tenant_id = c.tenant_id AND ss.deleted_at IS NULL
LEFT JOIN asset          a  ON a.id  = c.asset_id          AND a.tenant_id  = c.tenant_id AND a.deleted_at IS NULL
LEFT JOIN pulse_template pt ON pt.id = c.pulse_template_id AND pt.deleted_at IS NULL
LEFT JOIN rescue_plan    rp ON rp.id = c.rescue_plan_id    AND rp.tenant_id = c.tenant_id AND rp.deleted_at IS NULL
LEFT JOIN learn5_item    li ON li.id = c.learn5_item_id    AND li.deleted_at IS NULL
ORDER BY 1;
ROLLBACK;
```

**Executed output:**

```
 scanned_token | resolution |            revoked_at            |  revoked_reason  |            context_name             | default_destination |       site_name       | sub_site_name  |                  asset_name                  |    pulse_name    |             rescue_plan_title             |           learn5_title
---------------+------------+----------------------------------+------------------+-------------------------------------+---------------------+-----------------------+----------------+----------------------------------------------+------------------+-------------------------------------------+----------------------------------
 AAAAAAAAAAAA  | unknown    |                                  |                  |                                     |                     |                       |                |                                              |                  |                                           |
 HJ7K3M9PQR2X  | resolved   |                                  |                  | Heavy lift - Lifting Zone 3 (SB-14) | pulse               | Brackley North Quarry | Lifting Zone 3 | Spreader Beam SB-14 (custom lifting fixture) | Heavy Lift PULSE | Lifting Zone 3 - dropped or unstable load | Suspended loads and pinch points
 ZZ9K3M9PQR2X  | revoked    | 2026-06-21 22:26:48.292895+05:30 | sticker_replaced |                                     |                     |                       |                |                                              |                  |                                           |
(3 rows)
ROLLBACK
```

**The distinction and why it matters.** `unknown` means `qr_code` has no row for that token — a typo, a competitor's sticker, or a scanner probing the token space. `revoked` means the row exists and carries `revoked_at` + `revoked_reason`. The UX differs sharply: unknown gets "This code isn't a SafeIn5 code"; revoked gets "This sticker has been retired — replaced 30 days ago" plus a path to the site feed, because the person is demonstrably standing in the right physical place. Collapsing both to 404 loses that.

⚠️ **Security note on `unknown`.** Return the same response shape and, ideally, the same latency for `unknown` as for the others, and rate-limit by IP. `qr_code.token` is 12 Crockford base-32 characters — a large space, but the resolve endpoint is unauthenticated by design and an enumeration oracle would leak the site's sticker inventory.

**Index reliance.** `uq_qr_code_token` UNIQUE on `(token)` — a single index probe, then seven PK lookups on `pk_qr_context`, `pk_site`, `pk_sub_site`, `pk_asset`, `pk_pulse_template`, `pk_rescue_plan`, `pk_learn5_item`, plus two on the tiny `task_type`/`risk_type` lookups. All exist. This query is ~10 index probes regardless of database size, which is what makes the sub-second scan-to-PULSE target achievable.

---

# 5. Repeat usage — THE primary success metric

Counted via `author_token`, never via `author_user_id`. This is the whole reason the token exists: a repeat reporter who submits once anonymously and once attributed is **one** person, and a metric keyed on `author_user_id` would count them as half a person. It also works unchanged for guest submissions, which have no user row at all.

```sql
WITH per_author AS (
    SELECT s.author_token, count(*) AS signal_count
      FROM behaviour_signal s
     WHERE s.tenant_id  = 'b0000000-0000-0000-0000-000000000001'
       AND s.status     = 'final'
       AND s.deleted_at IS NULL
       AND s.finalised_at >= now() - interval '90 days'
     GROUP BY s.author_token
)
SELECT count(*)                                        AS distinct_authors,
       count(*) FILTER (WHERE signal_count > 1)        AS repeat_authors,
       round(100.0 * count(*) FILTER (WHERE signal_count > 1)
             / NULLIF(count(*),0), 1)                  AS repeat_rate_pct,
       sum(signal_count)                               AS total_final_signals
FROM per_author;
```

```
 distinct_authors | repeat_authors | repeat_rate_pct | total_final_signals
------------------+----------------+-----------------+---------------------
                3 |              1 |            33.3 |                   4
(1 row)
```

Who the repeat author is — and the proof the metric survives anonymity:

```sql
SELECT s.author_token, count(*) AS signal_count,
       min(s.finalised_at) AS first_signal, max(s.finalised_at) AS latest_signal,
       bool_or(s.is_anonymous) AS has_anonymous_submission
FROM behaviour_signal s
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.status = 'final' AND s.deleted_at IS NULL
GROUP BY s.author_token
HAVING count(*) > 1
ORDER BY signal_count DESC;
```

```
           author_token           | signal_count |           first_signal           |          latest_signal           | has_anonymous_submission
----------------------------------+--------------+----------------------------------+----------------------------------+--------------------------
 J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ |            2 | 2026-07-19 22:21:16.890733+05:30 | 2026-07-21 19:21:36.890733+05:30 | t
(1 row)
```

That is exactly the case the design was built for: two signals, one anonymous (`…0091`) and one attributed (`…0094`), correctly counted as **one** repeat author. Literal metadata stripping — the naive approach to anonymity — would have destroyed this number.

## Per-week cohort version

Cohort = the week of the author's first-ever final signal. `returned_a_later_week` is the retention signal that actually matters (two signals in one shift is one burst of enthusiasm; a signal this week and one next week is a habit).

```sql
WITH finals AS (
    SELECT s.author_token,
           date_trunc('week', s.finalised_at AT TIME ZONE 'Europe/London') AS wk
      FROM behaviour_signal s
     WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
       AND s.status = 'final' AND s.deleted_at IS NULL
), cohort AS (
    SELECT author_token, min(wk) AS cohort_week,
           count(DISTINCT wk) AS active_weeks, count(*) AS lifetime_signals
      FROM finals GROUP BY author_token
)
SELECT cohort_week::date                                AS cohort_week,
       count(*)                                         AS new_authors,
       count(*) FILTER (WHERE lifetime_signals > 1)     AS repeated_ever,
       count(*) FILTER (WHERE active_weeks   > 1)       AS returned_a_later_week,
       round(100.0 * count(*) FILTER (WHERE lifetime_signals > 1)
             / NULLIF(count(*),0), 1)                   AS repeat_rate_pct
FROM cohort
GROUP BY cohort_week
ORDER BY cohort_week;
```

```
 cohort_week | new_authors | repeated_ever | returned_a_later_week | repeat_rate_pct
-------------+-------------+---------------+-----------------------+-----------------
 2026-07-06  |           1 |             0 |                     0 |             0.0
 2026-07-13  |           2 |             1 |                     1 |            50.0
(2 rows)
```

The `AT TIME ZONE 'Europe/London'` matters: `date_trunc('week', …)` on a `timestamptz` uses the *server* timezone, and the demo server is on `+05:30`. A night-shift signal at 23:00 local would land in the wrong week without the explicit conversion. Use `site.timezone` (`Europe/London` here) rather than a hardcoded literal in the real report.

Weekly activity, same discipline:

```sql
SELECT date_trunc('week', s.finalised_at AT TIME ZONE 'Europe/London')::date AS week,
       count(*)                        AS signals,
       count(DISTINCT s.author_token)  AS active_authors,
       round(count(*)::numeric / NULLIF(count(DISTINCT s.author_token),0), 2) AS signals_per_author
FROM behaviour_signal s
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.status = 'final' AND s.deleted_at IS NULL
GROUP BY 1 ORDER BY 1;
```

```
    week    | signals | active_authors | signals_per_author
------------+---------+----------------+--------------------
 2026-07-06 |       1 |              1 |               1.00
 2026-07-13 |       2 |              2 |               1.00
 2026-07-20 |       1 |              1 |               1.00
(3 rows)
```

⚠️ **FLAG — index that does not yet exist.** `idx_behaviour_signal_author_token` is `(author_token, created_at DESC)` with **no `tenant_id` and no partial predicate on `status`**. It is built for "this token's own history" (the GDPR export, the my-signals view), not for a tenant-wide aggregation. This query therefore seq-scans the tenant's signals. Two problems compound at scale:

- the metric filters on **`finalised_at`**, and *no index anywhere on `behaviour_signal` mentions `finalised_at` or `occurred_at`* — every index uses `created_at`;
- there is no `tenant_id` leading column, so the aggregation cannot be confined to one tenant by index.

Recommend:
```sql
CREATE INDEX idx_behaviour_signal_repeat_usage
    ON behaviour_signal (tenant_id, author_token, finalised_at)
    WHERE status = 'final' AND deleted_at IS NULL;
```
This is a covering index for both the aggregate and the cohort CTE. If repeat-usage becomes a dashboard tile rendered on every page load, promote it to a materialized view refreshed hourly instead — the number does not need to be live to the second.

---

# 6. The flagship supervisor insight

*"3 similar Be Aware signals in 2 weeks, all on custom lifting fixtures."*

This is the query the whole product demo rests on, and it is the reason `asset` is a table with a foreign key rather than a free-text field. `GROUP BY asset_id` is exact; grouping by a text description would be fuzzy string matching that fails the moment someone types "SB14" instead of "SB-14".

```sql
SELECT a.id            AS asset_id,
       a.name          AS asset_name,
       a.asset_type,
       ss.name         AS sub_site_name,
       s.risk_type_code,
       rt.label        AS risk_label,
       count(*)                               AS signal_count,
       count(DISTINCT s.author_token)         AS distinct_reporters,
       count(*) FILTER (WHERE s.is_anonymous) AS anonymous_count,
       min(s.occurred_at)                     AS window_first,
       max(s.occurred_at)                     AS window_latest,
       array_agg(s.id ORDER BY s.occurred_at DESC) AS signal_ids
FROM behaviour_signal s
JOIN asset a  ON a.id  = s.asset_id  AND a.tenant_id = s.tenant_id
LEFT JOIN sub_site  ss ON ss.id = s.sub_site_id AND ss.tenant_id = s.tenant_id
LEFT JOIN risk_type rt ON rt.code = s.risk_type_code
WHERE s.tenant_id           = 'b0000000-0000-0000-0000-000000000001'
  AND s.classification_code = 'be_aware'
  AND s.status              = 'final'
  AND s.deleted_at          IS NULL
  AND s.moderation_state    = 'visible'
  AND s.occurred_at         >= now() - interval '14 days'   -- rolling window
GROUP BY a.id, a.name, a.asset_type, ss.name, s.risk_type_code, rt.label
HAVING count(*) >= 2                                        -- the alert threshold
ORDER BY signal_count DESC, window_latest DESC;
```

**Executed output:**

```
               asset_id               |                  asset_name                  | asset_type | sub_site_name  | risk_type_code |   risk_label   | signal_count | distinct_reporters | anonymous_count |           window_first           |          window_latest           |                                 signal_ids
--------------------------------------+----------------------------------------------+------------+----------------+----------------+----------------+--------------+--------------------+-----------------+----------------------------------+----------------------------------+-----------------------------------------------------------------------------
 b0000000-0000-0000-0000-000000000006 | Spreader Beam SB-14 (custom lifting fixture) | fixture    | Lifting Zone 3 | suspended_load | Suspended Load |            2 |                  2 |               1 | 2026-07-12 22:20:38.890733+05:30 | 2026-07-21 19:20:38.890733+05:30 | {b0000000-…-000000000091,b0000000-…-000000000092}
(1 row)
```

⚠️ **The seed produces 2, not 3.** `0008_seed_demo.sql` contains exactly two `be_aware` signals (`…0091` anonymous, `…0092` attributed), both on SB-14. The seed's own comment on `…0092` calls it *"the second of the 3 similar Be Aware signals"* — the third was never written. **The demo script says "3" and the database says 2.** Fix the seed before any customer demo; adding one more `be_aware` on asset `…0006` is a five-line insert.

Proof the query produces the headline once the data matches the story (third signal inserted and rolled back):

```sql
BEGIN;
SELECT set_config('app.tenant_id','b0000000-0000-0000-0000-000000000001',true);
INSERT INTO behaviour_signal
 (id, tenant_id, status, visibility, author_token, author_user_id, is_anonymous,
  classification_code, classified_at, classification_latency_ms, capture_latency_ms,
  body_text, body_source, site_id, sub_site_id, asset_id,
  task_type_code, risk_type_code, occurred_at, finalised_at, created_at, entry_point)
VALUES
 ('b0000000-0000-0000-0000-0000000000c3','b0000000-0000-0000-0000-000000000001','final','site',
  'M7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ','b0000000-0000-0000-0000-000000000013',false,
  'be_aware', now() - interval '5 days', 3900, 37000,
  'Tag line on the SB-14 spreader beam frayed; handler had to reach under the load.','typed',
  'b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000006','heavy_lift','suspended_load',
  now() - interval '5 days', now() - interval '5 days', now() - interval '5 days','qr');

SELECT a.name AS asset_name, a.asset_type, s.risk_type_code,
       count(*) AS signal_count, count(DISTINCT s.author_token) AS distinct_reporters,
       count(*) FILTER (WHERE s.is_anonymous) AS anonymous_count,
       (max(s.occurred_at)::date - min(s.occurred_at)::date) AS span_days
FROM behaviour_signal s
JOIN asset a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.classification_code = 'be_aware' AND s.status = 'final'
  AND s.deleted_at IS NULL AND s.occurred_at >= now() - interval '14 days'
GROUP BY a.name, a.asset_type, s.risk_type_code
HAVING count(*) >= 3;
ROLLBACK;
```

```
                  asset_name                  | asset_type | risk_type_code | signal_count | distinct_reporters | anonymous_count | span_days
----------------------------------------------+------------+----------------+--------------+--------------------+-----------------+-----------
 Spreader Beam SB-14 (custom lifting fixture) | fixture    | suspended_load |            3 |                  3 |               1 |         9
(1 row)
ROLLBACK
```

3 signals, 3 distinct reporters, 9 days, one anonymous. That is the slide.

`distinct_reporters` is the credibility multiplier and it is only computable because `author_token` survives anonymisation — three different people flagging the same fixture is a pattern, one person flagging it three times is a grievance, and a supervisor needs to tell those apart. `anonymous_count` is the other half of the story: it shows the anonymous channel is *producing* the insight, not diluting it.

## The "all on custom lifting fixtures" rollup

The class-level claim, one level up from the individual asset:

```sql
SELECT a.asset_type, s.risk_type_code, count(*) AS be_aware_count,
       count(DISTINCT a.id) AS distinct_assets, count(DISTINCT s.author_token) AS distinct_reporters
FROM behaviour_signal s
JOIN asset a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.classification_code = 'be_aware'
  AND s.status = 'final' AND s.deleted_at IS NULL
  AND s.occurred_at >= now() - interval '14 days'
GROUP BY a.asset_type, s.risk_type_code
ORDER BY be_aware_count DESC;
```

```
 asset_type | risk_type_code | be_aware_count | distinct_assets | distinct_reporters
------------+----------------+----------------+-----------------+--------------------
 fixture    | suspended_load |              2 |               1 |                  2
(1 row)
```

This is the version that generalises: once the quarry has six spreader beams and four lifting frames, `GROUP BY asset_type` is what surfaces "your custom fixtures as a class are generating signals", which is a procurement conversation, not a maintenance ticket.

**Index reliance.** `idx_behaviour_signal_asset (tenant_id, asset_id, created_at DESC) WHERE deleted_at IS NULL AND asset_id IS NOT NULL`, and `idx_behaviour_signal_taxonomy (tenant_id, risk_type_code, task_type_code, created_at DESC)` for the risk-type variant. Both exist.

⚠️ **FLAG — the rolling window is unindexed.** The query filters `occurred_at >= now() - interval '14 days'`, and **there is no index on `occurred_at` anywhere on `behaviour_signal`** (verified: `SELECT indexname FROM pg_indexes WHERE tablename='behaviour_signal' AND (indexdef LIKE '%occurred_at%' OR indexdef LIKE '%finalised_at%')` returns 0 rows). Every index uses `created_at`. `occurred_at` and `created_at` are *deliberately different columns* — `occurred_at` is when the thing happened on site, `created_at` is when the row was written, and they diverge for offline-captured signals that sync hours later. Using `created_at` in the insight query would be wrong: an offline signal from last Tuesday would land in this week's window.

So the window predicate is a heap filter today. Add:
```sql
CREATE INDEX idx_behaviour_signal_insight
    ON behaviour_signal (tenant_id, classification_code, occurred_at DESC)
    WHERE deleted_at IS NULL AND status = 'final' AND moderation_state = 'visible';
```
This is the highest-value missing index in the schema — it serves the flagship insight, the classification dashboard tile, and any rolling-window trend report.

---

# 7. Dashboard aggregates — ADM-004 / 005 / 038 / 039

## ADM-004 — Classification counts

Driven **from** `classification` with a `LEFT JOIN` so a classification with zero signals still returns a `0` row. Aggregating from `behaviour_signal` would silently drop the empty bucket and the dashboard would render two tiles instead of three.

```sql
SELECT cl.code, cl.label, cl.colour_token, cl.severity_ordinal,
       count(s.id)                                                             AS total,
       count(s.id) FILTER (WHERE s.finalised_at >= now() - interval '7 days')   AS last_7d,
       count(s.id) FILTER (WHERE s.finalised_at >= now() - interval '30 days')  AS last_30d,
       count(s.id) FILTER (WHERE s.is_anonymous)                                AS anonymous
FROM classification cl
LEFT JOIN behaviour_signal s
       ON s.classification_code = cl.code
      AND s.tenant_id  = 'b0000000-0000-0000-0000-000000000001'
      AND s.status     = 'final'
      AND s.deleted_at IS NULL
WHERE cl.is_active
GROUP BY cl.code, cl.label, cl.colour_token, cl.severity_ordinal, cl.sort_order
ORDER BY cl.sort_order;
```

```
        code         |        label        | colour_token | severity_ordinal | total | last_7d | last_30d | anonymous
---------------------+---------------------+--------------+------------------+-------+---------+----------+-----------
 good_practice       | Good Practice       | green        |                1 |     1 |       1 |        1 |         0
 be_aware            | Be Aware            | amber        |                2 |     2 |       1 |        2 |         1
 needs_attention_now | Needs Attention Now | red          |                3 |     1 |       1 |        1 |         0
(3 rows)
```

Note the tenant predicate sits **in the `ON` clause**, not the `WHERE`. In the `WHERE` it would convert the outer join to an inner join and reintroduce the missing-bucket bug.

## ADM-005 — Recent activity

```sql
SELECT s.id AS signal_id, cl.label AS classification, cl.severity_ordinal,
       CASE WHEN s.is_anonymous THEN 'Anonymous' ELSE COALESCE(au.display_name,'Anonymous') END AS author_display,
       left(s.body_text,50) AS body_preview,
       ss.name AS sub_site_name, a.name AS asset_name,
       s.media_state, s.workflow_state, s.finalised_at, s.occurred_at
FROM behaviour_signal s
JOIN classification cl ON cl.code = s.classification_code
LEFT JOIN app_user au ON au.id = s.author_user_id AND s.is_anonymous = false
LEFT JOIN sub_site ss ON ss.id = s.sub_site_id AND ss.tenant_id = s.tenant_id
LEFT JOIN asset a     ON a.id  = s.asset_id     AND a.tenant_id  = s.tenant_id
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.status = 'final' AND s.deleted_at IS NULL AND s.moderation_state = 'visible'
ORDER BY s.finalised_at DESC
LIMIT 10;
```

```
              signal_id               |   classification    | severity_ordinal | author_display |                    body_preview                    |    sub_site_name     |                  asset_name                  | media_state | workflow_state |           finalised_at
--------------------------------------+---------------------+------------------+----------------+----------------------------------------------------+----------------------+----------------------------------------------+-------------+----------------+----------------------------------
 b0000000-0000-0000-0000-000000000091 | Be Aware            |                2 | Anonymous      | Shackle pin on SB-14 is not the pin listed on the   | Lifting Zone 3       | Spreader Beam SB-14 (custom lifting fixture) | ready       |                | 2026-07-21 19:21:36.890733+05:30
 b0000000-0000-0000-0000-000000000094 | Needs Attention Now |                3 | Jo Mason       | Sling stored on the crusher walkway is frayed at t  | Primary Crusher Area |                                              | none        | acknowledged   | 2026-07-19 22:21:16.890733+05:30
 b0000000-0000-0000-0000-000000000093 | Good Practice       |                1 | David Okafor   | Night crew barriered the full 15 m exclusion zone   | Lifting Zone 3       | Spreader Beam SB-14 (custom lifting fixture) | none        |                | 2026-07-16 22:21:03.890733+05:30
 b0000000-0000-0000-0000-000000000092 | Be Aware            |                2 | Priya Raman    | SWL plate on the spreader beam is worn and hard to  | Lifting Zone 3       | Spreader Beam SB-14 (custom lifting fixture) | none        |                | 2026-07-12 22:21:13.890733+05:30
(4 rows)
```

The admin console gets the **same** anonymity `CASE` as the worker feed. There is no elevated "admin can see who" view anywhere in this cookbook, and there should not be one — an admin-only reveal would be visible to workers within a week of the first person being spoken to about "their" anonymous report, and the channel would die.

## ADM-038 — Per-site engagement

```sql
SELECT si.id AS site_id, si.name AS site_name,
       count(DISTINCT s.id)                                  AS signals_30d,
       count(DISTINCT s.author_token)                        AS active_authors_30d,
       count(DISTINCT s.id) FILTER (WHERE s.classification_code='needs_attention_now') AS red_30d,
       (SELECT count(*) FROM qr_scan_event q
         WHERE q.tenant_id = si.tenant_id
           AND q.occurred_at >= now() - interval '30 days'
           AND q.qr_context_id IN (SELECT c.id FROM qr_context c WHERE c.site_id = si.id)) AS qr_scans_30d,
       (SELECT count(*) FROM pulse_session p
         WHERE p.tenant_id = si.tenant_id AND p.site_id = si.id
           AND p.started_at >= now() - interval '30 days')   AS pulse_sessions_30d,
       (SELECT count(*) FROM user_site_assignment usa
         WHERE usa.site_id = si.id AND usa.unassigned_at IS NULL AND usa.deleted_at IS NULL) AS assigned_users,
       max(s.finalised_at)                                   AS last_signal_at
FROM site si
LEFT JOIN behaviour_signal s
       ON s.site_id = si.id AND s.tenant_id = si.tenant_id
      AND s.status = 'final' AND s.deleted_at IS NULL
      AND s.finalised_at >= now() - interval '30 days'
WHERE si.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND si.deleted_at IS NULL
GROUP BY si.id, si.tenant_id, si.name
ORDER BY signals_30d DESC;
```

```
               site_id                |       site_name       | signals_30d | active_authors_30d | red_30d | qr_scans_30d | pulse_sessions_30d | assigned_users |          last_signal_at
--------------------------------------+-----------------------+-------------+--------------------+---------+--------------+--------------------+----------------+----------------------------------
 b0000000-0000-0000-0000-000000000003 | Brackley North Quarry |           4 |                  3 |       1 |            1 |                  1 |              3 | 2026-07-21 19:21:36.890733+05:30
(1 row)
```

`active_authors_30d / assigned_users` is the engagement ratio that identifies a site where the QR codes went up and nothing happened — the single most actionable number in a multi-site rollout.

## ADM-039 — Active users

`author_token` again, unioned across all four activity surfaces, so a worker who scanned and read Learn5 but did not report still counts as active.

```sql
SELECT
  (SELECT count(*) FROM user_tenant_membership m
    WHERE m.tenant_id='b0000000-0000-0000-0000-000000000001'
      AND m.status='active' AND m.deleted_at IS NULL)                      AS active_memberships,
  (SELECT count(DISTINCT s.author_token) FROM behaviour_signal s
    WHERE s.tenant_id='b0000000-0000-0000-0000-000000000001'
      AND s.status='final' AND s.deleted_at IS NULL
      AND s.finalised_at >= now() - interval '30 days')                    AS mau_signal_authors,
  (SELECT count(DISTINCT t.author_token) FROM (
        SELECT author_token FROM behaviour_signal
          WHERE tenant_id='b0000000-…-000000000001' AND created_at  >= now()-interval '30 days'
        UNION SELECT author_token FROM qr_scan_event
          WHERE tenant_id='b0000000-…-000000000001' AND occurred_at >= now()-interval '30 days'
        UNION SELECT author_token FROM pulse_session
          WHERE tenant_id='b0000000-…-000000000001' AND started_at  >= now()-interval '30 days'
        UNION SELECT author_token FROM learn5_view
          WHERE tenant_id='b0000000-…-000000000001' AND started_at  >= now()-interval '30 days'
      ) t)                                                                 AS mau_any_activity,
  (SELECT count(*) FROM guest_session g
    WHERE g.tenant_id='b0000000-0000-0000-0000-000000000001'
      AND g.last_seen_at >= now() - interval '30 days')                    AS active_guest_sessions;
```

(Run with the tenant UUID written out in full; abbreviated above for width.)

```
 active_memberships | mau_signal_authors | mau_any_activity | active_guest_sessions
--------------------+--------------------+------------------+-----------------------
                  3 |                  3 |                3 |                     0
(1 row)
```

`mau_any_activity` can legitimately **exceed** `active_memberships`: guest sessions have tokens and no membership. That is a feature (contractors scanning a code without signing up), not a bug in the query.

**Index reliance.** `idx_user_tenant_membership_tenant_status`, `idx_guest_session_tenant_last_seen_at`, `idx_qr_scan_event_tenant_occurred`, `idx_pulse_session_tenant_started`, `idx_learn5_view_source (tenant_id, source, started_at DESC)`. All exist and all lead with `tenant_id`. ⚠️ The `behaviour_signal` arm of the UNION again has no `finalised_at` index — same gap as §5, same fix.

---

# 8. Supervisor queue

Open review tasks with age, joined to signal + site, ordered by severity then age. `state <> 'closed'` rather than `state = 'open'` — an acknowledged-but-not-closed task is still the supervisor's problem, and it is exactly the "report black hole" state the product exists to eliminate.

```sql
SELECT rt.id AS review_task_id, rt.state,
       cl.label AS classification, cl.severity_ordinal,
       si.name AS site_name, ss.name AS sub_site_name, a.name AS asset_name,
       CASE WHEN s.is_anonymous THEN 'Anonymous' ELSE COALESCE(au.display_name,'Anonymous') END AS author_display,
       left(s.body_text,45) AS body_preview,
       rt.created_at,
       date_trunc('second', now() - rt.created_at)                 AS age,
       round(extract(epoch FROM now() - rt.created_at)/3600.0, 1)  AS age_hours,
       rt.due_at,
       (rt.due_at IS NOT NULL AND rt.due_at < now())               AS is_overdue,
       rt.first_response_ms,
       ack.display_name                                            AS acknowledged_by
FROM review_task rt
JOIN behaviour_signal s ON s.id = rt.signal_id AND s.tenant_id = rt.tenant_id
JOIN classification cl  ON cl.code = s.classification_code
LEFT JOIN site     si ON si.id = s.site_id      AND si.tenant_id = s.tenant_id
LEFT JOIN sub_site ss ON ss.id = s.sub_site_id  AND ss.tenant_id = s.tenant_id
LEFT JOIN asset    a  ON a.id  = s.asset_id     AND a.tenant_id  = s.tenant_id
LEFT JOIN app_user au ON au.id = s.author_user_id AND s.is_anonymous = false
LEFT JOIN user_tenant_membership ackm ON ackm.id = rt.acknowledged_by_membership_id
LEFT JOIN app_user ack ON ack.id = ackm.user_id
WHERE rt.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND rt.deleted_at IS NULL
  AND rt.state <> 'closed'
ORDER BY cl.severity_ordinal DESC, rt.created_at ASC;
```

```
            review_task_id            |    state     |   classification    | severity_ordinal |       site_name       |    sub_site_name     | asset_name | author_display |                 body_preview                  |            created_at            |       age       | age_hours |              due_at              | is_overdue | first_response_ms | acknowledged_by
--------------------------------------+--------------+---------------------+------------------+-----------------------+----------------------+------------+----------------+-----------------------------------------------+----------------------------------+-----------------+-----------+----------------------------------+------------+-------------------+-----------------
 b0000000-0000-0000-0000-0000000000b1 | acknowledged | Needs Attention Now |                3 | Brackley North Quarry | Primary Crusher Area |            | Jo Mason       | Sling stored on the crusher walkway is frayed  | 2026-07-19 22:21:18.890733+05:30 | 2 days 00:07:25 |      48.1 | 2026-07-20 22:20:38.890733+05:30 | t          |          10800000 | Priya Raman
(1 row)
```

Note the two distinct name columns and why only one is guarded:

- `author_display` uses the anonymity `CASE` — the *reporter* may be anonymous. Here `…0094` is attributed, so "Jo Mason" is correct and intended.
- `acknowledged_by` resolves `review_task.acknowledged_by_membership_id → user_tenant_membership.user_id → app_user`. This needs **no** guard: supervisor actions are never anonymous. Accountability runs one way — the person who reports may hide, the person who responds may not.

`ORDER BY severity DESC, created_at ASC` (ascending!) is deliberate: within a severity band the *oldest* task surfaces first. Newest-first here would let an old red rot at the bottom of the list, which is the exact failure mode the queue exists to prevent.

**Index reliance.** `idx_review_task_tenant_state_created (tenant_id, state, created_at DESC) WHERE deleted_at IS NULL` — exists, but `state <> 'closed'` is a negation and cannot be an index condition; the planner scans the tenant's tasks and filters. `idx_review_task_tenant_due (tenant_id, due_at) WHERE deleted_at IS NULL AND closed_at IS NULL` is the better-shaped one and exists.

⚠️ **FLAG.** As with the feed, `severity_ordinal` comes from the joined `classification` table so the ordering requires a sort. The queue is small by nature (open reds at one site), so this is low priority — but if you denormalise `severity_ordinal` onto `behaviour_signal` for the feed (§1), consider a partial index for the queue too:
```sql
CREATE INDEX idx_review_task_open_queue
    ON review_task (tenant_id, created_at)
    WHERE deleted_at IS NULL AND closed_at IS NULL;
```
`closed_at IS NULL` is an indexable predicate where `state <> 'closed'` is not.

---

# 9. The <60s NFR proof

`percentile_cont` gives the interpolated continuous percentile. Use it, not `percentile_disc`, for latency SLOs — `percentile_disc` returns an actual observed value and jumps in steps at low sample counts.

```sql
SELECT
  count(*)                                                                       AS n,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY capture_latency_ms)::int          AS capture_p50_ms,
  percentile_cont(0.90) WITHIN GROUP (ORDER BY capture_latency_ms)::int          AS capture_p90_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY capture_latency_ms)::int          AS capture_p95_ms,
  max(capture_latency_ms)                                                        AS capture_max_ms,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY classification_latency_ms)::int   AS classify_p50_ms,
  percentile_cont(0.90) WITHIN GROUP (ORDER BY classification_latency_ms)::int   AS classify_p90_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY classification_latency_ms)::int   AS classify_p95_ms,
  count(*) FILTER (WHERE capture_latency_ms <= 60000)                            AS within_60s,
  round(100.0 * count(*) FILTER (WHERE capture_latency_ms <= 60000)/count(*), 1) AS pct_within_60s,
  (percentile_cont(0.95) WITHIN GROUP (ORDER BY capture_latency_ms) <= 60000)    AS nfr_p95_under_60s
FROM behaviour_signal
WHERE tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND status = 'final' AND deleted_at IS NULL
  AND capture_latency_ms IS NOT NULL
  AND finalised_at >= now() - interval '30 days';
```

```
 n | capture_p50_ms | capture_p90_ms | capture_p95_ms | capture_max_ms | classify_p50_ms | classify_p90_ms | classify_p95_ms | within_60s | pct_within_60s | nfr_p95_under_60s
---+----------------+----------------+----------------+----------------+-----------------+-----------------+-----------------+------------+----------------+-------------------
 4 |          37000 |          48700 |          50350 |          52000 |            3650 |            4830 |            4965 |          4 |          100.0 | t
(1 row)
```

**NFR PASSES on the demo data.** p95 capture 50.4 s against a 60 s budget, worst observed 52 s, 100% of signals under 60 s. Classification p95 is 4.97 s — the classification step is 10% of the budget, so the headroom is all in capture (typing, photo, voice).

n=4 is far too small for a p95 to mean anything statistically. The query is correct; the *sample* is a demo. Treat `nfr_p95_under_60s` as a smoke test until the pilot has a few hundred signals, and set the CI gate on `n >= 100`.

Segmented by entry point, which is where the interesting variance lives:

```sql
SELECT s.entry_point,
       count(*) AS n,
       percentile_cont(0.50) WITHIN GROUP (ORDER BY s.capture_latency_ms)::int AS p50_ms,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY s.capture_latency_ms)::int AS p95_ms,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY s.classification_latency_ms)::int AS classify_p95_ms
FROM behaviour_signal s
WHERE s.tenant_id='b0000000-0000-0000-0000-000000000001'
  AND s.status='final' AND s.deleted_at IS NULL AND s.capture_latency_ms IS NOT NULL
GROUP BY s.entry_point ORDER BY n DESC;
```

```
 entry_point | n | p50_ms | p95_ms | classify_p95_ms
-------------+---+--------+--------+-----------------
 qr          | 3 |  41000 |  50900 |            5010
 direct      | 1 |  28000 |  28000 |            3100
(2 rows)
```

QR-entry signals are slower than direct ones (41 s vs 28 s median) — consistent with QR scans producing richer signals with photos attached. Worth watching: if the QR path ever crosses 60 s it will do so first, and this segmentation is what will show it.

**Index reliance.** None — this is an intentional aggregate over the whole window and a seq scan is the right plan. ⚠️ Same `finalised_at` gap as §5: if this becomes a per-site or per-week report the missing `finalised_at` index will bite. `capture_latency_ms IS NOT NULL` is the correct guard — draft signals abandoned mid-capture have NULL latency and must not be counted as fast.

---

# 10. Learn5 engagement

## Views and completion rate

Driven from `learn5_item` so a published item with zero views shows as `0` — the "we published training nobody opened" case is the one worth surfacing.

```sql
SELECT li.id AS learn5_item_id, li.title, li.estimated_seconds,
       count(v.id)                                        AS views,
       count(DISTINCT v.author_token)                     AS distinct_viewers,
       count(v.id) FILTER (WHERE v.completed)             AS completions,
       round(100.0 * count(v.id) FILTER (WHERE v.completed)
             / NULLIF(count(v.id),0), 1)                  AS completion_rate_pct,
       round(avg(v.dwell_ms) FILTER (WHERE v.completed)/1000.0, 1) AS avg_dwell_s,
       max(v.started_at)                                  AS last_viewed_at
FROM learn5_item li
LEFT JOIN learn5_view v
       ON v.learn5_item_id = li.id
      AND v.tenant_id = 'b0000000-0000-0000-0000-000000000001'
      AND v.deleted_at IS NULL
      AND v.started_at >= now() - interval '90 days'
WHERE li.deleted_at IS NULL
  AND li.status = 'published'
  AND (li.tenant_id = 'b0000000-0000-0000-0000-000000000001' OR li.tenant_id IS NULL)
ORDER BY views DESC;
```

```
            learn5_item_id            |              title               | estimated_seconds | views | distinct_viewers | completions | completion_rate_pct | avg_dwell_s |          last_viewed_at
--------------------------------------+----------------------------------+-------------------+-------+------------------+-------------+---------------------+-------------+----------------------------------
 b0000000-0000-0000-0000-000000000051 | Suspended loads and pinch points |               150 |     1 |                1 |           1 |               100.0 |       100.0 | 2026-07-21 19:20:58.890733+05:30
(1 row)
```

`li.tenant_id IS NULL OR li.tenant_id = :tenant` — Learn5 items are dual-scoped: global library items plus tenant-authored ones. Omitting the NULL arm would hide the entire global catalogue from every tenant's engagement report.

`avg_dwell_s` (100 s) against `estimated_seconds` (150) is the quality signal: viewers marked complete in two-thirds of the estimated time. Either the estimate is padded or people are skimming — either way it is a content question the raw completion rate of 100% would never raise.

## Which QR context drove the view

```sql
SELECT v.source                                   AS view_source,
       q.token                                    AS qr_token,
       q.label                                    AS qr_label,
       c.name                                     AS qr_context_name,
       ss.name                                    AS sub_site_name,
       a.name                                     AS asset_name,
       li.title                                   AS learn5_title,
       count(*)                                   AS views,
       count(*) FILTER (WHERE v.completed)        AS completions,
       round(100.0*count(*) FILTER (WHERE v.completed)/count(*),1) AS completion_rate_pct
FROM learn5_view v
JOIN learn5_item li ON li.id = v.learn5_item_id
LEFT JOIN qr_code    q  ON q.id  = v.qr_code_id    AND q.tenant_id = v.tenant_id
LEFT JOIN qr_context c  ON c.id  = q.qr_context_id AND c.tenant_id = q.tenant_id
LEFT JOIN sub_site   ss ON ss.id = c.sub_site_id   AND ss.tenant_id = c.tenant_id
LEFT JOIN asset      a  ON a.id  = c.asset_id      AND a.tenant_id  = c.tenant_id
WHERE v.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND v.deleted_at IS NULL
  AND v.started_at >= now() - interval '90 days'
GROUP BY v.source, q.token, q.label, c.name, ss.name, a.name, li.title
ORDER BY views DESC;
```

```
 view_source |   qr_token   |           qr_label           |           qr_context_name           | sub_site_name  |                  asset_name                  |           learn5_title           | views | completions | completion_rate_pct
-------------+--------------+------------------------------+-------------------------------------+----------------+----------------------------------------------+----------------------------------+-------+-------------+---------------------
 pulse       | HJ7K3M9PQR2X | Lifting Zone 3 entry barrier | Heavy lift - Lifting Zone 3 (SB-14) | Lifting Zone 3 | Spreader Beam SB-14 (custom lifting fixture) | Suspended loads and pinch points |     1 |             1 |               100.0
(1 row)
```

This is attribution down to the **physical sticker**. `source='pulse'` with `qr_code_id` set means: someone scanned the barrier sticker, the PULSE ran, and the Learn5 item was served from inside that flow — training delivered at the point of risk rather than in a classroom. That chain, from a specific sticker on a specific barrier to a completed micro-lesson about the specific fixture in front of them, is the Learn5 value proposition, and it is one join path.

`learn5_view.author_token` carries no user id — the schema has no `user_id` column on this table at all — so engagement is measurable without knowing who studied what. A "which workers haven't done their training" report is deliberately not constructible from this table, and that is a design decision, not an omission.

**Index reliance.** `idx_learn5_view_item_started (tenant_id, learn5_item_id, started_at DESC) WHERE deleted_at IS NULL` and `idx_learn5_view_qr_code (tenant_id, qr_code_id, started_at DESC) WHERE qr_code_id IS NOT NULL AND deleted_at IS NULL`. Both exist and both are exactly the right shape. No gaps.

---

# 11. Search — Postgres FTS

`behaviour_signal.search_vector` is a `GENERATED ALWAYS AS (to_tsvector('english', COALESCE(body_text,''))) STORED` column, so it is always in sync with `body_text` and cannot drift. Use `websearch_to_tsquery` rather than `plainto_tsquery` — it understands quoted phrases and `-exclusion`, which is what people type.

```sql
SELECT s.id,
       cl.label AS classification,
       CASE WHEN s.is_anonymous THEN 'Anonymous' ELSE COALESCE(au.display_name,'Anonymous') END AS author_display,
       ts_rank(s.search_vector, q.query)                          AS rank,
       ts_headline('english', s.body_text, q.query,
                   'StartSel=[,StopSel=],MaxWords=14,MinWords=6') AS snippet,
       s.created_at
FROM behaviour_signal s
CROSS JOIN websearch_to_tsquery('english','spreader beam') AS q(query)
JOIN classification cl ON cl.code = s.classification_code
LEFT JOIN app_user au ON au.id = s.author_user_id AND s.is_anonymous = false
WHERE s.tenant_id = 'b0000000-0000-0000-0000-000000000001'
  AND s.status = 'final' AND s.deleted_at IS NULL AND s.moderation_state = 'visible'
  AND s.search_vector @@ q.query
  AND s.classification_code = ANY (ARRAY['be_aware','good_practice'])   -- filter
  AND s.sub_site_id = 'b0000000-0000-0000-0000-000000000004'            -- filter
ORDER BY rank DESC, s.created_at DESC
LIMIT 20;
```

```
                  id                  | classification | author_display |    rank    |              snippet               |            created_at
--------------------------------------+----------------+----------------+------------+------------------------------------+----------------------------------
 b0000000-0000-0000-0000-000000000092 | Be Aware       | Priya Raman    | 0.09910322 | [spreader] [beam] is worn and hard | 2026-07-12 22:20:38.890733+05:30
(1 row)
```

The `CROSS JOIN … AS q(query)` binds the tsquery once instead of re-parsing it in the `WHERE`, the `ORDER BY` and the `ts_headline` — three parses become one, and the query text appears exactly once so it is trivially parameterisable.

The same anonymity `CASE` applies. Search is a classic leak surface: a `ts_headline` over `body_text` can echo a self-identifying phrase the reporter wrote ("I was on the night shift with Dave"), and no database constraint can prevent that. That is a content-moderation problem, handled by `moderation_state` and the `moderation_action` table, not a join problem — but it is the reason the search endpoint should respect `moderation_state = 'visible'`, as above.

**Index reliance.** `idx_behaviour_signal_search_vector` GIN on `(search_vector)` — exists. The planner seq-scans the 4-row demo table, so confirmed with `enable_seqscan=off`:

```
 Bitmap Heap Scan on behaviour_signal
   Recheck Cond: (search_vector @@ '''spreader'' & ''beam'''::tsquery)
   ->  Bitmap Index Scan on idx_behaviour_signal_search_vector
         Index Cond: (search_vector @@ '''spreader'' & ''beam'''::tsquery)
```

⚠️ **FLAG.** The GIN index is on `search_vector` alone, with **no `tenant_id`**. Every FTS query bitmap-scans matches across *all* tenants and then discards the wrong ones via the heap filter (RLS makes this correct, but not fast). At 20 tenants a search does ~20× the work it needs to. Fix:
```sql
CREATE INDEX idx_behaviour_signal_search_tenant
    ON behaviour_signal USING gin (tenant_id, search_vector) WITH (fastupdate = off);
-- requires btree_gin for the uuid leading column
```
Needs the `btree_gin` extension. Alternatively partition `behaviour_signal` by tenant at scale. Not urgent for pilot; do it before the second wave of tenants.

`ts_rank` also does not use the index — ranking always requires reading the matched rows. That is inherent to FTS, and `LIMIT 20` bounds it as long as the `@@` match itself is selective.

---

# 12. GDPR subject access export — Art. 15

The requirement that makes this non-trivial: the export **must include signals the subject submitted anonymously**. Those rows have `author_user_id IS NULL`, so no FK path reaches them. The only way in is to resolve the subject's `author_token`s through `user_tenant_membership` (and `guest_session` for a promoted guest) and query by token.

```sql
WITH subject AS (
    SELECT u.id AS user_id, u.email::text, u.display_name, u.default_anonymous,
           u.locale, u.status, u.created_at, u.last_seen_at
      FROM app_user u
     WHERE u.id = 'b0000000-0000-0000-0000-000000000011'
), tokens AS (
    -- The pseudonym resolution. This CTE is the entire reason the export works.
    SELECT m.tenant_id, m.id AS membership_id, m.author_token, m.status, r.code AS role_code
      FROM user_tenant_membership m
      JOIN role r ON r.id = m.role_id
      JOIN subject s ON s.user_id = m.user_id
     WHERE m.deleted_at IS NULL
    UNION ALL
    -- A guest who later signed up keeps their pre-signup token.
    SELECT g.tenant_id, NULL::uuid, g.author_token, 'guest_promoted', 'guest'
      FROM guest_session g JOIN subject s ON s.user_id = g.promoted_user_id
)
SELECT
 (SELECT to_jsonb(s) FROM subject s)                                    AS profile,
 (SELECT jsonb_agg(to_jsonb(t)) FROM tokens t)                          AS tenant_identities,
 (SELECT jsonb_agg(jsonb_build_object(
     'signal_id', b.id, 'tenant_id', b.tenant_id, 'status', b.status,
     'classification', b.classification_code, 'is_anonymous', b.is_anonymous,
     'attributed_by_fk', (b.author_user_id IS NOT NULL),
     'body_text', b.body_text, 'occurred_at', b.occurred_at) ORDER BY b.occurred_at DESC)
   FROM behaviour_signal b WHERE b.author_token IN (SELECT author_token FROM tokens)) AS signals,
 (SELECT jsonb_agg(jsonb_build_object('media_id', sm.id,'signal_id', sm.signal_id,
        'kind', sm.kind,'state', sm.state,'storage_key', sm.storage_key))
   FROM signal_media sm
   WHERE sm.signal_id IN (SELECT b.id FROM behaviour_signal b
                           WHERE b.author_token IN (SELECT author_token FROM tokens))) AS media,
 (SELECT jsonb_agg(jsonb_build_object('session_id', p.id,'outcome', p.outcome,
        'duration_ms', p.duration_ms,'started_at', p.started_at))
   FROM pulse_session p WHERE p.author_token IN (SELECT author_token FROM tokens))     AS pulse_sessions,
 (SELECT jsonb_agg(jsonb_build_object('scan_id', e.id,'qr_code_id', e.qr_code_id,
        'occurred_at', e.occurred_at))
   FROM qr_scan_event e WHERE e.author_token IN (SELECT author_token FROM tokens))     AS qr_scans,
 (SELECT jsonb_agg(jsonb_build_object('view_id', v.id,'learn5_item_id', v.learn5_item_id,
        'completed', v.completed,'dwell_ms', v.dwell_ms))
   FROM learn5_view v WHERE v.author_token IN (SELECT author_token FROM tokens))       AS learn5_views,
 (SELECT jsonb_agg(jsonb_build_object('signal_id', rs.signal_id,'seen_at', rs.seen_at))
   FROM signal_read_state rs WHERE rs.author_token IN (SELECT author_token FROM tokens)) AS read_state;
```

**Executed output** for Jo Mason (`-x` expanded, whitespace reflowed):

```
profile           | {"email": "jo.mason@brackley-aggregates.example", "locale": "en-GB", "status": "active",
                     "user_id": "b0000000-…-000000000011", "created_at": "2026-07-21T22:20:38.890733+05:30",
                     "display_name": "Jo Mason", "last_seen_at": "2026-07-21T20:20:38.890733+05:30",
                     "default_anonymous": true}

tenant_identities | [{"status": "active", "role_code": "worker", "tenant_id": "b0000000-…-000000000001",
                      "author_token": "J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ",
                      "membership_id": "b0000000-…-000000000021"}]

signals           | [{"status": "final", "signal_id": "b0000000-…-000000000091",
                      "body_text": "Shackle pin on SB-14 is not the pin listed on the lift plan. Lift was stopped and the beam swapped.",
                      "occurred_at": "2026-07-21T19:20:38.890733+05:30",
                      "is_anonymous": true,  "classification": "be_aware",
                      "attributed_by_fk": false},                       <-- THE ANONYMOUS ONE
                     {"status": "final", "signal_id": "b0000000-…-000000000094",
                      "body_text": "Sling stored on the crusher walkway is frayed at the eye. Tagged it out and left it where it is.",
                      "occurred_at": "2026-07-19T22:20:38.890733+05:30",
                      "is_anonymous": false, "classification": "needs_attention_now",
                      "attributed_by_fk": true}]

media             | [{"kind": "photo", "state": "ready", "media_id": "b0000000-…-0000000000a1",
                      "signal_id": "b0000000-…-000000000091", "storage_key": "s3://safein5-media/…a1.webp"}]

pulse_sessions    | [{"outcome": "completed_with_signal", "session_id": "b0000000-…-000000000081",
                      "started_at": "2026-07-21T19:20:38.890733+05:30", "duration_ms": 48000}]

qr_scans          | [{"scan_id": "b0000000-…-000000000073", "qr_code_id": "b0000000-…-000000000072",
                      "occurred_at": "2026-07-21T19:20:38.890733+05:30"}]

learn5_views      | [{"view_id": "b0000000-…-000000000054", "dwell_ms": 100000, "completed": true,
                      "learn5_item_id": "b0000000-…-000000000051"}]

read_state        |
```

Signal `…0091` — `is_anonymous: true`, `attributed_by_fk: false` — **is in the export**. An export built on `WHERE author_user_id = :user_id` would have returned only `…0094` and quietly failed Art. 15. The `attributed_by_fk` flag is there so the reviewing DPO can see at a glance which rows arrived via the token path rather than the FK path.

`read_state` is empty because Jo has not marked anything read — Priya holds the read-state rows in this seed. The NULL is correct output, not a broken join.

**Run this as `safein5_identity`, never `safein5_app`.** `0007_rls_roles.sql` grants table-level SELECT on `user_tenant_membership` (including `author_token`) to `safein5_identity` only; `safein5_app` has column-level grants that exclude `author_token`. The token→name mapping is the crown jewel and exactly one role can read it.

**Index reliance.** `idx_user_tenant_membership_user (user_id) WHERE deleted_at IS NULL`, `idx_guest_session_promoted_user`, `idx_behaviour_signal_author_token (author_token, created_at DESC)`, `idx_pulse_session_author_token`, `idx_qr_scan_event_author_token`, `idx_learn5_view_author_token`, `pk_signal_read_state (author_token, signal_id)`. Every by-token lookup has an index — this is the one access pattern the schema indexes comprehensively, and correctly so, since Art. 15 has a statutory response deadline.

---

# 13. GDPR erasure — Art. 17

Executed as one transaction, rolled back so the demo database is unchanged. In production, drop the `ROLLBACK`, replace with `COMMIT`, and run as `safein5_identity` — the only role holding `DELETE ON user_tenant_membership` and `UPDATE (author_user_id, is_anonymous, body_text, …) ON behaviour_signal`.

```sql
BEGIN;
SELECT set_config('app.tenant_id','b0000000-0000-0000-0000-000000000001',true);

-- 0. Capture the subject's tokens BEFORE the mapping is destroyed.
--    After step 4 there is no way to find them again. Order is not optional.
CREATE TEMP TABLE erase_tokens ON COMMIT DROP AS
  SELECT m.tenant_id, m.author_token
    FROM user_tenant_membership m
   WHERE m.user_id = 'b0000000-0000-0000-0000-000000000011';

-- 1. Redact free text the subject wrote. search_vector is GENERATED, so the
--    full-text index follows automatically -- no orphan tsvector to scrub.
UPDATE behaviour_signal s
   SET body_text = NULL, body_source = 'none', updated_at = now()
 WHERE (s.tenant_id, s.author_token) IN (SELECT tenant_id, author_token FROM erase_tokens);

-- 2. Break attribution: null the author FKs.
UPDATE behaviour_signal SET author_user_id = NULL, updated_at = now()
 WHERE author_user_id = 'b0000000-0000-0000-0000-000000000011';
UPDATE pulse_session   SET author_user_id = NULL, updated_at = now()
 WHERE author_user_id = 'b0000000-0000-0000-0000-000000000011';

-- 3. Drop credentials, devices, notifications.
DELETE FROM auth_token          WHERE user_id           = 'b0000000-0000-0000-0000-000000000011';
DELETE FROM device_subscription WHERE user_id           = 'b0000000-0000-0000-0000-000000000011';
DELETE FROM notification        WHERE recipient_user_id = 'b0000000-0000-0000-0000-000000000011';
UPDATE guest_session SET promoted_user_id = NULL
 WHERE promoted_user_id = 'b0000000-0000-0000-0000-000000000011';

-- 4. DELETE the membership row. THIS IS THE ERASURE. The only
--    author_token -> user mapping in the database dies here.
--    user_site_assignment cascades; every other FK is ON DELETE SET NULL.
DELETE FROM user_tenant_membership WHERE user_id = 'b0000000-0000-0000-0000-000000000011';

-- 5. Tombstone the account. ck_app_user_erased_is_scrubbed forces the scrub:
--    status='erased' is only legal when email, display_name and password_hash
--    are all NULL and erased_at is set. The constraint makes a half-done
--    erasure impossible to commit.
UPDATE app_user
   SET email = NULL, display_name = NULL, password_hash = NULL,
       email_verified_at = NULL, status = 'erased', erased_at = now(), updated_at = now()
 WHERE id = 'b0000000-0000-0000-0000-000000000011';

-- verification block (see output)
ROLLBACK;   -- COMMIT in production
```

**Executed output:**

```
BEGIN
SELECT 1
UPDATE 2      <- two signal bodies redacted (0091 anonymous AND 0094 attributed)
UPDATE 1      <- one author_user_id nulled (only 0094 had one)
UPDATE 0      <- pulse_session 0081 was already anonymous
DELETE 0 / DELETE 0 / DELETE 0 / UPDATE 0
DELETE 1      <- THE MEMBERSHIP ROW
UPDATE 1      <- tombstone

  check   |                  id                  | status | email | display_name | tombstoned
----------+--------------------------------------+--------+-------+--------------+------------
 app_user | b0000000-0000-0000-0000-000000000011 | erased |       |              | t

        check         | count
----------------------+-------
 membership_rows_left | 0

      check      |                  id                  | classification_code | status |           author_token           | author_user_id | body_text |               asset_id
-----------------+--------------------------------------+---------------------+--------+----------------------------------+----------------+-----------+--------------------------------------
 signals_survive | b0000000-0000-0000-0000-000000000091 | be_aware            | final  | J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ |                |           | b0000000-0000-0000-0000-000000000006
 signals_survive | b0000000-0000-0000-0000-000000000094 | needs_attention_now | final  | J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ |                |           |

         check         | mapping_rows
-----------------------+--------------
 token_is_now_orphaned |            0

        check        |                     name                     | be_aware_count
---------------------+----------------------------------------------+----------------
 insight_still_works | Spreader Beam SB-14 (custom lifting fixture) |              2
ROLLBACK
```

Note `UPDATE 2` on step 1: the redaction is driven by `(tenant_id, author_token)`, so it catches the **anonymous** signal too. Driving it from `author_user_id` would have redacted only `…0094` and left the subject's anonymously-written prose in the database forever.

## Why the signals survive — and why that is lawful, not a loophole

After erasure each signal keeps: `id`, `classification_code`, `status`, `asset_id`, `site_id`, `sub_site_id`, `risk_type_code`, `occurred_at`, latency measurements, and a 32-character `author_token` that now maps to nothing.

**The token is no longer personal data.** It was a pseudonym; a pseudonym is personal data only while a re-identification key exists. Step 4 destroyed the only such key in the system, and the per-tenant salt in `tenant_secret` cannot regenerate it — the derivation is one-way and the input (the identity the token was derived from) is gone. What remains is anonymous data, outside the GDPR's material scope entirely (Recital 26), so there is nothing left to erase.

**What survives is a safety record, not a personal one.** "A frayed sling was reported on the crusher walkway on 19 July, acknowledged in 3 hours" is a fact about a quarry. Deleting it would corrupt the site's safety history, break the `review_task` chain, invalidate the HSE-facing audit trail, and — as the verification block shows — silently change the flagship insight, which still correctly reports 2 Be Aware signals on SB-14. A regime where any reporter could retroactively delete safety findings would be actively dangerous, and Art. 17(3)(b) and (c) contemplate exactly this: erasure does not override legal obligations or public-interest safety processing.

**Statistical continuity is preserved.** The erased subject's tokens still group correctly in the repeat-usage metric — they are still one distinct author, just an unnameable one. The success metric does not develop a hole because a user exercised their rights.

**Ordering is load-bearing.** Steps 1 and 2 must precede step 4. Once the membership row is gone, `erase_tokens` is unreproducible and the anonymous signals become permanently unreachable for redaction. The temp table in step 0 exists purely to make the ordering explicit and reviewable. This is also why erasure is a single transaction: a crash between steps 1 and 4 must roll back cleanly, never leave a half-erased subject.

**Foreign keys were designed for this.** Every FK into `user_tenant_membership` is `ON DELETE SET NULL` (`review_task.acknowledged_by_membership_id`, `workflow_transition.actor_membership_id`, `evidence.uploaded_by_membership_id`, `qr_code.verified_by_membership_id`, `moderation_action.actor_membership_id`, …) except `user_site_assignment`, which is `ON DELETE CASCADE`. The membership row can therefore always be deleted — no FK violation can block a statutory erasure. That is a deliberate design property, and it is worth a CI test of its own.

---

# 14. Anonymity leak-check queries — CI assertions

Every assertion returns `0` violations when the system is sound, so the whole set is one `HAVING sum(violations) > 0 → exit 1` gate.

```sql
WITH a AS (
  SELECT 'A1 anonymous signal has no author FK' AS assertion, count(*) AS violations
    FROM behaviour_signal WHERE is_anonymous AND author_user_id IS NOT NULL
  UNION ALL
  SELECT 'A2 anonymous pulse_session has no author FK',
         count(*) FROM pulse_session WHERE is_anonymous AND author_user_id IS NOT NULL
  UNION ALL
  SELECT 'A3 no name reachable from an anonymous signal via any FK on the row', count(*)
    FROM behaviour_signal s
    LEFT JOIN app_user      au ON au.id = s.author_user_id
    LEFT JOIN pulse_session ps ON ps.id = s.pulse_session_id
    LEFT JOIN app_user      pu ON pu.id = ps.author_user_id
    LEFT JOIN guest_session gs ON gs.id = s.guest_session_id
    LEFT JOIN app_user      gu ON gu.id = gs.promoted_user_id
   WHERE s.is_anonymous
     AND coalesce(au.display_name, pu.display_name, gu.display_name) IS NOT NULL
  UNION ALL
  SELECT 'A4 anonymous signal token not resolvable to a name by safein5_app', count(*)
    FROM behaviour_signal s
    JOIN user_tenant_membership m ON m.tenant_id = s.tenant_id AND m.author_token = s.author_token
    JOIN app_user u ON u.id = m.user_id
   WHERE s.is_anonymous
     AND has_column_privilege('safein5_app','user_tenant_membership','author_token','SELECT')
  UNION ALL
  SELECT 'A5 safein5_app cannot SELECT user_tenant_membership.author_token',
         (has_column_privilege('safein5_app','user_tenant_membership','author_token','SELECT'))::int
  UNION ALL
  SELECT 'A6 safein5_app has no table-wide SELECT on user_tenant_membership',
         (has_table_privilege('safein5_app','user_tenant_membership','SELECT'))::int
  UNION ALL
  SELECT 'A7 safein5_worker has no access at all to user_tenant_membership',
         (has_table_privilege('safein5_worker','user_tenant_membership','SELECT'))::int
  UNION ALL
  SELECT 'A8 safein5_app cannot read tenant_secret (the token salt)',
         (has_table_privilege('safein5_app','tenant_secret','SELECT'))::int
  UNION ALL
  SELECT 'A10 anonymity CHECK constraint still installed on behaviour_signal',
         (SELECT count(*) FROM pg_constraint WHERE conname='ck_behaviour_signal_anonymity')::int - 1
  UNION ALL
  SELECT 'A11 anonymity CHECK constraint still installed on pulse_session',
         (SELECT count(*) FROM pg_constraint WHERE conname='ck_pulse_session_anonymity')::int - 1
)
SELECT assertion, violations, CASE WHEN violations = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM a ORDER BY assertion;
```

**Executed output:**

```
                                    assertion                                     | violations | result
----------------------------------------------------------------------------------+------------+--------
 A1 anonymous signal has no author FK                                             |          0 | PASS
 A2 anonymous pulse_session has no author FK                                      |          0 | PASS
 A3 no name reachable from an anonymous signal via any FK on the row              |          0 | PASS
 A4 anonymous signal token not resolvable to a name by safein5_app                |          0 | PASS
 A5 safein5_app cannot SELECT user_tenant_membership.author_token                 |          0 | PASS
 A6 safein5_app has no table-wide SELECT on user_tenant_membership                |          0 | PASS
 A7 safein5_worker has no access at all to user_tenant_membership                 |          0 | PASS
 A8 safein5_app cannot read tenant_secret (the token salt)                        |          0 | PASS
 A10 anonymity CHECK constraint still installed on behaviour_signal               |          0 | PASS
 A11 anonymity CHECK constraint still installed on pulse_session                  |          0 | PASS
(10 rows)
```

A3 is the important one: it walks *every* FK on an anonymous signal row — direct author, the PULSE session it came from, and the guest session — and asserts no `display_name` is reachable through any of them. A10/A11 are drift detection: they fail if a future migration drops the CHECK constraints that make A1/A2 structurally impossible rather than merely currently-true.

## Schema-shape assertion

Catches a future migration that adds `author_token` alongside a user FK on a *new* table without an anonymity constraint:

```sql
SELECT 'A9 every table co-locating author_token with a user FK carries an anonymity CHECK' AS assertion,
       count(*) AS violations
  FROM (SELECT DISTINCT c.table_name
          FROM information_schema.columns c
         WHERE c.table_schema='public' AND c.column_name='author_token'
           AND EXISTS (SELECT 1 FROM information_schema.columns c2
                        WHERE c2.table_schema='public' AND c2.table_name=c.table_name
                          AND c2.column_name IN ('user_id','author_user_id','promoted_user_id'))
           AND c.table_name NOT IN ('user_tenant_membership','guest_session')) t
 WHERE NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = ('public.'||t.table_name)::regclass
                      AND conname LIKE 'ck\_%\_anonymity');
```

```
 assertion                                                                        | violations | result
----------------------------------------------------------------------------------+------------+--------
 A9 every table co-locating author_token with a user FK carries an anonymity CHECK |          0 | PASS
```

Four tables co-locate `author_token` with a user column: `user_tenant_membership` and `guest_session` (the two intentional mapping tables, allowlisted) and `behaviour_signal` and `pulse_session` (both of which carry `ck_*_anonymity`). The allowlist is short and deliberate; any fifth table appearing here should require a design conversation.

---

## 🔴 F-1 — CONFIRMED de-anonymisation vector in the current schema

Two assertions **FAIL**:

```sql
SELECT 'A12 no anonymous signal shares an author_token with an attributed signal readable by safein5_app' AS assertion,
       count(*) AS violations
  FROM behaviour_signal anon
  JOIN behaviour_signal attr
        ON attr.tenant_id = anon.tenant_id AND attr.author_token = anon.author_token
       AND attr.is_anonymous = false AND attr.author_user_id IS NOT NULL
 WHERE anon.is_anonymous
   AND has_column_privilege('safein5_app','behaviour_signal','author_token','SELECT')
UNION ALL
SELECT 'A13 safein5_app cannot SELECT behaviour_signal.author_token',
       (has_column_privilege('safein5_app','behaviour_signal','author_token','SELECT'))::int;
```

```
                                            assertion                                             | violations | result
--------------------------------------------------------------------------------------------------+------------+--------
 A12 no anonymous signal shares an author_token with an attributed signal readable by safein5_app |          1 | FAIL
 A13 safein5_app cannot SELECT behaviour_signal.author_token                                      |          1 | FAIL
(2 rows)
```

**The exploit, executed as the actual application role:**

```sql
BEGIN;
SELECT set_config('app.tenant_id','b0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE safein5_app;
SELECT current_user;
SELECT anon.id AS anonymous_signal, u.display_name AS name_leaked
  FROM behaviour_signal anon
  JOIN behaviour_signal attr ON attr.tenant_id = anon.tenant_id
       AND attr.author_token = anon.author_token AND attr.is_anonymous = false
  JOIN app_user u ON u.id = attr.author_user_id
 WHERE anon.is_anonymous;
ROLLBACK;
```

```
 current_user
--------------
 safein5_app

           anonymous_signal           | name_leaked
--------------------------------------+-------------
 b0000000-0000-0000-0000-000000000091 | Jo Mason
(1 row)
ROLLBACK
```

**A self-join on `behaviour_signal`, no privileged role, no access to `user_tenant_membership`, names the author of an anonymous signal.** The mechanism: `author_token` is stable per person per tenant and is written on *every* signal, anonymous or not. Anyone who reports once anonymously and once with their name attached has published the mapping themselves — `…0091` (anonymous) and `…0094` (attributed, `author_user_id` → Jo Mason) carry the identical token. All the column-level `REVOKE`s protecting `user_tenant_membership.author_token` are bypassed, because the join never touches that table.

This is not a hypothetical shape: `default_anonymous` is a per-user preference that people toggle, and mixed-mode reporting is the *expected* behaviour the repeat-usage metric is built to capture (§5). Every mixed-mode reporter is exposed.

`§6 (the flagship insight) also displays `anonymous_count` alongside `distinct_reporters` on a small group — with a group of 2–3 on one asset, that is a second, statistical route to the same answer.

**Remediation.** `safein5_app` should not be able to read `behaviour_signal.author_token` at all. The fix is not a `REVOKE` — `0007_rls_roles.sql` grants `SELECT` on `behaviour_signal` at **table level** (§5 of that file), and as its own comment correctly explains, a column-level `REVOKE` after a table-level `GRANT` subtracts nothing. The table-level grant must be replaced with an explicit column list that omits `author_token`, exactly as was already done for `app_user.password_hash` and `user_tenant_membership.author_token`.

Nothing in this cookbook's runtime queries needs it: the feed (§1) does not select it, the read-state anti-join (§2) uses `signal_read_state.author_token`, and QR resolve (§4) never touches the table. The queries that *do* need it are analytics — repeat usage (§5), active users (§7) — which should run as a separate reporting role, or better, read from a materialized view that exposes only the aggregate.

Until that lands, **A12/A13 are a known-failing gate**: land them in CI as expected-fail with a linked ticket, so the day the grant is fixed the gate flips green and stays green.

---

# Summary of index findings

| # | Query | Index it relies on | Status |
|---|---|---|---|
| 1 | Feed | `idx_behaviour_signal_subsite_classification` | exists; ⚠️ needs `severity_ordinal` denormalised + `idx_behaviour_signal_feed_order` to avoid a full sort |
| 2 | Caught-up | `pk_signal_read_state`, `idx_behaviour_signal_tenant_site` | exists, correct shape |
| 3 | Filters | `idx_behaviour_signal_subsite_classification`, `idx_sub_site_parent` | exists |
| 4 | QR resolve | `uq_qr_code_token` + 7 PKs | exists; ~10 probes, size-independent |
| 5 | Repeat usage | `idx_behaviour_signal_author_token` | ⚠️ **wrong shape** — no `tenant_id`, no `status` predicate, and filters on unindexed `finalised_at`. Add `idx_behaviour_signal_repeat_usage` |
| 6 | Flagship insight | `idx_behaviour_signal_asset`, `idx_behaviour_signal_taxonomy` | ⚠️ **`occurred_at` is unindexed schema-wide** — highest-value gap. Add `idx_behaviour_signal_insight` |
| 7 | Dashboards | tenant-leading indexes on all five surfaces | exists; ⚠️ same `finalised_at` gap |
| 8 | Supervisor queue | `idx_review_task_tenant_state_created`, `idx_review_task_tenant_due` | exists; ⚠️ `state <> 'closed'` not indexable — prefer `closed_at IS NULL` |
| 9 | NFR percentiles | none (intentional full scan) | fine |
| 10 | Learn5 | `idx_learn5_view_item_started`, `idx_learn5_view_qr_code` | exists, ideal shape |
| 11 | Search | `idx_behaviour_signal_search_vector` (GIN) | exists; ⚠️ no `tenant_id` leading column — cross-tenant bitmap scan |
| 12 | GDPR export | six by-token indexes + `pk_signal_read_state` | exists, comprehensive |
| 13 | GDPR erasure | PKs and FK indexes | exists; all FKs `SET NULL`/`CASCADE`, erasure cannot be blocked |
| 14 | CI assertions | catalog only | n/a |

**Three things to fix before pilot, in priority order:**

1. **F-1** — replace the table-level `GRANT SELECT ON behaviour_signal TO safein5_app` with a column list omitting `author_token`. This is a live anonymity breach, reproduced above as the application role.
2. **`idx_behaviour_signal_insight`** on `(tenant_id, classification_code, occurred_at DESC)` — `occurred_at` is indexed nowhere and the flagship demo query filters on it.
3. **Seed a third `be_aware` signal** in `0008_seed_demo.sql`. The demo narrative says "3 similar Be Aware signals" and the database returns 2.
