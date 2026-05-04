CREATE TABLE IF NOT EXISTS product_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    event_type VARCHAR(40) NOT NULL,
    session_id VARCHAR(120),
    order_id UUID,
    source VARCHAR(40) NOT NULL DEFAULT 'web',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_events_tenant_created_at
    ON product_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_tenant_event_created
    ON product_events (tenant_id, event_type, created_at DESC);
