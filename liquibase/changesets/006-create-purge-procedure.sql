-- liquibase formatted sql
-- changeset ravi.kundu:006-create-purge-procedure splitStatements:false
-- comment: Stored procedure to auto-purge expired AI keys and expired user sessions

CREATE OR REPLACE FUNCTION purge_expired_api_keys()
RETURNS INT AS $$
DECLARE
    deleted_keys INT;
BEGIN
    DELETE FROM user_ai_configurations
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_keys = ROW_COUNT;

    -- Also deactivate expired sessions
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;

    RETURN deleted_keys;
END;
$$ LANGUAGE plpgsql;
