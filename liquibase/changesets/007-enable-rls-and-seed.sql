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

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
