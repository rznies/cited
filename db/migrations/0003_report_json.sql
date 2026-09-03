-- Ticket 3b: cache must serve the complete report (winners/checklist included).
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_json JSONB;
