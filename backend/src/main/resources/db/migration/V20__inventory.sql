CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL UNIQUE REFERENCES menu_items(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id
    ON inventory(tenant_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_quantity_non_negative'
    ) THEN
        ALTER TABLE inventory
            ADD CONSTRAINT chk_inventory_quantity_non_negative CHECK (quantity >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_low_stock_threshold_non_negative'
    ) THEN
        ALTER TABLE inventory
            ADD CONSTRAINT chk_inventory_low_stock_threshold_non_negative CHECK (low_stock_threshold >= 0);
    END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_inventory_updated_at ON inventory;
CREATE TRIGGER trigger_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
