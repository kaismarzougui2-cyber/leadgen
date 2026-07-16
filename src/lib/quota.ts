import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_LIMITS, type PlanId } from '@/lib/plans'

export interface Subscription {
  id: string
  plan: string
  searches_used: number
  searches_limit: number | null
  extra_credits: number | null
  period_start: string | null
  is_staff: boolean | null
}

const SUB_FIELDS =
  'id, plan, searches_used, searches_limit, extra_credits, period_start, is_staff'

/** Limite mensuelle effective d'un abonnement (plans connus, sinon valeur DB, sinon 5). */
export function planLimitOf(sub: Subscription): number {
  return PLAN_LIMITS[sub.plan as PlanId] ?? sub.searches_limit ?? 5
}

export function totalAllowedOf(sub: Subscription): number {
  return planLimitOf(sub) + (sub.extra_credits ?? 0)
}

/** Récupère l'abonnement, en le créant (plan free) s'il n'existe pas encore. */
export async function getOrCreateSubscription(
  admin: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data: sub } = await admin
    .from('subscriptions')
    .select(SUB_FIELDS)
    .eq('user_id', userId)
    .maybeSingle()

  if (sub) return sub as Subscription

  const now = new Date().toISOString()
  const row = {
    user_id: userId,
    plan: 'free',
    searches_limit: 5,
    searches_used: 0,
    period_start: now,
  }
  // upsert : évite les doublons si deux requêtes arrivent en même temps.
  // Fallback insert simple si l'index unique n'existe pas encore (migration
  // harden_security pas encore appliquée).
  const { error: upsertError } = await admin
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id', ignoreDuplicates: true })
  if (upsertError) {
    await admin.from('subscriptions').insert(row)
  }

  const { data: created } = await admin
    .from('subscriptions')
    .select(SUB_FIELDS)
    .eq('user_id', userId)
    .maybeSingle()
  return (created as Subscription) ?? null
}

/** Remet le compteur à zéro si la période de 30 jours est écoulée. */
export async function resetPeriodIfExpired(
  admin: SupabaseClient,
  userId: string,
  sub: Subscription
): Promise<Subscription> {
  if (!sub.period_start) return sub
  const daysSince = (Date.now() - new Date(sub.period_start).getTime()) / 86_400_000
  if (daysSince < 30) return sub

  const now = new Date().toISOString()
  await admin
    .from('subscriptions')
    .update({ searches_used: 0, period_start: now, updated_at: now })
    .eq('user_id', userId)
  return { ...sub, searches_used: 0, period_start: now }
}

/**
 * Réserve `credits` crédits de façon atomique (verrou optimiste sur searches_used).
 * Retourne false si le quota est atteint ou en cas de concurrence.
 */
export async function consumeCredits(
  admin: SupabaseClient,
  userId: string,
  sub: Subscription,
  credits: number
): Promise<boolean> {
  const totalAllowed = totalAllowedOf(sub)
  const now = new Date().toISOString()
  const { data } = await admin
    .from('subscriptions')
    .update({ searches_used: sub.searches_used + credits, updated_at: now })
    .eq('user_id', userId)
    .eq('searches_used', sub.searches_used)
    .lte('searches_used', totalAllowed - credits)
    .select('searches_used')

  return !!data && data.length > 0
}

/** Rembourse des crédits (échec de l'appel fournisseur après réservation). */
export async function refundCredits(
  admin: SupabaseClient,
  userId: string,
  credits: number
): Promise<void> {
  const { data: current } = await admin
    .from('subscriptions')
    .select('searches_used')
    .eq('user_id', userId)
    .maybeSingle()
  if (!current) return
  const next = Math.max(0, (current.searches_used ?? 0) - credits)
  await admin
    .from('subscriptions')
    .update({ searches_used: next, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}
