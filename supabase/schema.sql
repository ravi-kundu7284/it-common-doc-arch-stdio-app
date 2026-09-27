-- ============================================================================
-- DocArch AI - PostgreSQL Database Schema (for Supabase & Liquibase)
-- ============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Accounts Table
-- Stores user credentials securely. Passwords are encrypted with PBKDF2 + unique random salt.
-- Tracks failed attempts for automated 2-minute lockout after 3 failed attempts.
CREATE TABLE IF NOT EXISTS public.app_users (
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
CREATE INDEX IF NOT EXISTS idx_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.app_users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_locked ON public.app_users(locked_until);

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

-- 3. User Sessions Table
-- Tracks active user sessions with token verification, IP, user-agent, and remote revocation.
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.user_sessions(is_active, expires_at);

-- 4. Security Audit Logs Table
-- Records security events for Admin portal oversight (logins, lockouts, resets, key purges)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET_REQ', 'PASSWORD_RESET_SUCCESS', 'KEY_PURGED', 'ADMIN_ROLE_CHANGE'
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.security_audit_logs(user_id);

-- 5. Stored Procedure to Auto-Purge Expired Keys & Deactivate Expired Sessions
CREATE OR REPLACE FUNCTION public.purge_expired_api_keys()
RETURNS INT AS $$
DECLARE
    deleted_keys INT;
BEGIN
    DELETE FROM public.user_ai_configurations
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_keys = ROW_COUNT;

    UPDATE public.user_sessions
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;

    RETURN deleted_keys;
END;
$$ LANGUAGE plpgsql;

-- 6. Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on app_users"
    ON public.app_users FOR ALL USING (true);

CREATE POLICY "Service role full access on user_ai_configurations"
    ON public.user_ai_configurations FOR ALL USING (true);

CREATE POLICY "Service role full access on user_sessions"
    ON public.user_sessions FOR ALL USING (true);

CREATE POLICY "Service role full access on security_audit_logs"
    ON public.security_audit_logs FOR ALL USING (true);
