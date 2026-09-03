-- Ticket 5: buyer-shareable paid links.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
