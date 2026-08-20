-- =====================================================================
-- SafeIn5 MVP -- Migration 0008: DEMO SEED (Rigging & Fixtures scenario)
--
-- A small, realistic dataset for the anchor scenario the product is sold
-- on: a heavy lift in Lifting Zone 3 at a UK aggregates quarry, a custom
-- spreader beam, and the supervisor insight
--   "3 similar Be Aware signals in 2 weeks, all on custom lifting
--    fixtures"
-- which is a GROUP BY asset_id over behaviour_signal. Everything below
-- exists so that query -- and the QR resolve join, and the Echo -> Signal
-- join, and the workflow join -- are runnable against a fresh database.
--
-- THIS FILE IS DEMO DATA. Do not run it in production. It is numbered as
-- a migration so the pilot/demo environments get it deterministically;
-- the production pipeline stops after 0007.
--
-- RLS: every table below is FORCE ROW LEVEL SECURITY, which applies to
-- the table owner as well. The seed therefore runs inside one explicit
-- transaction and sets app.tenant_id with set_config(..., is_local=true)
-- -- SET LOCAL semantics, reset at COMMIT. It deliberately does NOT set
-- app.bypass_rls: the WITH CHECK clauses have no bypass, so a seed that
-- needed one would be proof the seed was wrong.
--
-- Plain ASCII only.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Fixed identifiers, so the demo is diffable and re-referenceable.
--   tenant        b0000000-...-000000000001
--   site          ...0003   sub-sites ...0004 / ...0005
--   asset         ...0006   users ...0011-13   memberships ...0021-23
--   pulse_template ...0041  learn5_item ...0051  rescue_plan ...0061
--   qr_context    ...0071   qr_code ...0072     pulse_session ...0081
--   signals       ...0091-94   media ...00a1    review_task ...00b1
-- ---------------------------------------------------------------------

-- The tenant row itself is not RLS-protected (it is the anchor).
INSERT INTO tenant (
    id, slug, kind, name, industry_code, country_code,
    is_public_readable, allow_guest_submission,
    data_region, theme, retention_policy, status
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'brackley-aggregates',
    'corporate',
    'Brackley Aggregates',
    'SIC-0812-quarrying',
    'GB',
    false,
    false,
    'eu-west-1',
    '{"logo_url": "s3://safein5-assets/brackley/logo.svg", "colour_tokens": {"primary": "#1F4E5F", "accent": "#E4A11B"}}'::jsonb,
    '{"signals_days": 730, "media_days": 365, "audit_days": 2555}'::jsonb,
    'active'
);

-- Enter the tenant's RLS context for everything that follows.
SELECT set_config('app.tenant_id', 'b0000000-0000-0000-0000-000000000001', true);


-- ---------------------------------------------------------------------
-- 1. Anonymity salt (Architecture Sec 4.2). Demo value only -- a real
--    tenant's salt is 16 CSPRNG bytes generated at provisioning time and
--    never checked into source control.
-- ---------------------------------------------------------------------
INSERT INTO tenant_secret (tenant_id, author_token_salt, salt_version, pepper_key_ref)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    decode('0f1e2d3c4b5a69788796a5b4c3d2e1f0', 'hex'),
    1,
    'arn:aws:kms:eu-west-1:000000000000:key/demo-author-token-pepper'
);


-- ---------------------------------------------------------------------
-- 2. Site / sub-sites / asset
-- ---------------------------------------------------------------------
INSERT INTO site (
    id, tenant_id, name, city, country_code,
    timezone, centroid_lat, centroid_lon, status
) VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Brackley North Quarry',
    'Brackley',
    'GB',
    'Europe/London',
     52.032100,
     -1.150400,
    'active'
);

INSERT INTO sub_site (
    id, tenant_id, site_id, parent_sub_site_id, name, kind,
    centroid_lat, centroid_lon, status
) VALUES
    ('b0000000-0000-0000-0000-000000000004',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000003',
     NULL,
     'Lifting Zone 3',
     'task_zone',
     52.032400, -1.149800,
     'active'),
    ('b0000000-0000-0000-0000-000000000005',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000003',
     NULL,
     'Primary Crusher Area',
     'area',
     52.031700, -1.151900,
     'active');

INSERT INTO asset (
    id, tenant_id, site_id, sub_site_id, external_ref, name, asset_type, status
) VALUES (
    'b0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'SB-14',
    'Spreader Beam SB-14 (custom lifting fixture)',
    'fixture',
    'active'
);


