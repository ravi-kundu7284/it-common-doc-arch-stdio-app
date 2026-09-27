-- liquibase formatted sql
-- changeset ravi.kundu:005-create-audit-logs
-- comment: Create security and admin activity audit logs table

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET_REQ', 'PASSWORD_RESET_SUCCESS', 'ADMIN_ROLE_CHANGE', 'KEY_PURGE'
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.security_audit_logs(user_id);
