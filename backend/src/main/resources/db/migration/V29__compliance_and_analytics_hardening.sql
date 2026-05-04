ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS gst_rate_non_ac_percent INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS gst_rate_ac_percent INTEGER NOT NULL DEFAULT 18;

ALTER TABLE dining_zones
    ADD COLUMN IF NOT EXISTS is_air_conditioned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS cost_at_order BIGINT;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS invoice_number BIGINT;

CREATE INDEX IF NOT EXISTS idx_orders_tenant_invoice_number
    ON orders(tenant_id, invoice_number);