-- ---------------------------------------------------------------------
-- 3. People
--    app_user is global and not RLS-scoped; memberships are tenant-scoped
--    and carry the per-tenant pseudonym. The author_token values below
--    are illustrative fixed strings -- in a real environment they are
--    derived by the Identity module from the KMS pepper and the salt
--    above, and they are never written by hand.
--
--    Jo Mason has default_anonymous = true: she is the reporter behind
--    the anonymous Be Aware signal further down, and the only trace of
--    that connection anywhere in the database is her author_token, which
--    safein5_app cannot read.
-- ---------------------------------------------------------------------
INSERT INTO app_user (
    id, email, email_verified_at, display_name, password_hash,
    default_anonymous, locale, status, last_seen_at
) VALUES
    ('b0000000-0000-0000-0000-000000000011',
     'jo.mason@brackley-aggregates.example',
     now() - interval '40 days',
     'Jo Mason',
     NULL,
     true,
     'en-GB', 'active', now() - interval '2 hours'),

    ('b0000000-0000-0000-0000-000000000012',
     'priya.raman@brackley-aggregates.example',
     now() - interval '45 days',
     'Priya Raman',
     NULL,
     false,
     'en-GB', 'active', now() - interval '5 hours'),

    ('b0000000-0000-0000-0000-000000000013',
     'david.okafor@brackley-aggregates.example',
     now() - interval '50 days',
     'David Okafor',
     '$2b$12$demoDEMOdemoDEMOdemoDEuvW3q8yPPYh1n1oJcVQ2FZ0m6bqmS0Ky',
     false,
     'en-GB', 'active', now() - interval '1 day');

-- Note: the bcrypt string above is a non-functional placeholder. It is
-- syntactically shaped like a hash so the admin login path can be
-- exercised end to end without any real credential existing in git.

INSERT INTO user_tenant_membership (
    id, tenant_id, user_id, role_id, author_token,
    anonymous_override, invited_at, accepted_at, status
) VALUES
    -- Worker
    ('b0000000-0000-0000-0000-000000000021',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000001',
     'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
     NULL,
     now() - interval '40 days', now() - interval '40 days', 'active'),

    -- Supervisor
    ('b0000000-0000-0000-0000-000000000022',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000002',
     'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
     false,
     now() - interval '45 days', now() - interval '45 days', 'active'),

    -- Organisation admin
    ('b0000000-0000-0000-0000-000000000023',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000013',
     '00000000-0000-0000-0000-000000000003',
     'M7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
     false,
     now() - interval '50 days', now() - interval '50 days', 'active');

INSERT INTO user_site_assignment (
    id, tenant_id, membership_id, site_id, sub_site_id,
    is_primary, assignment_source, assigned_by_membership_id
) VALUES
    ('b0000000-0000-0000-0000-000000000031',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000021',
     'b0000000-0000-0000-0000-000000000003',
     'b0000000-0000-0000-0000-000000000004',
     true, 'admin', 'b0000000-0000-0000-0000-000000000023'),

    ('b0000000-0000-0000-0000-000000000032',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000022',
     'b0000000-0000-0000-0000-000000000003',
     NULL,
     true, 'admin', 'b0000000-0000-0000-0000-000000000023'),

    ('b0000000-0000-0000-0000-000000000033',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000023',
     'b0000000-0000-0000-0000-000000000003',
     NULL,
     true, 'admin', NULL);


-- ---------------------------------------------------------------------
-- 4. Content: PULSE template, Learn5 item, rescue plan
--    Created before qr_context because the context points at all three.
-- ---------------------------------------------------------------------
INSERT INTO pulse_template (
    id, tenant_id, name, description, steps,
    risk_type_code, task_type_code, version, status, published_at
) VALUES (
    'b0000000-0000-0000-0000-000000000041',
    'b0000000-0000-0000-0000-000000000001',
    'Heavy Lift PULSE',
    'Five-step behavioural pause before a heavy lift with a custom fixture.',
    '[
      {"key":"P","heading":"Pause",   "prompt":"Stop. Look at the whole lift zone before you touch anything."},
      {"key":"U","heading":"Understand","prompt":"What is the load, the weight, and which fixture is rigged to it?"},
      {"key":"L","heading":"Look",    "prompt":"Check the beam, shackles and slings for damage, wear or the wrong pin.",
       "learn5_item_id":"b0000000-0000-0000-0000-000000000051"},
      {"key":"S","heading":"Speak",   "prompt":"Confirm the exclusion zone out loud with the slinger and the crane operator."},
      {"key":"E","heading":"Engage",  "prompt":"Only start the lift when every person is clear of the suspended load path."}
    ]'::jsonb,
    'suspended_load',
    'heavy_lift',
    1,
    'active',
    now() - interval '30 days'
);

