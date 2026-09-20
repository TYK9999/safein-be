-- =====================================================================
-- SafeIn5 schema — Postgres 16. Apply this file; it includes the rest.
--
--   psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/schema/schema.sql
--
-- Files (apply order):
--   helpers.sql      updated_at trigger function
--   identity.sql     app_user, auth_token
--   tenancy.sql      tenant, sites, spaces, memberships, role
--   access.sql       permission, role_permission
--   hazard.sql       hazard_category, site_category_owner
--   documents.sql    document library + placements
--   content.sql      Job Checklist / Learn 5 / Uncover / Shift packs
--   work_tasks.sql   tasks, crew, selected prompts, Learn 5 media
--   pulse.sql        worker journeys
--   echoes.sql       signals + checklist_completion
--   realtime.sql     Socket.IO connections + published events
--   media.sql        uploads, audio, STT, signal_media
--   triggers.sql     updated_at on every table
--
-- No migrations — drop the database and re-run this to reset.
-- Ids are sequential integers (GENERATED ALWAYS AS IDENTITY).
-- Community tenant is the first tenant row (id = 1).
-- =====================================================================

\ir helpers.sql
\ir identity.sql
\ir tenancy.sql
\ir access.sql
\ir hazard.sql
\ir documents.sql
\ir content.sql
\ir work_tasks.sql
\ir pulse.sql
\ir echoes.sql
\ir realtime.sql
\ir media.sql
\ir triggers.sql
