-- reports: one row per audited domain. status drives polling/stale/failure UX.
CREATE TABLE IF NOT EXISTS reports (
  domain TEXT PRIMARY KEY,
  prompts_json JSONB NOT NULL,
  score INTEGER NOT NULL,
  fixes JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