INSERT INTO learn5_item (
    id, tenant_id, title, summary, body_md,
    media_key, media_kind, delivery_mode,
    risk_type_code, task_type_code, tags,
    estimated_seconds, version, status, published_at
) VALUES (
    'b0000000-0000-0000-0000-000000000051',
    'b0000000-0000-0000-0000-000000000001',
    'Suspended loads and pinch points',
    'Five things to check on a custom lifting fixture before the load leaves the ground.',
    E'## Before the lift\n\n1. Confirm the fixture is the one named on the lift plan.\n2. Check the SWL plate is legible and matches the plan.\n3. Inspect shackle pins - a mismatched pin is the most common defect on custom beams.\n4. Walk the load path and clear it.\n5. Agree the exclusion zone out loud.\n\n## If anything is wrong\n\nStop the lift. Share a signal. Nobody is ever criticised for stopping a lift.',
    's3://safein5-content/brackley/learn5/suspended-loads.webp',
    'image',
    'native',
    'suspended_load',
    'heavy_lift',
    ARRAY['lifting', 'rigging', 'fixtures', 'exclusion-zone'],
    150,
    1,
    'published',
    now() - interval '28 days'
);

INSERT INTO rescue_plan (
    id, tenant_id, site_id, sub_site_id, asset_id,
    title, location_description,
    immediate_actions, roles_responsibilities, required_equipment, escalation_contacts,
    version, review_date, status, published_at
) VALUES (
    'b0000000-0000-0000-0000-000000000061',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    NULL,
    'Lifting Zone 3 - dropped or unstable load',
    'Lifting Zone 3, east of the primary crusher access road. Muster point M2 is 40 m north at the weighbridge.',
    '[
      {"seq":1,"action":"Stop the lift","detail":"Crane operator holds position. Nobody enters the load path."},
      {"seq":2,"action":"Clear and hold the exclusion zone","detail":"Slinger clears 15 m radius and holds it."},
      {"seq":3,"action":"Raise the alarm","detail":"Call the site lead on the radio, channel 2, and by phone."},
      {"seq":4,"action":"Casualty care","detail":"Trained first aider only. Do not move a casualty under a suspended load."},
      {"seq":5,"action":"Preserve the scene","detail":"No re-rigging until the site lead has released the area."}
    ]'::jsonb,
    '[
      {"role":"Crane operator","responsibility":"Hold the load, do not slew, await instruction."},
      {"role":"Slinger / signaller","responsibility":"Own and hold the exclusion zone."},
      {"role":"Site lead","responsibility":"Incident command, emergency services liaison, area release."},
      {"role":"First aider","responsibility":"Casualty care once the area is declared safe."}
    ]'::jsonb,
    '[
      {"item":"Trauma first aid kit","quantity":"1","location":"Weighbridge office, north wall"},
      {"item":"Radio (channel 2)","quantity":"per crew","location":"Carried"},
      {"item":"Exclusion barriers","quantity":"8","location":"Lifting Zone 3 store"}
    ]'::jsonb,
    '[
      {"name":"Priya Raman","role":"Site Lead","phone":"+44 1280 000101"},
      {"name":"Brackley North control room","role":"Control room","phone":"+44 1280 000100"},
      {"name":"Emergency services","role":"999","phone":"999"}
    ]'::jsonb,
    2,
    (current_date + interval '120 days')::date,
    'published',
    now() - interval '25 days'
);


