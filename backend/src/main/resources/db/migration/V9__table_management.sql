CREATE TABLE IF NOT EXISTS dining_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    qr_code_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_dining_tables_tenant_table_number UNIQUE (tenant_id, table_number)
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES dining_tables(id);

CREATE INDEX IF NOT EXISTS idx_dining_tables_tenant_id ON dining_tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
