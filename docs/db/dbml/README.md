# SafeIn5 — dbdiagram.io (DBML) exports

Generated directly from the live PostgreSQL 16 schema built by `db/migrations/0001–0008`.
Not hand-written, so they cannot drift from the SQL.

All six files are validated with the official `@dbml/core` parser.

## Files

| File | Tables | Refs | Use it for |
|---|---:|---:|---|
| `safein5-full.dbml` | 38 | 122 | The whole schema, with 5 TableGroups. Dense — good for search and for a wall poster. |
| `safein5-01-tenancy.dbml` | 5 | 7 | Tenant → site → sub-site → asset, plus `role`. |
| `safein5-02-identity.dbml` | 8 | 15 | Users, memberships, site assignments, guest sessions, auth tokens, the anonymity keystone. |
| `safein5-03-qr-context.dbml` | 12 | 29 | QR codes, contexts, PULSE templates, context bindings, scan events. |
| `safein5-04-signal.dbml` | 14 | 29 | Behaviour signals, media, classification, read state, Learn5, rescue plans. |
| `safein5-05-workflow.dbml` | 12 | 17 | Review tasks, transitions, moderation, audit, notifications, outbox. |

**Start with the subsystem files.** A 38-table diagram is technically importable but not readable;
the five focused views are what people actually use.

Table counts above include *context tables* — tables owned by another subsystem that are shown
because a relationship crosses into them. Each file's header comment lists which ones those are,
and they sit in a separate `Context (owned elsewhere)` group so they are visually distinct.
Every table is assigned to exactly one owning group.

## Importing

1. Go to <https://dbdiagram.io>.
2. Paste the file contents into the left-hand editor, **or** use `File > Import > From DBML`.
3. `Export > PNG / PDF / SQL` if you need a static copy.

There is nothing to configure — `database_type: 'PostgreSQL'` is already declared.

## What is encoded

- **Types** are the real Postgres types (`timestamptz`, `char(32)`, `numeric(9,6)`, `text[]`, `jsonb`).
- **`not null`, `unique`, defaults** come from the catalog, not from guesswork.
- **Composite primary keys and composite unique constraints** appear in `indexes { }` blocks —
  including the `(id, tenant_id)` pattern that makes cross-tenant referential drift impossible.
- **Composite foreign keys** use DBML's `Ref: t.(a, b) > o.(a, b)` form.
- **`ON DELETE` behaviour** is annotated (`[delete: cascade]`, `[delete: set null]`).
- **Column notes** carry the CHECK value sets (`one of: draft | classified | final | discarded`)
  and the original SQL `COMMENT ON`, so the `[SIGNAL]` future-intelligence columns stay labelled.

## What is *not* encoded

DBML has no vocabulary for these, so they live only in the SQL:

- **Row-level security.** 44 policies, all `ENABLED` *and* `FORCED`. This is the actual tenant
  isolation mechanism; the diagram shows `tenant_id` columns but cannot show what enforces them.
- **CHECK constraints as constraints** — 245 of them, surfaced as notes only. The most important
  is `ck_behaviour_signal_anonymity`: `is_anonymous = true` implies `author_user_id IS NULL`.
- **Partitioning.** `audit_log` and `outbox_event` are `PARTITIONED BY RANGE (occurred_at)`
  with 7 monthly partitions each. They render as ordinary tables.
  The 14 partition-inherited FK copies are deliberately excluded — they duplicate the parent's FK.
- **Grants and column-level revokes**, e.g. `REVOKE SELECT (author_token) ON user_tenant_membership`.
- **Triggers** (35), including `set_updated_at` and the sub-site depth cap.

## Regenerating

After changing any migration, rebuild the database and re-run the generator:

```bash
node generate-dbml.js <database_name> <output_dir>
# defaults: safein5_final, ./
```

It reads `pg_class` / `pg_attribute` / `pg_constraint` directly, so the DBML always reflects
what is actually in the database rather than what a migration was intended to do.
