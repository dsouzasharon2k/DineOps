-- V41: QR code templates for branded/printable QR codes
-- Supports tenant-specific HTML/CSS templates for QR code generation

CREATE TABLE IF NOT EXISTS qr_templates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    html_content TEXT        NOT NULL,
    css_content  TEXT,
    is_public    BOOLEAN     NOT NULL DEFAULT FALSE,
    tenant_id    UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_templates_tenant ON qr_templates(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qr_templates_public ON qr_templates(is_public) WHERE deleted_at IS NULL;
