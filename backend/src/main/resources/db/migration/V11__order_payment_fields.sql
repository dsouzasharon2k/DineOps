ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
    ADD COLUMN IF NOT EXISTS payment_provider_order_ref VARCHAR(100),
    ADD COLUMN IF NOT EXISTS payment_provider_payment_ref VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_orders_payment_provider_order_ref
    ON orders(payment_provider_order_ref);
