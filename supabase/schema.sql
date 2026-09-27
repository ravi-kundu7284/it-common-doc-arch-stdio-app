-- ============================================================================
-- DocArch AI - PostgreSQL Database Schema (for Supabase & Liquibase)
-- ============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Create dedicated 'dev' schema and grant permissions to Supabase roles
CREATE SCHEMA IF NOT EXISTS dev;

GRANT USAGE ON SCHEMA dev TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA dev TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA dev TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA dev TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 1. User Accounts Table
-- Stores user credentials securely. Passwords are encrypted with PBKDF2 + unique random salt.
-- Tracks failed attempts for automated 2-minute lockout after 3 failed attempts.
CREATE TABLE IF NOT EXISTS dev.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    full_name VARCHAR(100),
    designation VARCHAR(100) DEFAULT 'Software Architect',
    role VARCHAR(20) DEFAULT 'architect', -- 'architect' | 'admin' | 'reviewer'
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    reset_token VARCHAR(128),
    reset_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast lookup indexes for authentication and security checks
CREATE INDEX IF NOT EXISTS idx_users_email ON dev.app_users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON dev.app_users(username);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON dev.app_users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_locked ON dev.app_users(locked_until);

-- 2. User AI Configurations Table
-- Stores AI provider settings and AES-256-GCM encrypted API keys with auto-expiry.
CREATE TABLE IF NOT EXISTS dev.user_ai_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES dev.app_users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'builtin', -- 'builtin' | 'gemini' | 'openai' | 'anthropic'
    model_name VARCHAR(50) NOT NULL DEFAULT 'gemini-1.5-pro',
    encrypted_api_key TEXT,                          -- AES-256-GCM ciphertext
    key_iv TEXT,                                     -- 12-byte IV in hex
    key_auth_tag TEXT,                               -- GCM Authentication Tag in hex
    key_last4 VARCHAR(8),                            -- Preview mask (e.g. "...4a89") for UI recognition
    expires_at TIMESTAMP WITH TIME ZONE,             -- Automated expiry timestamp
    expires_in_days INT DEFAULT 30,                  -- User-selected duration (1, 7, 14, 30, 90)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ai_config_user ON dev.user_ai_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_expiry ON dev.user_ai_configurations(expires_at);

-- 3. User Sessions Table
-- Tracks active user sessions with token verification, IP, user-agent, and remote revocation.
CREATE TABLE IF NOT EXISTS dev.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES dev.app_users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON dev.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON dev.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON dev.user_sessions(is_active, expires_at);

-- 4. Security Audit Logs Table
-- Records security events for Admin portal oversight (logins, lockouts, resets, key purges)
CREATE TABLE IF NOT EXISTS dev.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES dev.app_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET_REQ', 'PASSWORD_RESET_SUCCESS', 'KEY_PURGED', 'ADMIN_ROLE_CHANGE'
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON dev.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON dev.security_audit_logs(user_id);

-- 5. Stored Procedure to Auto-Purge Expired Keys & Deactivate Expired Sessions
CREATE OR REPLACE FUNCTION dev.purge_expired_api_keys()
RETURNS INT AS $$
DECLARE
    deleted_keys INT;
BEGIN
    DELETE FROM dev.user_ai_configurations
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_keys = ROW_COUNT;

    UPDATE dev.user_sessions
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;

    RETURN deleted_keys;
END;
$$ LANGUAGE plpgsql;

-- 6. Row Level Security (RLS)
ALTER TABLE dev.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.user_ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on app_users" ON dev.app_users;
CREATE POLICY "App full access on app_users"
    ON dev.app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on user_ai_configurations" ON dev.user_ai_configurations;
CREATE POLICY "App full access on user_ai_configurations"
    ON dev.user_ai_configurations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on user_sessions" ON dev.user_sessions;
CREATE POLICY "App full access on user_sessions"
    ON dev.user_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_audit_logs" ON dev.security_audit_logs;
CREATE POLICY "App full access on security_audit_logs"
    ON dev.security_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Seed Initial Enterprise Accounts
