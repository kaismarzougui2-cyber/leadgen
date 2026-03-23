-- Migration: add callback scheduling to prospects
-- Run this in the Supabase SQL editor

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS callback_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS prospects_callback_at_idx ON prospects (callback_at) WHERE callback_at IS NOT NULL;
