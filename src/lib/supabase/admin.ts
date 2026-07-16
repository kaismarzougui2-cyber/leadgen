import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec la clé service role — contourne la RLS.
 * À utiliser UNIQUEMENT côté serveur (routes API, webhooks, cron) pour les
 * écritures sensibles : quotas, abonnements, cache de recherche.
 * Ne jamais importer depuis un composant client.
 */
let _admin: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant — configurez les variables d\'environnement.'
      )
    }
    _admin = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _admin
}