-- Architect: architect@docarch.ai / Architect123!
-- Admin: admin@docarch.ai / AdminPassword2026!
INSERT INTO dev.app_users (
    id, username, email, password_hash, password_salt, full_name, designation, role
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'demo_architect',
    'architect@docarch.ai',
    '34d892155329cf05df75f20293482bb27bb1886fb6ece06a941c8172d49cca866d92d6635e5e40b4fa43d4b4436c52861fa0c5d17ce7033fdecc88bfb039f142',
    '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    'Lead System Architect',
    'Principal Enterprise Architect',
    'architect'
),
(
    '00000000-0000-0000-0000-000000000002',
    'admin',
    'admin@docarch.ai',
    'ac8b96cd30f9922ce43a1753913920bafc119e3a2c03546738ca4bb03ecdeef6a22fb5eaeeb2abc5dea007dbb8afde4c0d5beeb171ff2b17a09a6f17b1b6f0f9',
    'a4f5b8c2d1e0f3a6b9c8d7e6f5a4b3c2',
    'System Administrator',
    'Chief Technology Architect',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- 8. Liquibase Database Changelog Tracking Tables
CREATE TABLE IF NOT EXISTS dev.databasechangeloglock (
    id INT NOT NULL,
    locked BOOLEAN NOT NULL,
    lockgranted TIMESTAMP WITHOUT TIME ZONE,
    lockedby VARCHAR(255),
    CONSTRAINT pk_databasechangeloglock PRIMARY KEY (id)
);

INSERT INTO dev.databasechangeloglock (id, locked) 
VALUES (1, FALSE) 
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS dev.databasechangelog (
    id VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    dateexecuted TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    orderexecuted INT NOT NULL,
    exectype VARCHAR(10) NOT NULL,
    md5sum VARCHAR(35),
    description VARCHAR(255),
    comments VARCHAR(255),
    tag VARCHAR(255),
    liquibase VARCHAR(20) DEFAULT '4.27.0',
    contexts VARCHAR(255),
    labels VARCHAR(255),
    deployment_id VARCHAR(10)
);

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '000-create-dev-schema', 'ravi.kundu', 'liquibase/changesets/000-create-dev-schema.sql', NOW(), 1, 'EXECUTED', 'sql', 'Create dev schema and grant permissions to Supabase API roles'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '000-create-dev-schema');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '001-create-app-users', 'ravi.kundu', 'liquibase/changesets/001-create-app-users.sql', NOW(), 2, 'EXECUTED', 'sql', 'Create app_users table with PBKDF2 hashed passwords and role support'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '001-create-app-users');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '002-create-user-ai-configs', 'ravi.kundu', 'liquibase/changesets/002-create-user-ai-configs.sql', NOW(), 3, 'EXECUTED', 'sql', 'Create user_ai_configurations table for encrypted API keys with auto-expiry'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '002-create-user-ai-configs');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '003-create-user-sessions', 'ravi.kundu', 'liquibase/changesets/003-create-user-sessions.sql', NOW(), 4, 'EXECUTED', 'sql', 'Create user_sessions table for active user session management and tracking'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '003-create-user-sessions');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '004-add-designation-and-lockout', 'ravi.kundu', 'liquibase/changesets/004-add-designation-and-lockout.sql', NOW(), 5, 'EXECUTED', 'sql', 'Add designation, failed login attempt tracking, and password reset tokens'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '004-add-designation-and-lockout');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '005-create-audit-logs', 'ravi.kundu', 'liquibase/changesets/005-create-audit-logs.sql', NOW(), 6, 'EXECUTED', 'sql', 'Create security and admin activity audit logs table'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '005-create-audit-logs');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '006-create-purge-procedure', 'ravi.kundu', 'liquibase/changesets/006-create-purge-procedure.sql', NOW(), 7, 'EXECUTED', 'sql', 'Stored procedure to auto-purge expired AI keys and expired user sessions'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '006-create-purge-procedure');

INSERT INTO dev.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, description, comments)
SELECT '007-enable-rls-and-seed', 'ravi.kundu', 'liquibase/changesets/007-enable-rls-and-seed.sql', NOW(), 8, 'EXECUTED', 'sql', 'Enable RLS, create permissive policies, and seed initial architect and admin accounts'
WHERE NOT EXISTS (SELECT 1 FROM dev.databasechangelog WHERE id = '007-enable-rls-and-seed');

-- 9. Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

