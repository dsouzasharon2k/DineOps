ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS assigned_to_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS resolution_notes VARCHAR(2000);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    author_email VARCHAR(150) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_created_at
    ON ticket_comments (ticket_id, created_at ASC);
