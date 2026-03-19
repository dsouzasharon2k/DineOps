-- V5: Standardize restaurant status values to enum-compatible uppercase constants

-- Normalize pre-existing lowercase/mixed status values
UPDATE restaurants
SET status = CASE
    WHEN status IS NULL OR btrim(status) = '' THEN 'PENDING'
    WHEN upper(status) = 'ACTIVE' THEN 'ACTIVE'
    WHEN upper(status) = 'SUSPENDED' THEN 'SUSPENDED'
    WHEN upper(status) = 'CLOSED' THEN 'CLOSED'
    WHEN upper(status) = 'PENDING' THEN 'PENDING'
    ELSE 'PENDING'
END;

-- Keep DB default aligned with JPA default
ALTER TABLE restaurants
    ALTER COLUMN status SET DEFAULT 'PENDING';
