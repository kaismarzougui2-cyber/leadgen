-- Mode Booster : historique des villes déjà recherchées par métier
CREATE TABLE IF NOT EXISTS boost_search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_keyword TEXT NOT NULL,
  city_name TEXT NOT NULL,
  department_code TEXT,
  searched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boost_history_user_trade
  ON boost_search_history(user_id, trade_keyword);

-- RLS
ALTER TABLE boost_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own boost history"
  ON boost_search_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
