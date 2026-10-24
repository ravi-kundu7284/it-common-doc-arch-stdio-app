-- liquibase formatted sql
-- changeset ravi.kundu:010-add-auth-verification-and-notifications
-- comment: Add email/phone verification, notification preferences, auth tokens, phone verifications, notification logs, and usage counters

-- 1. Extend app_users with verification timestamps & notification preferences
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"email":{"verify":true,"password_reset":true,"export":true,"audit":true,"adr":true},"sms":{"audit":false,"adr":false,"export":false}}'::jsonb;

-- 2. Auth Tokens (for secure, single-use, hashed email verification & password reset tokens)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'email_verify' | 'password_reset'
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the 32-byte secret token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup ON auth_tokens(token_hash, type);

-- 3. Phone Verifications (for SMS OTP flow, storing only provider verification ID)
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    phone VARCHAR(30) NOT NULL,
    provider_verification_id VARCHAR(128),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'verified' | 'failed' | 'expired'
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

-- 4. Notification Audit Logs (tracks every email & SMS dispatch attempt)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    channel VARCHAR(10) NOT NULL, -- 'email' | 'sms'
    template VARCHAR(50) NOT NULL, -- 'verify-email' | 'password-reset' | 'password-changed' | 'export-alert' | 'audit-alert' | 'adr-alert'
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'sent' | 'failed' | 'dropped'
    provider_message_id VARCHAR(128),
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel, status);

-- 5. Usage Counters (enforces strict daily and monthly caps to prevent cost runaway)
CREATE TABLE IF NOT EXISTS usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(10) NOT NULL, -- 'email' | 'sms'
    period_key VARCHAR(60) NOT NULL, -- e.g. 'daily:2026-10-24', 'monthly:2026-10', 'user:usr_id:2026-10-24', 'ip:1.2.3.4:2026-10-24'
    count INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_channel_period UNIQUE (channel, period_key)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_lookup ON usage_counters(channel, period_key);

-- 6. Row Level Security (RLS)
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Server / service-role full access policy
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_auth_tokens_all') THEN
        CREATE POLICY service_role_auth_tokens_all ON auth_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_phone_verifications_all') THEN
        CREATE POLICY service_role_phone_verifications_all ON phone_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_notification_logs_all') THEN
        CREATE POLICY service_role_notification_logs_all ON notification_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_usage_counters_all') THEN
        CREATE POLICY service_role_usage_counters_all ON usage_counters FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Permissive policies for anon / authenticated access through application API
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'app_auth_tokens_policy') THEN
        CREATE POLICY app_auth_tokens_policy ON auth_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'app_phone_verifications_policy') THEN
        CREATE POLICY app_phone_verifications_policy ON phone_verifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'app_notification_logs_policy') THEN
        CREATE POLICY app_notification_logs_policy ON notification_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'app_usage_counters_policy') THEN
        CREATE POLICY app_usage_counters_policy ON usage_counters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- rollback DROP TABLE IF EXISTS usage_counters;
-- rollback DROP TABLE IF EXISTS notification_logs;
-- rollback DROP TABLE IF EXISTS phone_verifications;
-- rollback DROP TABLE IF EXISTS auth_tokens;
-- rollback ALTER TABLE app_users DROP COLUMN IF EXISTS notification_prefs, DROP COLUMN IF EXISTS phone_verified_at, DROP COLUMN IF EXISTS email_verified_at;
