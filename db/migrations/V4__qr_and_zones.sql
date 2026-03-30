-- V4: Dining zones and QR code management
-- Supports zone-specific pricing (AC/Non-AC) and context-aware ordering

CREATE TABLE dining_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    name VARCHAR(50) NOT NULL, -- e.g. 'AC', 'Non-AC', 'Delivery', 'Takeaway'
    price_multiplier DECIMAL(5, 2) DEFAULT 1.0, -- Default multiplier for the zone
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_item_zone_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    dining_zone_id UUID NOT NULL REFERENCES dining_zones(id),
    override_price BIGINT, -- Specific price for this item in this zone (paise)
    UNIQUE(menu_item_id, dining_zone_id)
);

CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id),
    dining_zone_id UUID NOT NULL REFERENCES dining_zones(id),
    table_number INTEGER, -- NULL for delivery/takeaway QR
    source_identifier VARCHAR(100) UNIQUE, -- Unique code in the QR URL
    template_name VARCHAR(50), -- For 'beautifully printed' QR templates
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_tenant_id ON qr_codes(tenant_id);
CREATE INDEX idx_qr_source_id ON qr_codes(source_identifier);
