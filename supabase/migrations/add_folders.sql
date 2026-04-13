-- Prospect folders
CREATE TABLE IF NOT EXISTS prospect_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#E5000A',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prospect_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders"
  ON prospect_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add folder_id to prospects (nullable FK, set null when folder deleted)
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS folder_id uuid
    REFERENCES prospect_folders(id) ON DELETE SET NULL;
