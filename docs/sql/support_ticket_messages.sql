-- Threaded replies on support tickets (admin + user). Run in Supabase SQL Editor.
-- Backend uses service_role; RLS optional (no policies = only service role).

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    author_role TEXT NOT NULL CHECK (author_role IN ('user', 'admin')),
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_created
    ON support_ticket_messages (ticket_id, created_at ASC);

ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
