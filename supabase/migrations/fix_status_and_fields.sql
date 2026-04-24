-- Fix status CHECK constraint and add missing columns to prospects
-- Run this migration FIRST — it unblocks all new status values

-- 1. Drop the existing CHECK constraint (name matches Supabase auto-generated name)
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_status_check;

-- 2. Re-create with all 9 statuses (original 6 + N'a pas répondu + Client signé + Ne pas rappeler)
ALTER TABLE prospects ADD CONSTRAINT prospects_status_check CHECK (status IN (
  'À appeler',
  'A répondu',
  'N''a pas répondu',
  'Réfléchit',
  'Pas intéressé',
  'Intéressé',
  'À rappeler',
  'Client signé',
  'Ne pas rappeler'
));

-- 3. Add query_city and query_job to prospects
--    (previously only in the searches table, never stored on the prospect itself)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS query_city TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS query_job  TEXT;

-- 4. Add contact_name (the person spoken to at the company)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_name TEXT;
