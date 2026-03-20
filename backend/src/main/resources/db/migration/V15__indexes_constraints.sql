CREATE INDEX IF NOT EXISTS idx_orders_tenant_status
    ON orders(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders(created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_order_items_quantity_positive'
    ) THEN
        ALTER TABLE order_items
            ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_menu_items_price_non_negative'
    ) THEN
        ALTER TABLE menu_items
            ADD CONSTRAINT chk_menu_items_price_non_negative CHECK (price >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_orders_total_amount_non_negative'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_total_amount_non_negative CHECK (total_amount >= 0);
    END IF;
END $$;
