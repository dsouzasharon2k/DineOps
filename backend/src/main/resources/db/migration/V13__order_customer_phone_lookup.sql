ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_customer_phone_created_at
    ON orders(tenant_id, customer_phone, created_at DESC);
