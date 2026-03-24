-- V23: Schema integrity, table_number persistence, PII erasure, and analytics improvements
-- Per schema review: data integrity constraints, table_number vs table_id, guest PII, denormalization

-- 1. CHECK constraints on status columns (prevents typos like PREPRING)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_status') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_status
            CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_restaurants_status'
    ) THEN
        ALTER TABLE restaurants
            ADD CONSTRAINT chk_restaurants_status
            CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'));
    END IF;
END $$;

-- 2. Persist table_number string on orders (QR param / manual entry)
-- Frontend sends tableNumber; when dining_tables row doesn't exist, we still want to record it.
-- Backend will set this from request; table_id remains for FK when table exists.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS table_number VARCHAR(50);

-- 3. Guest PII erasure support (GDPR / retention)
-- A scheduled job can null customer_name/phone/email and set this flag for orders past retention.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_data_erased_at TIMESTAMP;

-- 4. Denormalize tenant_id on order_items for analytics
-- Avoids join through orders for "revenue by item for tenant X" queries.
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES restaurants(id);

-- Backfill from orders
UPDATE order_items oi
SET tenant_id = o.tenant_id
FROM orders o
WHERE oi.order_id = o.id
  AND oi.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id ON order_items(tenant_id);

-- 5. Staff roles must have tenant_id (SUPER_ADMIN and CUSTOMER are the only nullable cases)
-- Skip if any rows would violate (e.g. orphaned STAFF/TENANT_ADMIN); fix data first.
DO $$
DECLARE
    violating_count INT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_tenant_id_required_for_staff') THEN
        RETURN;
    END IF;
    SELECT COUNT(*) INTO violating_count
    FROM users
    WHERE role NOT IN ('CUSTOMER', 'SUPER_ADMIN') AND tenant_id IS NULL AND deleted_at IS NULL;
    IF violating_count = 0 THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_tenant_id_required_for_staff
            CHECK (role IN ('CUSTOMER', 'SUPER_ADMIN') OR tenant_id IS NOT NULL);
    END IF;
END $$;

-- Note: reviews.tenant_id vs orders.tenant_id consistency cannot be enforced via CHECK (subqueries
-- not allowed). Enforce in ReviewService before insert/update.

-- =============================================================================
-- V21/V22 follow-ups: subscription constraints, soft-delete unique fix, partial indexes
-- =============================================================================

-- 6. Subscription plan/status CHECK constraints (match SubscriptionPlan, SubscriptionStatus enums)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_plan') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_plan
            CHECK (plan IN ('STARTER', 'GROWTH', 'ENTERPRISE'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_status') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_status
            CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_date_order') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_date_order
            CHECK (expires_at > starts_at);
    END IF;
END $$;

-- 7. Subscription index for "current plan" query; one active per tenant
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status
    ON subscriptions(tenant_id, status);

-- One active subscription per tenant; skip if duplicates exist (fix data first)
DO $$
DECLARE
    duplicate_count INT;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (SELECT tenant_id FROM subscriptions WHERE status = 'ACTIVE' GROUP BY tenant_id HAVING COUNT(*) > 1) d;
    IF duplicate_count = 0 AND NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_one_active_per_tenant'
    ) THEN
        CREATE UNIQUE INDEX idx_subscriptions_one_active_per_tenant
            ON subscriptions(tenant_id)
            WHERE status = 'ACTIVE';
    END IF;
END $$;

-- 8. Fix UNIQUE constraints broken by soft deletes (allow reuse after delete)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_slug_active ON restaurants(slug) WHERE deleted_at IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;

ALTER TABLE dining_tables DROP CONSTRAINT IF EXISTS uk_dining_tables_tenant_table_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dining_tables_tenant_table_number_active
    ON dining_tables(tenant_id, table_number) WHERE deleted_at IS NULL;

-- 9. Replace low-value deleted_at indexes with useful partial indexes
DROP INDEX IF EXISTS idx_restaurants_deleted_at;
DROP INDEX IF EXISTS idx_menu_items_deleted_at;
DROP INDEX IF EXISTS idx_orders_deleted_at;

CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(tenant_id, status) WHERE deleted_at IS NULL;
