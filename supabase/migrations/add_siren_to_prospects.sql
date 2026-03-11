-- Migration: add INSEE SIREN fields to prospects table
-- Run this in the Supabase SQL editor

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS siren TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS naf_code TEXT,
  ADD COLUMN IF NOT EXISTS naf_label TEXT;

-- Index for potential future SIREN lookups
CREATE INDEX IF NOT EXISTS prospects_siren_idx ON prospects (siren) WHERE siren IS NOT NULL;
