-- ============================================================
-- LeadGen SaaS – Schéma Supabase v2
-- Exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- -------------------------------------------------------
-- 1. TABLE PROFILES (auth + metadata utilisateur)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. TABLE SUBSCRIPTIONS (plans + quota de recherches)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'pro')),
  searches_used INTEGER DEFAULT 0,
  searches_limit INTEGER DEFAULT 5,
  extra_credits INTEGER DEFAULT 0,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. TABLE PROSPECTS (CRM)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  rating NUMERIC(2,1),
  google_place_id TEXT,
  website TEXT,
  status TEXT DEFAULT 'À appeler' CHECK (status IN (
    'À appeler',
    'A répondu',
    'Réfléchit',
    'Pas intéressé',
    'Intéressé',
    'À rappeler'
  )),
  note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 4. TABLE SEARCHES (historique des recherches)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_job TEXT NOT NULL,
  query_city TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 5. SÉCURITÉ RLS
-- -------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions
CREATE POLICY "Users view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Prospects
CREATE POLICY "Users manage own prospects" ON prospects
  FOR ALL USING (auth.uid() = user_id);

-- Searches
CREATE POLICY "Users manage own searches" ON searches
  FOR ALL USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- 6. TRIGGER : créer profil + abonnement à l'inscription
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, searches_limit)
  VALUES (NEW.id, 'free', 5)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -------------------------------------------------------
-- 7. FONCTION : réinitialiser le quota en début de période
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_monthly_quota()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscriptions
  SET
    searches_used = 0,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE current_period_end < NOW();
END;
$$;