-- ---------------------------------------------------------------------
-- 5. QR context and the physical code
--    One QR -> PULSE + rescue plan + Learn5 + feed (Dev Pack Sec 8.6).
--    default_destination = 'pulse' so the scan opens the behavioural
--    pause, not a menu.
-- ---------------------------------------------------------------------
INSERT INTO qr_context (
    id, tenant_id, name, description,
    site_id, sub_site_id, asset_id,
    task_type_code, risk_type_code,
    destinations, default_destination,
    pulse_template_id, rescue_plan_id, learn5_item_id,
    context_version, status
) VALUES (
    'b0000000-0000-0000-0000-000000000071',
    'b0000000-0000-0000-0000-000000000001',
    'Heavy lift - Lifting Zone 3 (SB-14)',
    'Barrier-mounted code at the Lifting Zone 3 entry gate, facing the crane pad.',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000006',
    'heavy_lift',
    'suspended_load',
    '[
      {"type":"pulse",       "ref":"b0000000-0000-0000-0000-000000000041","label":"PULSE - Heavy Lift","default":true},
      {"type":"rescue_plan", "ref":"b0000000-0000-0000-0000-000000000061","label":"Rescue Plan"},
      {"type":"learn5",      "ref":"b0000000-0000-0000-0000-000000000051","label":"Suspended loads and pinch points"},
      {"type":"feed",                                                     "label":"What is being shared here"}
    ]'::jsonb,
    'pulse',
    'b0000000-0000-0000-0000-000000000041',
    'b0000000-0000-0000-0000-000000000061',
    'b0000000-0000-0000-0000-000000000051',
    3,
    'active'
);

INSERT INTO qr_code (
    id, tenant_id, token, label, qr_context_id, status,
    sticker_serial, verified_at, verified_by_membership_id,
    printed_asset_url, scan_count, last_scanned_at, activated_at
) VALUES (
    'b0000000-0000-0000-0000-000000000072',
    'b0000000-0000-0000-0000-000000000001',
    'HJ7K3M9PQR2X',
    'Lifting Zone 3 entry barrier',
    'b0000000-0000-0000-0000-000000000071',
    'active',
    'BRK-STK-0014',
    now() - interval '20 days',
    'b0000000-0000-0000-0000-000000000023',
    's3://safein5-assets/brackley/qr/HJ7K3M9PQR2X.svg',
    37,
    now() - interval '3 hours',
    now() - interval '21 days'
);

-- Learn5 bindings: one to the QR context (so this code always surfaces
-- the item) and one to the risk type (so any future suspended-load
-- context inherits it with no extra admin step).
INSERT INTO learn5_binding (
    id, tenant_id, learn5_item_id,
    site_id, sub_site_id, asset_id, qr_context_id, pulse_template_id, risk_type_code,
    priority
) VALUES
    ('b0000000-0000-0000-0000-000000000052',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000051',
     NULL, NULL, NULL, 'b0000000-0000-0000-0000-000000000071', NULL, NULL,
     10),
    ('b0000000-0000-0000-0000-000000000053',
     'b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000051',
     NULL, NULL, NULL, NULL, NULL, 'suspended_load',
     50);


-- ---------------------------------------------------------------------
-- 6. A scan, a PULSE session, and a Learn5 view
--    qr_scan_event and learn5_view are keyed by author_token only -- no
--    user_id column exists on either table.
-- ---------------------------------------------------------------------
INSERT INTO qr_scan_event (
    id, tenant_id, qr_code_id, qr_context_id, author_token,
    is_first_scan_for_token, entry_point, sticker_serial, occurred_at
) VALUES (
    'b0000000-0000-0000-0000-000000000073',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000072',
    'b0000000-0000-0000-0000-000000000071',
    'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
    false,
    'qr',
    'BRK-STK-0014',
    now() - interval '3 hours'
);

-- Anonymous session: is_anonymous true, so author_user_id is NULL. This
-- is the anonymity invariant (ck_pulse_session_anonymity) in action.
INSERT INTO pulse_session (
    id, tenant_id, author_token, author_user_id, is_anonymous,
    entry_point, qr_code_id, pulse_template_id,
    context_snapshot, site_id, sub_site_id, asset_id,
    task_type_code, risk_type_code,
    started_at, completed_at, steps_completed, duration_ms, outcome
) VALUES (
    'b0000000-0000-0000-0000-000000000081',
    'b0000000-0000-0000-0000-000000000001',
    'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
    NULL,
    true,
    'qr',
    'b0000000-0000-0000-0000-000000000072',
    'b0000000-0000-0000-0000-000000000041',
    '{"siteName":"Brackley North Quarry","subSiteName":"Lifting Zone 3","assetName":"Spreader Beam SB-14 (custom lifting fixture)","taskType":"heavy_lift","riskType":"suspended_load","contextVersion":3}'::jsonb,
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000006',
    'heavy_lift',
    'suspended_load',
    now() - interval '3 hours',
    now() - interval '3 hours' + interval '48 seconds',
    ARRAY['P','U','L','S','E'],
    48000,
    'completed_with_signal'
);

