ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_users_refresh_token_hash
    ON users(refresh_token_hash);
