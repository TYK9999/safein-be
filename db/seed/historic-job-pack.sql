-- SafeIn5 historic job-pack seed
-- Source: docs/extraction/
-- Generated from the extraction proposal and photographed IMSF 100 pages 1-3.
--
-- Data-quality rules:
--   * Everything is inserted as draft/unpublished.
--   * Page 4 was not supplied; no page-4 checks are invented.
--   * HIRA, method statement, permit and rescue-plan values come from the
--     proposal's example extraction; their source files still need verification.
--   * The script is safe to re-run for this seed dataset.
--
-- Run after db/schema/schema.sql:
--   psql -U postgres -d safein5 -v ON_ERROR_STOP=1 \
--     -f db/seed/historic-job-pack.sql

BEGIN;

DO $seed$
DECLARE
    v_tenant_id       integer;
    v_site_id         integer;
    v_space_id        integer;
    v_task_id         integer;
    v_hira_doc_id     integer;
    v_method_doc_id   integer;
    v_check_doc_id    integer;
    v_check_pack_id   integer;
    v_uncover_pack_id integer;
BEGIN
    -- Client / site / asset-space
    SELECT id INTO v_tenant_id
    FROM tenant
    WHERE name = 'Tarmac' AND kind = 'corporate'
    ORDER BY id
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        INSERT INTO tenant (name, kind)
        VALUES ('Tarmac', 'corporate')
        RETURNING id INTO v_tenant_id;
    END IF;

    SELECT id INTO v_site_id
    FROM site
    WHERE tenant_id = v_tenant_id AND name = 'Dolyhir'
    ORDER BY id
    LIMIT 1;

    IF v_site_id IS NULL THEN
        INSERT INTO site (tenant_id, name)
        VALUES (v_tenant_id, 'Dolyhir')
        RETURNING id INTO v_site_id;
    END IF;

    SELECT id INTO v_space_id
    FROM space
    WHERE tenant_id = v_tenant_id
      AND site_id = v_site_id
      AND name = 'Hot Aggregate Bins'
    ORDER BY id
    LIMIT 1;

    IF v_space_id IS NULL THEN
        INSERT INTO space (
            tenant_id, site_id, name, location, asset_type, task_type,
            permit_required, rescue_plan_required, owner_rule
        )
        VALUES (
            v_tenant_id, v_site_id, 'Hot Aggregate Bins', 'Asphalt Plant',
            'Hot aggregate bins / confined space',
            'Repair / maintenance within Hot Aggregate Bins',
            true, true, 'Supervisor, Dolyhir'
        )
        RETURNING id INTO v_space_id;
    END IF;

    -- Source documents. Only IMSF 100 image pages are physically attached.
    SELECT id INTO v_hira_doc_id
    FROM document
    WHERE tenant_id = v_tenant_id
      AND title = 'Hot Bins HIRA / RAMS'
    ORDER BY id LIMIT 1;

    IF v_hira_doc_id IS NULL THEN
        INSERT INTO document (tenant_id, title, doc_type, status)
        VALUES (v_tenant_id, 'Hot Bins HIRA / RAMS', 'risk_assessment', 'draft')
        RETURNING id INTO v_hira_doc_id;
        INSERT INTO document_revision (
            document_id, revision, s3_key, mime_type, is_current
        )
        VALUES (
            v_hira_doc_id, 'HOTBINSRA01',
            'seed/pending-verification/HOTBINSRA01',
            'application/octet-stream', true
        );
    END IF;

    SELECT id INTO v_method_doc_id
    FROM document
    WHERE tenant_id = v_tenant_id
      AND title = 'Hot Bins Method Statement'
    ORDER BY id LIMIT 1;

    IF v_method_doc_id IS NULL THEN
        INSERT INTO document (tenant_id, title, doc_type, status)
        VALUES (v_tenant_id, 'Hot Bins Method Statement', 'other', 'draft')
        RETURNING id INTO v_method_doc_id;
        INSERT INTO document_revision (
            document_id, revision, s3_key, mime_type, is_current
        )
        VALUES (
            v_method_doc_id, 'HOTBINSMS01',
            'seed/pending-verification/HOTBINSMS01',
            'application/octet-stream', true
        );
    END IF;

    SELECT id INTO v_check_doc_id
    FROM document
    WHERE tenant_id = v_tenant_id
      AND title = 'IMSF 100 - Confined Spaces Checklist'
    ORDER BY id LIMIT 1;

    IF v_check_doc_id IS NULL THEN
        INSERT INTO document (tenant_id, title, doc_type, status)
        VALUES (
            v_tenant_id, 'IMSF 100 - Confined Spaces Checklist',
            'checklist', 'draft'
        )
        RETURNING id INTO v_check_doc_id;
        INSERT INTO document_revision (
            document_id, revision, s3_key, mime_type, is_current
        )
        VALUES (
            v_check_doc_id, 'Version 1 Revision 0 - June 2024',
            'seed/docs/extraction/IMSF-100-pages-1-3-incomplete',
            'image/jpeg', true
        );
    END IF;

    -- Reusable job/task template represented by an archived work task until
    -- a dedicated template entity exists.
    SELECT id INTO v_task_id
    FROM work_task
    WHERE tenant_id = v_tenant_id
      AND reference = 'HIST-HOTBINS-001'
    ORDER BY id LIMIT 1;

    IF v_task_id IS NULL THEN
        INSERT INTO work_task (
            tenant_id, site_id, space_id, reference, work_description, status,
            permit_required, permit_type, rams_document_id, rams_reference
        )
        VALUES (
            v_tenant_id, v_site_id, v_space_id, 'HIST-HOTBINS-001',
            'Repairs to Hot Bins / Chutes', 'archived', true,
            'Confined Space; Hot Work; Working at Height',
            v_hira_doc_id, 'HOTBINSRA01'
        )
        RETURNING id INTO v_task_id;
    END IF;

    -- Attach source documents. Conflict prevention is explicit because the MVP
    -- placement table intentionally has no polymorphic unique constraint.
    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_hira_doc_id
          AND scope_kind = 'work_task' AND work_task_id = v_task_id
    ) THEN
        INSERT INTO document_placement (
            document_id, scope_kind, work_task_id, inherited
        ) VALUES (v_hira_doc_id, 'work_task', v_task_id, false);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_method_doc_id
          AND scope_kind = 'work_task' AND work_task_id = v_task_id
    ) THEN
        INSERT INTO document_placement (
            document_id, scope_kind, work_task_id, inherited
        ) VALUES (v_method_doc_id, 'work_task', v_task_id, false);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM document_placement
        WHERE document_id = v_check_doc_id
          AND scope_kind = 'space' AND space_id = v_space_id
    ) THEN
        INSERT INTO document_placement (
            document_id, scope_kind, space_id, inherited
        ) VALUES (v_check_doc_id, 'space', v_space_id, false);
    END IF;

    -- Job Checklist extracted from the supplied photographs (pages 1-3 only).
    SELECT id INTO v_check_pack_id
    FROM content_pack
    WHERE tenant_id = v_tenant_id
      AND kind = 'job_checklist'
      AND title = 'IMSF 100 - Confined Spaces Checklist (pages 1-3)'
    ORDER BY id LIMIT 1;

    IF v_check_pack_id IS NULL THEN
        INSERT INTO content_pack (
            tenant_id, kind, title, category, status, revision
        )
        VALUES (
            v_tenant_id, 'job_checklist',
            'IMSF 100 - Confined Spaces Checklist (pages 1-3)',
            'Confined space', 'draft', 'Version 1 Revision 0 - June 2024'
        )
        RETURNING id INTO v_check_pack_id;
    END IF;

    DELETE FROM content_prompt WHERE content_pack_id = v_check_pack_id;

    INSERT INTO content_prompt (
        content_pack_id, sort_order, body_text, is_critical, is_mandatory
    )
    SELECT v_check_pack_id, x.sort_order, x.body_text, x.is_critical, true
    FROM (VALUES
        ( 1, 'Can the need to enter the confined space be avoided?', false),
        ( 2, 'Can the confined space be permanently reclassified by removing the enclosed nature?', false),
        ( 3, 'Can the confined space be permanently reclassified by removing the specified hazards?', false),
        ( 4, 'Can the confined space be temporarily reclassified by forced ventilation?', false),
        ( 5, 'Can sufficient time for safe evacuation be achieved if ventilation fails?', true),
        ( 6, 'Has a specific risk assessment been completed for the confined space?', true),
        ( 7, 'Has the risk assessment considered all conditions of operation, including abnormal conditions?', true),
        ( 8, 'Has the risk assessment considered risks created by the planned work?', true),
        ( 9, 'Has a safe working procedure / safe system of work been prepared?', true),
        (10, 'Does the safe working procedure specify emergency measures?', true),
        (11, 'Has a Confined Space Permit been raised with the required control measures?', true),
        (12, 'Has a suitable warning sign been posted to identify the confined space?', false),
        (13, 'Has the confined space been secured against unauthorised access?', true),
        (14, 'Are fixed gas detectors or low-oxygen monitors provided and suitably located?', true),
        (15, 'Are gas detectors adequately maintained and tested?', true),
        (16, 'Can the confined space be ventilated naturally to reduce unsafe atmosphere risk?', true),
        (17, 'Is there adequate communication between persons inside the confined space and those outside?', true),
        (18, 'Is sufficient ventilation available for the period of entry?', true),
        (19, 'Is the oxygen level safe and is an explosive atmosphere prevented?', true),
        (20, 'Is lighting inside the confined space adequate?', false),
        (21, 'Can ambient temperature be controlled or monitored to prevent excessive build-up?', true),
        (22, 'Has adequate access been provided for safe entry?', true),
        (23, 'Can access routes and walkways be opened safely?', true),
        (24, 'Is access large enough for rescue while wearing breathing apparatus?', true),
        (25, 'Is sufficient access equipment available, such as a tripod or harness?', true),
        (26, 'Have all entrants received confined-space training and demonstrated competence?', true),
        (27, 'Have layout and fitness constraints identified by the risk assessment been addressed?', true),
        (28, 'Has a competent permit issuer been appointed to supervise the activity?', true),
        (29, 'Are employees and contractors aware that a permit is required before entry?', true),
        (30, 'Are employees and contractors aware of procedures when task or environment changes?', true),
        (31, 'Has the confined space been emptied of contents, including residues where possible?', true),
        (32, 'Has the inside of the confined space been cleaned?', true),
        (33, 'Has pipework been isolated to prevent gas, fume or vapour entering?', true),
        (34, 'Can mechanical and electrical isolation prevent connected plant operating or discharging?', true),
        (35, 'Was every isolation checked before work commenced?', true),
        (36, 'Was the atmosphere verified as safe before entry?', true),
        (37, 'Are signs displayed outside and is hot work controlled while people are inside?', true),
        (38, 'Are electrical tools protected by suitable precautions and residual-current devices?', true),
        (39, 'Are personal air-monitoring devices calibrated and provided where required?', true),
        (40, 'Have monitors and ELSA been checked before entry where required?', true),
        (41, 'Has the correct type of PPE been specified for each activity?', true),
        (42, 'Has suitable PPE been provided and is it being used?', true),
        (43, 'Is PPE in good condition and appropriate for the space?', true),
        (44, 'Has an emergency plan been prepared for this confined-space entry?', true),
        (45, 'Has the site identified suitable emergency arrangements before work commences?', true),
        (46, 'Has a rescue procedure been defined and communicated?', true),
        (47, 'Is there a suitable method of raising the alarm?', true),
        (48, 'Has emergency-service response time been considered?', true),
        (49, 'Has rescue and resuscitation equipment been identified and provided?', true),
        (50, 'Are first-aid provisions adequate?', true),
        (51, 'Are emergency responders adequately trained and practised?', true),
        (52, 'If breathing apparatus is required, is access at least 575 mm square?', true)
    ) AS x(sort_order, body_text, is_critical);

    IF NOT EXISTS (
        SELECT 1 FROM content_placement
        WHERE content_pack_id = v_check_pack_id
          AND scope_kind = 'space' AND space_id = v_space_id
    ) THEN
        INSERT INTO content_placement (
            content_pack_id, scope_kind, space_id
        ) VALUES (v_check_pack_id, 'space', v_space_id);
    END IF;

    -- Five AI-proposed PULSE Uncover checks. Kept as draft pending admin review.
    SELECT id INTO v_uncover_pack_id
    FROM content_pack
    WHERE tenant_id = v_tenant_id
      AND kind = 'uncover'
      AND title = 'Hot Aggregate Bins - draft Uncover checks'
    ORDER BY id LIMIT 1;

    IF v_uncover_pack_id IS NULL THEN
        INSERT INTO content_pack (
            tenant_id, kind, title, category, status
        )
        VALUES (
            v_tenant_id, 'uncover',
            'Hot Aggregate Bins - draft Uncover checks',
            'Confined space', 'draft'
        )
        RETURNING id INTO v_uncover_pack_id;
    END IF;

    DELETE FROM content_prompt WHERE content_pack_id = v_uncover_pack_id;
    INSERT INTO content_prompt (
        content_pack_id, sort_order, body_text, is_critical, is_mandatory
    ) VALUES
        (v_uncover_pack_id, 1, 'RAMS / permit verified and understood?', true, true),
        (v_uncover_pack_id, 2, 'Plant isolated and try/test completed?', true, true),
        (v_uncover_pack_id, 3, 'Atmosphere tested and safe for entry?', true, true),
        (v_uncover_pack_id, 4, 'Required PPE and rescue equipment available and checked?', true, true),
        (v_uncover_pack_id, 5, 'Top man, communications and rescue arrangements confirmed?', true, true);

    IF NOT EXISTS (
        SELECT 1 FROM content_placement
        WHERE content_pack_id = v_uncover_pack_id
          AND scope_kind = 'work_task' AND work_task_id = v_task_id
    ) THEN
        INSERT INTO content_placement (
            content_pack_id, scope_kind, work_task_id
        ) VALUES (v_uncover_pack_id, 'work_task', v_task_id);
    END IF;
END
$seed$;

COMMIT;

-- Verification summary
SELECT
    t.name AS tenant,
    s.name AS site,
    sp.location AS area,
    sp.name AS asset_space,
    wt.reference AS job_task_id,
    wt.work_description AS job_task,
    wt.rams_reference,
    wt.permit_type,
    wt.permit_required,
    sp.rescue_plan_required
FROM work_task wt
JOIN tenant t ON t.id = wt.tenant_id
LEFT JOIN site s ON s.id = wt.site_id
LEFT JOIN space sp ON sp.id = wt.space_id
WHERE t.name = 'Tarmac' AND wt.reference = 'HIST-HOTBINS-001';

SELECT cp.kind, cp.title, cp.status, count(p.id) AS prompt_count
FROM content_pack cp
LEFT JOIN content_prompt p ON p.content_pack_id = cp.id
JOIN tenant t ON t.id = cp.tenant_id
WHERE t.name = 'Tarmac'
  AND cp.title IN (
      'IMSF 100 - Confined Spaces Checklist (pages 1-3)',
      'Hot Aggregate Bins - draft Uncover checks'
  )
GROUP BY cp.id, cp.kind, cp.title, cp.status
ORDER BY cp.kind;