INSERT INTO learn5_view (
    id, tenant_id, learn5_item_id, author_token, source, qr_code_id,
    started_at, completed_at, dwell_ms, completed
) VALUES (
    'b0000000-0000-0000-0000-000000000054',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000051',
    'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
    'pulse',
    'b0000000-0000-0000-0000-000000000072',
    now() - interval '3 hours' + interval '20 seconds',
    now() - interval '3 hours' + interval '2 minutes',
    100000,
    true
);


-- ---------------------------------------------------------------------
-- 7. Four behaviour signals across the three classifications
--
--    ...0091  be_aware            ANONYMOUS, from the PULSE session above,
--                                 with a photo. author_user_id IS NULL.
--    ...0092  be_aware            attributed, same asset -- this is the
--                                 second of the "3 similar Be Aware
--                                 signals on custom lifting fixtures".
--    ...0093  good_practice       attributed, supervisor-authored.
--    ...0094  needs_attention_now attributed, triggers the review task.
-- ---------------------------------------------------------------------
INSERT INTO behaviour_signal (
    id, tenant_id, status, visibility,
    author_token, author_user_id, is_anonymous,
    pulse_session_id, qr_code_id, entry_point,
    classification_code, classified_at, classification_latency_ms, capture_latency_ms,
    body_text, body_source,
    site_id, sub_site_id, asset_id, context_snapshot,
    task_type_code, risk_type_code,
    occurred_at, finalised_at,
    media_state, moderation_state, workflow_state,
    created_at
) VALUES
-- 1. Anonymous Be Aware, from PULSE, with media.
('b0000000-0000-0000-0000-000000000091',
 'b0000000-0000-0000-0000-000000000001',
 'final', 'site',
 'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ', NULL, true,
 'b0000000-0000-0000-0000-000000000081',
 'b0000000-0000-0000-0000-000000000072',
 'qr',
 'be_aware', now() - interval '3 hours' + interval '55 seconds', 4200, 41000,
 'Shackle pin on SB-14 is not the pin listed on the lift plan. Lift was stopped and the beam swapped.',
 'voice_transcript',
 'b0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000006',
 '{"siteName":"Brackley North Quarry","subSiteName":"Lifting Zone 3","assetName":"Spreader Beam SB-14 (custom lifting fixture)","taskType":"heavy_lift","riskType":"suspended_load","contextVersion":3}'::jsonb,
 'heavy_lift', 'suspended_load',
 now() - interval '3 hours', now() - interval '3 hours' + interval '58 seconds',
 'ready', 'visible', NULL,
 now() - interval '3 hours'),

-- 2. Attributed Be Aware, same asset, nine days earlier.
('b0000000-0000-0000-0000-000000000092',
 'b0000000-0000-0000-0000-000000000001',
 'final', 'site',
 'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
 'b0000000-0000-0000-0000-000000000012', false,
 NULL, 'b0000000-0000-0000-0000-000000000072', 'qr',
 'be_aware', now() - interval '9 days' + interval '30 seconds', 5100, 52000,
 'SWL plate on the spreader beam is worn and hard to read from the ground. Second time this month.',
 'typed',
 'b0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000006',
 '{"siteName":"Brackley North Quarry","subSiteName":"Lifting Zone 3","assetName":"Spreader Beam SB-14 (custom lifting fixture)","taskType":"heavy_lift","riskType":"suspended_load","contextVersion":3}'::jsonb,
 'heavy_lift', 'suspended_load',
 now() - interval '9 days', now() - interval '9 days' + interval '35 seconds',
 'none', 'visible', NULL,
 now() - interval '9 days'),

-- 3. Good Practice, attributed, org admin walking the zone.
('b0000000-0000-0000-0000-000000000093',
 'b0000000-0000-0000-0000-000000000001',
 'final', 'site',
 'M7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
 'b0000000-0000-0000-0000-000000000013', false,
 NULL, NULL, 'direct',
 'good_practice', now() - interval '5 days' + interval '20 seconds', 3100, 28000,
 'Night crew barriered the full 15 m exclusion zone before rigging, without being asked. Good to see.',
 'typed',
 'b0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000006',
 '{"siteName":"Brackley North Quarry","subSiteName":"Lifting Zone 3","taskType":"heavy_lift","riskType":"suspended_load","contextVersion":3}'::jsonb,
 'heavy_lift', 'suspended_load',
 now() - interval '5 days', now() - interval '5 days' + interval '25 seconds',
 'none', 'visible', NULL,
 now() - interval '5 days'),

