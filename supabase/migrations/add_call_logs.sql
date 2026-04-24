-- Call logs: timestamped history of every interaction with a prospect
-- Used for analytics (heatmap, calls/day) and per-prospect call history

CREATE TABLE IF NOT EXISTS call_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id  UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  called_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome      TEXT,        -- status set after the call
  contact_name TEXT,        -- person spoken to (may differ from prospect.contact_name)
  note         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_call_logs_prospect   ON call_logs(prospect_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_date  ON call_logs(user_id, called_at DESC);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own call_logs"
  ON call_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
