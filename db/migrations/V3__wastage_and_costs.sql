-- V3: Add base_cost to menu_items and create wastage_events table
-- Supports profitability tracking and wastage management

ALTER TABLE menu_items ADD COLUMN base_cost BIGINT; -- Cost in paise

CREATE TABLE wastage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_cost BIGINT NOT NULL, -- Cost at time of wastage
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wastage_tenant_id ON wastage_events(tenant_id);
CREATE INDEX idx_wastage_menu_item_id ON wastage_events(menu_item_id);
