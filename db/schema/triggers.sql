-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_app_user_updated_at               BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_auth_token_updated_at             BEFORE UPDATE ON auth_token
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenant_updated_at                 BEFORE UPDATE ON tenant
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_tenant_membership_updated_at BEFORE UPDATE ON user_tenant_membership
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_updated_at                   BEFORE UPDATE ON site
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_updated_at                   BEFORE UPDATE ON role
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_site_membership_updated_at   BEFORE UPDATE ON user_site_membership
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_permission_updated_at             BEFORE UPDATE ON permission
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_permission_updated_at        BEFORE UPDATE ON role_permission
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_space_updated_at                  BEFORE UPDATE ON space
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_hazard_category_updated_at        BEFORE UPDATE ON hazard_category
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_category_owner_updated_at    BEFORE UPDATE ON site_category_owner
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenant_privacy_request_updated_at BEFORE UPDATE ON tenant_privacy_request
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_document_updated_at               BEFORE UPDATE ON document
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_document_revision_updated_at      BEFORE UPDATE ON document_revision
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_document_placement_updated_at     BEFORE UPDATE ON document_placement
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_pack_updated_at           BEFORE UPDATE ON content_pack
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_prompt_updated_at         BEFORE UPDATE ON content_prompt
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_asset_updated_at          BEFORE UPDATE ON content_asset
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_placement_updated_at      BEFORE UPDATE ON content_placement
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_task_updated_at              BEFORE UPDATE ON work_task
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_task_crew_updated_at         BEFORE UPDATE ON work_task_crew
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_task_content_prompt_updated_at BEFORE UPDATE ON work_task_content_prompt
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_task_prompt_setting_updated_at BEFORE UPDATE ON work_task_prompt_setting
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_task_learn5_media_updated_at BEFORE UPDATE ON work_task_learn5_media
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pulse_updated_at                  BEFORE UPDATE ON pulse
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pulse_event_updated_at           BEFORE UPDATE ON pulse_event
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pulse_checklist_response_updated_at
    BEFORE UPDATE ON pulse_checklist_response
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pulse_content_ack_updated_at
    BEFORE UPDATE ON pulse_content_acknowledgement
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_signal_updated_at                 BEFORE UPDATE ON signal
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_signal_classification_event_updated_at BEFORE UPDATE ON signal_classification_event
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_signal_acknowledgement_updated_at BEFORE UPDATE ON signal_acknowledgement
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_upload_session_updated_at         BEFORE UPDATE ON upload_session
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_audio_clip_updated_at             BEFORE UPDATE ON audio_clip
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transcription_job_updated_at      BEFORE UPDATE ON transcription_job
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_signal_media_updated_at           BEFORE UPDATE ON signal_media
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_checklist_completion_updated_at   BEFORE UPDATE ON checklist_completion
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_realtime_connection_updated_at    BEFORE UPDATE ON realtime_connection
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_realtime_connection_room_updated_at BEFORE UPDATE ON realtime_connection_room
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_realtime_message_updated_at       BEFORE UPDATE ON realtime_message
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
