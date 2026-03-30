-- V5: Link orders to dining zones and QR codes
-- Ensures pricing context is preserved

ALTER TABLE orders ADD COLUMN dining_zone_id UUID REFERENCES dining_zones(id);
ALTER TABLE orders ADD COLUMN qr_code_id UUID REFERENCES qr_codes(id);

CREATE INDEX idx_orders_dining_zone_id ON orders(dining_zone_id);
CREATE INDEX idx_orders_qr_code_id ON orders(qr_code_id);
