---
name: kysely-schema-sync
description: Keep db/schema/schema.sql and src/database/schema.ts in sync when altering Postgres tables for SafeIn5. Use when adding columns, tables, indexes, or enums used by Kysely services.
---

# Kysely schema sync

## Steps

1. Edit **live** SQL in `db/schema/schema.sql` (not `docs/db/migrations/` unless the task is future RLS).
2. Update matching interfaces/types in `src/database/schema.ts` and the `DB` interface.
3. Update any service queries under `src/modules/**` that touch the changed tables.
4. Ensure tenant-scoped tables keep `tenant_id` filters.
5. Apply locally with `psql` per `db/README.md`.
6. Add/adjust unit tests if workflow logic changed.

## Rules

- SQL stays under `db/`, never embedded under `src/`
- No TypeORM/Prisma
- `docs/db/migrations/` is future RLS design — do not assume it is applied

## Checklist

- [ ] `db/schema/schema.sql` updated
- [ ] `src/database/schema.ts` updated
- [ ] Services compile against new types
- [ ] Local schema applied / documented for reviewers
