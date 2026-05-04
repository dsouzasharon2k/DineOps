CREATE TABLE IF NOT EXISTS invoice_counters (
    tenant_id UUID PRIMARY KEY REFERENCES restaurants(id),
    last_invoice_number BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_counters_updated_at
    ON invoice_counters(updated_at);
