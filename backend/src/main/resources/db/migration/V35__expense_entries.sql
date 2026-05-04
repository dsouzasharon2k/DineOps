CREATE TABLE IF NOT EXISTS expense_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    expense_date DATE NOT NULL,
    category VARCHAR(60) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_entries_tenant_date
    ON expense_entries(tenant_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expense_entries_tenant_category
    ON expense_entries(tenant_id, category);
