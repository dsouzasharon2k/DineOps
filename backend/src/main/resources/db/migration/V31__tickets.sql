CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    created_by_email VARCHAR(150) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    type VARCHAR(40) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_created_at
    ON tickets (tenant_id, created_at DESC);
