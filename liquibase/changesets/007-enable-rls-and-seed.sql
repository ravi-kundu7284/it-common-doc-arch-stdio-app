-- liquibase formatted sql
-- changeset ravi.kundu:007-enable-rls-and-seed splitStatements:true
-- comment: Enable RLS, create permissive policies for API access, and seed initial architect and admin accounts

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App full access on app_users" ON app_users;
CREATE POLICY "App full access on app_users"
    ON app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App full access on user_ai_configurations" ON user_ai_configurations;
CREATE POLICY "App full access on user_ai_configurations"
    ON user_ai_configurations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App full access on user_sessions" ON user_sessions;
CREATE POLICY "App full access on user_sessions"
    ON user_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App full access on security_audit_logs" ON security_audit_logs;
CREATE POLICY "App full access on security_audit_logs"
    ON security_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Seed initial enterprise accounts
INSERT INTO app_users (
    id, username, email, password_hash, password_salt, full_name, designation, role
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'demo_architect',
    'architect@docarch.ai',
    '223a54b3c1d9f8e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1',
    '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    'Lead System Architect',
    'Principal Enterprise Architect',
    'architect'
),
(
    '00000000-0000-0000-0000-000000000002',
    'admin',
    'admin@docarch.ai',
    '389c894200676cb400ff5021e5f8f8b89e6eb1ad373801f92e42ca427189a7bbd377b83ecbf1fe4f4949a567a13c9ff42cbbbf1c4d9bc213825fdb8b0ba315e1',
    'a4f5b8c2d1e0f3a6b9c8d7e6f5a4b3c2',
    'System Administrator',
    'Chief Technology Architect',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
