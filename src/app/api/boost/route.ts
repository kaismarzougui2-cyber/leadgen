import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadCommunesServer, getCitiesForBoost, getCitiesForFrance, type ZoneType } from '@/lib/communes-server'
import {
  getOrCreateSubscription,
  resetPeriodIfExpired,
  consumeCredits,
  refundCredits,
  totalAllowedOf,
} from '@/lib/quota'

// Plans autorisés à utiliser le Mode Booster
const BOOST_ALLOWED_PLANS = new Set(['starter', 'pro', 'growth'])

// Limite de résultats par ville selon le plan (1 page Google = 20 max)
const RESULTS_LIMIT_PER_CITY: Record<string, number> = {
  starter: 5,
  growth: 20,
  pro: 20,
}

interface GooglePlace {
  id: string
  displayName?: { text: string }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  formattedAddress?: string
  rating?: number
  websiteUri?: string
}

interface BoostResult {
  id: string
  name: string
  phone: string
  address: string | null
  rating: number | null
  website: string | null
  city: string
}

async function searchCity(
  job: string,
  city: string,
  apiKey: string,
  maxResults: number,
  admin: SupabaseClient
): Promise<BoostResult[]> {
  const cacheCity = city.toLowerCase()
  const cacheProfession = job.toLowerCase()

  // Vérification du cache (30j TTL)
  const { data: cached } = await admin
    .from('search_cache')
    .select('results')
    .eq('city', cacheCity)
    .eq('profession', cacheProfession)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  let places: GooglePlace[]

  if (cached?.results) {
    places = cached.results as GooglePlace[]
  } else {
    const googleResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.formattedAddress,places.rating',
        },
        body: JSON.stringify({ textQuery: `${job} à ${city}`, languageCode: 'fr' }),
      }
    )

    if (!googleResponse.ok) return []

    const json = await googleResponse.json()
    places = json.places ?? []

    // Mise en cache
    await admin
      .from('search_cache')
      .upsert(
        {
          city: cacheCity,
          profession: cacheProfession,
          results: places,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'city,profession' }
      )
  }

  return places
    .filter((p) => p.nationalPhoneNumber || p.internationalPhoneNumber)
    .slice(0, maxResults)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? 'Inconnu',
      phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber!,
      address: p.formattedAddress ?? null,
      rating: p.rating ?? null,
      website: p.websiteUri ?? null,
      city,
    }))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const trade = typeof body.trade === 'string' ? body.trade.trim().slice(0, 100) : ''
    const rawZoneType: string = body.zone_type ?? 'city'
    const isFrance = rawZoneType === 'france'
    const zoneType: ZoneType = isFrance ? 'city' : (rawZoneType as ZoneType)
    const zoneValue = typeof body.zone_value === 'string' ? body.zone_value.trim().slice(0, 100) : ''
    const multiplier = Number(body.multiplier)
    const resetHistory = body.reset_history === true

    if (!trade || trade.length < 2) {
      return NextResponse.json({ error: 'Métier requis.' }, { status: 400 })
    }
    if (!isFrance && (!zoneValue || zoneValue.length < 2)) {
      return NextResponse.json({ error: 'Zone géographique requise.' }, { status: 400 })
    }
    if (![3, 5, 10, 20].includes(multiplier)) {
      return NextResponse.json({ error: 'Multiplicateur invalide (3, 5, 10 ou 20).' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createAdminClient()

    // ── Vérification du plan ──────────────────────────────────────────────────
    let sub = await getOrCreateSubscription(admin, user.id)
    if (!sub) return NextResponse.json({ error: 'Abonnement introuvable.' }, { status: 500 })

    const isStaff = sub.is_staff === true

    if (!isStaff) {
      if (!BOOST_ALLOWED_PLANS.has(sub.plan)) {
        return NextResponse.json(
          { error: 'Le Mode Booster est disponible à partir du plan Starter.', upgradeRequired: true },
          { status: 403 }
        )
      }

      // Auto-reset quota mensuel (avant tout calcul de crédits restants)
      sub = await resetPeriodIfExpired(admin, user.id, sub)
    }

    const totalAllowed = isStaff ? Number.MAX_SAFE_INTEGER : totalAllowedOf(sub)
    const remaining = isStaff ? Number.MAX_SAFE_INTEGER : totalAllowed - sub.searches_used

    if (!isStaff && remaining <= 0) {
      return NextResponse.json(
        {
          error: `Quota atteint (${sub.searches_used}/${totalAllowed}). Passez à un plan supérieur.`,
          limitReached: true,
        },
        { status: 429 }
      )
    }

    // ── Sélection des villes via l'algorithme Boost ───────────────────────────
    const communes = loadCommunesServer()
    if (!communes.length) {
      return NextResponse.json(
        { error: 'Données géographiques indisponibles. Réessayez dans quelques instants.' },
        { status: 503 }
      )
    }

    const poolCities = isFrance
      ? getCitiesForFrance(communes)
      : getCitiesForBoost(communes, zoneType, zoneValue)

    if (!poolCities.length) {
      return NextResponse.json(
        { error: isFrance ? 'Données géographiques indisponibles.' : `Aucune ville trouvée pour la zone "${zoneValue}".` },
        { status: 404 }
      )
    }

    // Réinitialisation de l'historique si demandé
    if (resetHistory) {
      await admin
        .from('boost_search_history')
        .delete()
        .eq('user_id', user.id)
        .eq('trade_keyword', trade.toLowerCase())
    }

    // Villes déjà recherchées pour ce métier
    const { data: alreadySearched } = await admin
      .from('boost_search_history')
      .select('city_name')
      .eq('user_id', user.id)
      .eq('trade_keyword', trade.toLowerCase())

    const searchedSet = new Set<string>(
      (alreadySearched ?? []).map((r) => r.city_name.toLowerCase())
    )

    // Exclure les villes déjà recherchées
    const availableCities = poolCities.filter(
      (c) => !searchedSet.has(c.nom.toLowerCase())
    )

    const exhausted = availableCities.length < multiplier
    const citiesAlreadyCovered = poolCities.length - availableCities.length

    // Prendre N villes (ou moins si pool épuisé)
    const creditsToUse = Math.min(multiplier, availableCities.length, remaining)

    if (creditsToUse === 0) {
      return NextResponse.json({
        results: [],
        cities_searched: [],
        exhausted: true,
        cities_already_covered: citiesAlreadyCovered,
        new_cities_found: 0,
        message: `Toutes les ${citiesAlreadyCovered} villes de cette zone ont déjà été couvertes pour "${trade}". Relancez le cycle pour recommencer.`,
      })
    }

    const selectedCities = availableCities.slice(0, creditsToUse)

    // ── Déduction atomique des crédits (ignorée pour staff) ──────────────────
    if (!isStaff) {
      const ok = await consumeCredits(admin, user.id, sub, creditsToUse)
      if (!ok) {
        return NextResponse.json(
          { error: 'Erreur quota (concurrence). Réessayez.', limitReached: true },
          { status: 429 }
        )
      }
    }

    // ── Recherche pour chaque ville ───────────────────────────────────────────
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    const maxPerCity = isStaff ? 60 : (RESULTS_LIMIT_PER_CITY[sub.plan] ?? 5)

    const allResults: BoostResult[] = []
    const citiesSearched: string[] = []
    let failedCities = 0

    if (!apiKey) {
      // Mode démo
      for (const city of selectedCities) {
        citiesSearched.push(city.nom)
        for (let i = 0; i < 3; i++) {
          allResults.push({
            id: `demo-boost-${city.nom}-${i}`,
            name: `${trade} Demo ${city.nom} ${i + 1}`,
            phone: `0${Math.floor(Math.random() * 9) + 1} ${Array.from({ length: 4 }, () =>
              String(Math.floor(Math.random() * 90) + 10)
            ).join(' ')}`,
            address: `${i + 1} rue de la Paix, ${city.nom}`,
            rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
            website: null,
            city: city.nom,
          })
        }
      }
    } else {
      for (let i = 0; i < selectedCities.length; i++) {
        const city = selectedCities[i]
        if (i > 0) {
          // Délai entre les appels Google pour éviter le rate limiting
          await new Promise((r) => setTimeout(r, 800))
        }
        try {
          const results = await searchCity(trade, city.nom, apiKey, maxPerCity, admin)
          allResults.push(...results)
          citiesSearched.push(city.nom)
        } catch {
          // Ville en erreur : on continue sans bloquer tout le boost
          failedCities++
        }
      }

      // Si toutes les villes ont échoué (panne fournisseur) : remboursement intégral
      if (!isStaff && failedCities === selectedCities.length) {
        await refundCredits(admin, user.id, creditsToUse)
        return NextResponse.json(
          { error: 'Le service de recherche est momentanément indisponible. Vos crédits n\'ont pas été décomptés — réessayez dans quelques instants.' },
          { status: 502 }
        )
      }
      // Remboursement partiel des villes en échec
      if (!isStaff && failedCities > 0) {
        await refundCredits(admin, user.id, failedCities)
      }
    }

    // ── Enregistrement dans l'historique (uniquement les villes traitées) ─────
    const searchedNames = new Set(citiesSearched)
    const historyRows = selectedCities
      .filter((c) => searchedNames.has(c.nom))
      .map((c) => ({
        user_id: user.id,
        trade_keyword: trade.toLowerCase(),
        city_name: c.nom.toLowerCase(),
        department_code: c.departement?.code ?? null,
      }))

    if (historyRows.length > 0) {
      await admin.from('boost_search_history').insert(historyRows)
    }

    // Enregistrement dans searches (une ligne par ville)
    if (citiesSearched.length > 0) {
      await admin.from('searches').insert(
        citiesSearched.map((cityName) => ({
          user_id: user.id,
          query_job: trade,
          query_city: cityName,
          results_count: allResults.filter((r) => r.city === cityName).length,
        }))
      )
    }

    const effectiveCredits = creditsToUse - failedCities

    return NextResponse.json({
      results: allResults,
      cities_searched: citiesSearched,
      total: allResults.length,
      credits_used: effectiveCredits,
      exhausted,
      cities_already_covered: citiesAlreadyCovered,
      new_cities_found: availableCities.length,
      total_pool: poolCities.length,
      demo: !apiKey,
      ...(exhausted && availableCities.length > 0
        ? {
            message: `${citiesAlreadyCovered} villes déjà couvertes. ${availableCities.length} nouvelle(s) ville(s) trouvée(s).`,
          }
        : {}),
    })
  } catch (error) {
    console.error('[boost] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}

// Endpoint DELETE pour purger l'historique d'un métier
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trade = searchParams.get('trade')?.trim().toLowerCase()

    if (!trade) return NextResponse.json({ error: 'Paramètre trade requis.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createAdminClient()
    await admin
      .from('boost_search_history')
      .delete()
      .eq('user_id', user.id)
      .eq('trade_keyword', trade)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
