-- V2: Add 2FA support and SUB_ADMIN role
-- Adds columns for two-factor authentication and prepares for SUB_ADMIN role

ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(100);

-- Note: UserRole is an enum in Java, no DB change needed for the string role column 
-- unless there's a specific constraint, which there isn't in V1.

-- Make email nullable to support mobile-only customers
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT unique_phone_if_no_email UNIQUE (phone);
