-- V39: Vendors & Procurement module
-- Enables full supply-chain tracking: vendor profiles, item-level sourcing, and purchase orders.

CREATE TABLE vendors (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES restaurants(id),
    vendor_name     VARCHAR(255) NOT NULL,
    contact_person  VARCHAR(100),
    phone_number    VARCHAR(25),
    category        VARCHAR(50)  NOT NULL DEFAULT 'OTHER',  -- VEGETABLES | DAIRY | MEAT | DRY_GROCERY | PACKAGING | OTHER
    address         TEXT,
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id) WHERE deleted_at IS NULL;

-- Links a vendor to inventory items they supply, with the last known purchase price.
-- A single inventory item can have multiple vendors; is_preferred marks the default one.
CREATE TABLE vendor_items (
    id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id            UUID    NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    inventory_id         UUID    NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    last_purchase_price  BIGINT,         -- unit price in paise at last transaction
    is_preferred_vendor  BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (vendor_id, inventory_id)
);

CREATE INDEX idx_vendor_items_inventory ON vendor_items(inventory_id);

CREATE TABLE purchase_orders (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID         NOT NULL REFERENCES restaurants(id),
    vendor_id     UUID         NOT NULL REFERENCES vendors(id),
    status        VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',  -- DRAFT | SENT | RECEIVED | CANCELLED
    total_amount  BIGINT,      -- computed sum in paise
    notes         TEXT,
    received_at   TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP
);

CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_po_vendor  ON purchase_orders(vendor_id);

CREATE TABLE purchase_order_items (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id   UUID            NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_id        UUID            REFERENCES inventory(id),
    item_name           VARCHAR(255)    NOT NULL,
    quantity            DECIMAL(10, 2)  NOT NULL,
    unit                VARCHAR(20)     NOT NULL DEFAULT 'pcs',
    unit_price          BIGINT          NOT NULL,  -- paise
    total_price         BIGINT          NOT NULL   -- paise
);
