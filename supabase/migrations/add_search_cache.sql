-- Migration: table de cache des résultats de recherche Google Maps
-- Évite les appels API répétés pour les mêmes combinaisons ville/métier

CREATE TABLE IF NOT EXISTS search_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  profession text NOT NULL,
  results jsonb NOT NULL,
  created_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '30 days'),
  UNIQUE(city, profession)
);

-- Index pour les lookups rapides
CREATE INDEX IF NOT EXISTS search_cache_lookup_idx ON search_cache (city, profession, expires_at);