-- 4. Needs Attention Now -- classification.triggers_workflow is true, so
--    the outbox consumer opens a review_task (seeded below).
('b0000000-0000-0000-0000-000000000094',
 'b0000000-0000-0000-0000-000000000001',
 'final', 'site',
 'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
 'b0000000-0000-0000-0000-000000000011', false,
 NULL, 'b0000000-0000-0000-0000-000000000072', 'qr',
 'needs_attention_now', now() - interval '2 days' + interval '18 seconds', 2600, 33000,
 'Sling stored on the crusher walkway is frayed at the eye. Tagged it out and left it where it is.',
 'voice_transcript',
 'b0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000005',
 NULL,
 '{"siteName":"Brackley North Quarry","subSiteName":"Primary Crusher Area","taskType":"maintenance","riskType":"dropped_object","contextVersion":3}'::jsonb,
 'maintenance', 'dropped_object',
 now() - interval '2 days', now() - interval '2 days' + interval '38 seconds',
 'none', 'visible', 'acknowledged',
 now() - interval '2 days');

-- The classification audit trail. from_code is NULL on a first
-- classification -- there was nothing to change from.
INSERT INTO signal_classification_event (
    tenant_id, signal_id, from_code, to_code,
    changed_by_role, changed_by_token, source, created_at
) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000091',
     NULL, 'be_aware',            'worker',     'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ', 'worker',
     now() - interval '3 hours' + interval '55 seconds'),
    ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000092',
     NULL, 'be_aware',            'supervisor', 'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ', 'worker',
     now() - interval '9 days' + interval '30 seconds'),
    ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000093',
     NULL, 'good_practice',       'org_admin',  'M7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ', 'worker',
     now() - interval '5 days' + interval '20 seconds'),
    ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000094',
     NULL, 'needs_attention_now', 'worker',     'J7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ', 'worker',
     now() - interval '2 days' + interval '18 seconds');

-- One photo on the anonymous signal. exif_stripped is true by CHECK:
-- there is no way to record a stored derivative that kept its EXIF.
INSERT INTO signal_media (
    id, tenant_id, signal_id, kind, state,
    storage_key, thumb_key,
    mime_type, byte_size, width, height, checksum_sha256,
    upload_started_at, upload_completed_at, processed_at
) VALUES (
    'b0000000-0000-0000-0000-0000000000a1',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000091',
    'photo',
    'ready',
    's3://safein5-media/b0000000-0000-0000-0000-000000000001/2026/07/b0000000-0000-0000-0000-000000000091/b0000000-0000-0000-0000-0000000000a1.webp',
    's3://safein5-media/b0000000-0000-0000-0000-000000000001/2026/07/b0000000-0000-0000-0000-000000000091/b0000000-0000-0000-0000-0000000000a1_thumb.webp',
    'image/webp',
    352104,
    2048,
    1536,
    '9f2c4e1b7a0d63558ee1c0a4b3d29f7615c8e0a2b4d6f81397a5c2e4b6d80f13',
    now() - interval '3 hours' + interval '12 seconds',
    now() - interval '3 hours' + interval '39 seconds',
    now() - interval '3 hours' + interval '51 seconds'
);


-- ---------------------------------------------------------------------
-- 8. Supervisor workflow (PRD Sec 5.4: Acknowledge + Close only)
--    The Needs Attention Now signal has been acknowledged but not closed,
--    so first_response_ms is populated and time_to_close_ms is not --
--    which is exactly the "report black hole" metric mid-flight.
-- ---------------------------------------------------------------------
INSERT INTO review_task (
    id, tenant_id, signal_id, state,
    acknowledged_at, acknowledged_by_membership_id,
    due_at, first_response_ms,
    created_at
) VALUES (
    'b0000000-0000-0000-0000-0000000000b1',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000094',
    'acknowledged',
    now() - interval '2 days' + interval '3 hours',
    'b0000000-0000-0000-0000-000000000022',
    now() - interval '2 days' + interval '24 hours',
    10800000,
    now() - interval '2 days' + interval '40 seconds'
);

