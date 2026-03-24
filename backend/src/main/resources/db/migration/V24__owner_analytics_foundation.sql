-- V24: Owner analytics foundation (meal period, cancellation context, accurate prep metrics)

-- 1) Meal period directly on orders for easier owner analytics
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS meal_period VARCHAR(10)
    GENERATED ALWAYS AS (
        CASE
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 10 THEN 'BREAKFAST'
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 11 AND 14 THEN 'LUNCH'
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 15 AND 17 THEN 'SNACK'
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 22 THEN 'DINNER'
            ELSE 'LATE'
        END
    ) STORED;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_meal_period') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_meal_period
            CHECK (meal_period IN ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'LATE'));
    END IF;
END $$;

-- 2) Cancellation reason context
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(30);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_cancelled_by') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_cancelled_by
            CHECK (cancelled_by IS NULL OR cancelled_by IN ('CUSTOMER', 'STAFF', 'SYSTEM'));
    END IF;
END $$;

-- 3) Dining table occupancy windows (minimal structure for turnover analytics)
ALTER TABLE dining_tables
    ADD COLUMN IF NOT EXISTS seated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dining_tables_cleared_after_seated') THEN
        ALTER TABLE dining_tables
            ADD CONSTRAINT chk_dining_tables_cleared_after_seated
            CHECK (cleared_at IS NULL OR seated_at IS NULL OR cleared_at >= seated_at);
    END IF;
END $$;

-- 4) Accurate prep-time from status history (CONFIRMED -> READY)
CREATE OR REPLACE VIEW vw_accurate_prep_times AS
WITH confirmed_events AS (
    SELECT
        osh.order_id,
        MIN(osh.changed_at) AS confirmed_at
    FROM order_status_history osh
    WHERE osh.new_status = 'CONFIRMED'
    GROUP BY osh.order_id
),
ready_events AS (
    SELECT
        osh.order_id,
        MIN(osh.changed_at) AS ready_at
    FROM order_status_history osh
    WHERE osh.new_status = 'READY'
    GROUP BY osh.order_id
)
SELECT
    o.tenant_id,
    o.id AS order_id,
    o.created_at,
    ce.confirmed_at,
    re.ready_at,
    ROUND(EXTRACT(EPOCH FROM (re.ready_at - ce.confirmed_at)) / 60.0, 1) AS prep_minutes
FROM orders o
JOIN confirmed_events ce ON ce.order_id = o.id
JOIN ready_events re ON re.order_id = o.id
WHERE o.status IN ('READY', 'DELIVERED')
  AND o.deleted_at IS NULL
  AND re.ready_at >= ce.confirmed_at;

-- 5) Item-level revenue (day grain)
CREATE OR REPLACE VIEW vw_item_revenue AS
SELECT
    oi.tenant_id,
    oi.name AS item_name,
    DATE_TRUNC('day', o.created_at) AS order_date,
    SUM(oi.quantity)::bigint AS units_sold,
    SUM((oi.price * oi.quantity)::bigint) AS revenue_paise,
    ROUND(AVG(oi.quantity)::numeric, 2) AS avg_qty_per_order
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'DELIVERED'
  AND o.deleted_at IS NULL
  AND oi.deleted_at IS NULL
GROUP BY oi.tenant_id, oi.name, DATE_TRUNC('day', o.created_at);

-- 6) Review context: rating + order value + prep time + items
CREATE OR REPLACE VIEW vw_review_order_context AS
SELECT
    rv.tenant_id,
    rv.rating,
    rv.comment,
    rv.created_at AS review_time,
    o.id AS order_id,
    o.total_amount,
    o.created_at AS order_time,
    o.meal_period,
    apt.prep_minutes,
    STRING_AGG((oi.name || ' ×' || oi.quantity), ', ' ORDER BY oi.name) AS items_ordered
FROM reviews rv
JOIN orders o ON o.id = rv.order_id
LEFT JOIN vw_accurate_prep_times apt ON apt.order_id = o.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.deleted_at IS NULL
  AND oi.deleted_at IS NULL
GROUP BY
    rv.tenant_id,
    rv.rating,
    rv.comment,
    rv.created_at,
    o.id,
    o.total_amount,
    o.created_at,
    o.meal_period,
    apt.prep_minutes;

-- Helpful indexes for owner analytics use-cases
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_at
    ON orders (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_meal_period
    ON orders (tenant_id, meal_period);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status_created
    ON orders (tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_status_changed
    ON order_status_history (order_id, new_status, changed_at);

