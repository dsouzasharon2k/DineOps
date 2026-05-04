-- V38: Extend inventory with vendor contact info and stock unit
-- vendor_phone allows the "WhatsApp Vendor" quick-action on the Inventory page
-- unit records whether stock is tracked in kg, ltr, pcs, etc.

ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS unit         VARCHAR(20)  NOT NULL DEFAULT 'pcs',
    ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(25);
