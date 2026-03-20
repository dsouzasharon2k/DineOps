ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP;