INSERT INTO workflow_transition (
    tenant_id, review_task_id, from_state, to_state,
    actor_membership_id, actor_role, note, created_at
) VALUES
    ('b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-0000000000b1',
     NULL, 'open',
     NULL, 'system',
     'Opened automatically by WorkflowTaskCreator: classification.triggers_workflow = true.',
     now() - interval '2 days' + interval '40 seconds'),
    ('b0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-0000000000b1',
     'open', 'acknowledged',
     'b0000000-0000-0000-0000-000000000022', 'supervisor',
     'Seen. Sling removed from service, replacement ordered.',
     now() - interval '2 days' + interval '3 hours');


-- ---------------------------------------------------------------------
-- 9. Read state -- keyed by the READER's token, never a user id.
-- ---------------------------------------------------------------------
INSERT INTO signal_read_state (tenant_id, author_token, signal_id, seen_at, opened_at)
VALUES
    ('b0000000-0000-0000-0000-000000000001',
     'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
     'b0000000-0000-0000-0000-000000000091',
     now() - interval '2 hours', now() - interval '2 hours' + interval '9 seconds'),
    ('b0000000-0000-0000-0000-000000000001',
     'K7K3M9PQR2XVT4YB8CDEFGH1N5S6W0AZ',
     'b0000000-0000-0000-0000-000000000094',
     now() - interval '2 days' + interval '3 hours', now() - interval '2 days' + interval '3 hours');

COMMIT;

-- =====================================================================
-- RUNNABLE JOIN EXAMPLES
-- Run these with the tenant GUC set, e.g.
--   BEGIN;
--   SELECT set_config('app.tenant_id','b0000000-0000-0000-0000-000000000001',true);
--   ... query ...
--   COMMIT;
--
-- 1. The flagship supervisor insight -- "similar Be Aware signals, all on
--    custom lifting fixtures". A GROUP BY on a real column, not a text
--    search, which is why asset is a table:
--
--      SELECT a.name, a.asset_type, count(*) AS be_aware_count
--        FROM behaviour_signal s
--        JOIN asset a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
--       WHERE s.classification_code = 'be_aware'
--         AND s.status = 'final'
--         AND s.deleted_at IS NULL
--         AND s.created_at > now() - interval '14 days'
--       GROUP BY a.name, a.asset_type
--       ORDER BY be_aware_count DESC;
--
-- 2. The QR resolve query (Architecture Sec 6.2: one round trip):
--
--      SELECT q.status, c.task_type_code, c.risk_type_code, c.destinations,
--             si.name AS site_name, ss.name AS sub_site_name, a.name AS asset_name,
--             pt.name AS pulse_name, rp.title AS rescue_plan_title, li.title AS learn5_title
--        FROM qr_code q
--        LEFT JOIN qr_context    c  ON c.id  = q.qr_context_id
--        LEFT JOIN site          si ON si.id = c.site_id
--        LEFT JOIN sub_site      ss ON ss.id = c.sub_site_id
--        LEFT JOIN asset         a  ON a.id  = c.asset_id
--        LEFT JOIN pulse_template pt ON pt.id = c.pulse_template_id
--        LEFT JOIN rescue_plan   rp ON rp.id = c.rescue_plan_id
--        LEFT JOIN learn5_item   li ON li.id = c.learn5_item_id
--       WHERE q.token = 'HJ7K3M9PQR2X';
--
-- 3. Echo -> Signal, and the anonymity invariant holding:
--
--      SELECT ps.outcome, ps.duration_ms, s.classification_code,
--             s.is_anonymous, s.author_user_id
--        FROM pulse_session ps
--        JOIN behaviour_signal s ON s.pulse_session_id = ps.id
--       WHERE ps.id = 'b0000000-0000-0000-0000-000000000081';
--      -- is_anonymous = true AND author_user_id IS NULL.
--
-- 4. Feed ordering, red first (WRK-013), in SQL not application code:
--
--      SELECT cl.label, s.body_text, s.created_at
--        FROM behaviour_signal s
--        JOIN classification cl ON cl.code = s.classification_code
--       WHERE s.status = 'final' AND s.deleted_at IS NULL
--       ORDER BY cl.severity_ordinal DESC, s.created_at DESC;
--
-- 5. Repeat usage across anonymous and attributed signals -- the primary
--    success measure, which literal metadata stripping would destroy:
--
--      SELECT count(*) AS repeat_authors FROM (
--        SELECT author_token FROM behaviour_signal
--         WHERE status = 'final'
--         GROUP BY author_token HAVING count(*) > 1) t;
-- =====================================================================
