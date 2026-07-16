-- Durcissement sécurité avant commercialisation.
-- À exécuter dans le SQL editor Supabase APRÈS avoir déployé le code qui
-- utilise la clé service role (SUPABASE_SERVICE_ROLE_KEY) côté serveur.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Colonnes manquantes utilisées par le code
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS extra_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ DEFAULT now();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT false;

-- Une seule ligne d'abonnement par utilisateur (requis par l'upsert serveur)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON subscriptions (user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. subscriptions : lecture seule pour les utilisateurs.
--    Toutes les écritures (quotas, plan, crédits) passent par le service role,
--    sinon un utilisateur pourrait remettre son quota à zéro ou changer son
--    plan via l'API REST Supabase avec son propre JWT.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
  LOOP
    EXECUTE format('DROP POLICY %I ON subscriptions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
-- Aucune policy INSERT/UPDATE/DELETE : le service role contourne la RLS.

-- ────────────────────────────────────────────────────────────────────────────
-- 3. search_cache : table interne, aucun accès utilisateur.
--    Lecture/écriture uniquement via le service role dans les routes API.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'search_cache'
  LOOP
    EXECUTE format('DROP POLICY %I ON search_cache', pol.policyname);
  END LOOP;
END $$;
-- Aucune policy : les utilisateurs ne voient jamais cette table.

-- ────────────────────────────────────────────────────────────────────────────
-- 4. searches : l'historique est écrit par le serveur, lu par l'utilisateur.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'searches'
  LOOP
    EXECUTE format('DROP POLICY %I ON searches', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own searches"
  ON searches FOR SELECT
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. profiles : l'utilisateur lit son profil ; stripe_customer_id est géré
--    par le serveur (checkout) — on garde l'update pour compatibilité mais
--    uniquement sur sa propre ligne.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users read own profile'
  ) THEN
    CREATE POLICY "Users read own profile"
      ON profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;
