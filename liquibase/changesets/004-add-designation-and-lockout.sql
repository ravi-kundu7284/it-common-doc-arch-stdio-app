-- liquibase formatted sql
-- changeset ravi.kundu:004-add-designation-and-lockout
-- comment: Add designation, failed login attempt tracking (lockout after 3 attempts for 2 mins), and password reset tokens

ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS designation VARCHAR(100) DEFAULT 'Software Architect',
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128),
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.app_users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_locked ON public.app_users(locked_until);
