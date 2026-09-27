-- ============================================================================
-- DocArch AI - PostgreSQL Database Schema (for Supabase)
-- ============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Accounts Table
-- Stores user credentials securely. Passwords are encrypted with PBKDF2 + unique random salt.
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'architect',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast lookup indexes for authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.app_users(username);

-- 2. User AI Configurations Table
-- Stores AI provider settings and AES-256-GCM encrypted API keys with auto-expiry.
CREATE TABLE IF NOT EXISTS public.user_ai_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_ai_config_user ON public.user_ai_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_expiry ON public.user_ai_configurations(expires_at);

-- 3. Stored Procedure to Auto-Purge Expired Keys
-- Can be called periodically or by Supabase pg_cron to guarantee expired keys are permanently removed.
CREATE OR REPLACE FUNCTION public.purge_expired_api_keys()
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.user_ai_configurations
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable Row Level Security (RLS) for extra defense-in-depth
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_configurations ENABLE ROW LEVEL SECURITY;

-- Allow server service role full access
CREATE POLICY IF NOT EXISTS "Service role full access on app_users"
    ON public.app_users
    FOR ALL
    USING (true);

CREATE POLICY IF NOT EXISTS "Service role full access on user_ai_configurations"
    ON public.user_ai_configurations
    FOR ALL
    USING (true);
