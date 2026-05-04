CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    severity VARCHAR(20) NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_hint TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_alerts_tenant_created ON alerts(tenant_id, created_at DESC);
CREATE INDEX idx_alerts_tenant_read ON alerts(tenant_id, is_read);
CREATE INDEX idx_alerts_tenant_type_read ON alerts(tenant_id, type, is_read);
