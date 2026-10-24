-- liquibase formatted sql
-- changeset ravi.kundu:002-create-user-ai-configs
-- comment: Create user_ai_configurations table for encrypted API keys with auto-expiry

CREATE TABLE IF NOT EXISTS user_ai_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'openai',
    model_name VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
    encrypted_api_key TEXT,                          -- AES-256-GCM ciphertext
    key_iv TEXT,                                     -- 12-byte IV in hex
    key_auth_tag TEXT,                               -- GCM Authentication Tag in hex
    key_last4 VARCHAR(8),                            -- Safe mask preview (e.g. "...4a89")
    expires_at TIMESTAMP WITH TIME ZONE,             -- Automated expiry timestamp
    expires_in_days INT DEFAULT 30,                  -- Duration (1, 7, 14, 30, 90)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ai_config_user ON user_ai_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_expiry ON user_ai_configurations(expires_at);
