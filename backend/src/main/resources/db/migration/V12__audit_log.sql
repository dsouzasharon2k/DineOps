CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    performed_by VARCHAR(255),
    tenant_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id_created_at
    ON audit_log(tenant_id, created_at DESC);
