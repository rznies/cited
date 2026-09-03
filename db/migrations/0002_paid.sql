-- Ticket 3a: paid flag for the $29 gate (webhook + verify set it).
ALTER TABLE reports ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;
