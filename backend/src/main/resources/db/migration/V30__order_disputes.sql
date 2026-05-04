CREATE TABLE IF NOT EXISTS order_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_name VARCHAR(120),
    customer_phone VARCHAR(30),
    issue_type VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_disputes_tenant_created
    ON order_disputes (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_disputes_order
    ON order_disputes (order_id);
