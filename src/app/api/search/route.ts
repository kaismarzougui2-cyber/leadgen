import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enrichWithInsee } from '@/lib/insee'
import {
  getOrCreateSubscription,
  resetPeriodIfExpired,
  consumeCredits,
  refundCredits,
  totalAllowedOf,
} from '@/lib/quota'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Sanitize and cap input length to prevent abuse
    const job = typeof body.job === 'string' ? body.job.trim().slice(0, 100) : ''
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 100) : ''

    if (!job || !city) {
      return NextResponse.json(
        { error: 'Les champs "job" et "city" sont requis.' },
        { status: 400 }
      )
    }

    if (job.length < 2 || city.length < 2) {
      return NextResponse.json({ error: 'Requête trop courte.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    // Les quotas passent par le client service role : la table subscriptions
    // n'est pas modifiable par les utilisateurs (voir migration harden_security).
    const admin = createAdminClient()

    let sub = await getOrCreateSubscription(admin, user.id)
    if (!sub) {
      return NextResponse.json({ error: 'Abonnement introuvable.' }, { status: 500 })
    }

    const isStaff = sub.is_staff === true
    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    // Mode démo (pas de clé API) : données fictives, aucun crédit consommé
    if (!apiKey) {
      const mockResults = generateMockResults(job, city)
      await admin.from('searches').insert({ user_id: user.id, query_job: job, query_city: city, results_count: mockResults.length })
      return NextResponse.json({ results: mockResults, total: mockResults.length, demo: true })
    }

    if (!isStaff) {
      sub = await resetPeriodIfExpired(admin, user.id, sub)

      const ok = await consumeCredits(admin, user.id, sub, 1)
      if (!ok) {
        const totalAllowed = totalAllowedOf(sub)
        return NextResponse.json(
          {
            error: `Quota de 30 jours atteint (${sub.searches_used}/${totalAllowed} recherches). Passez à un plan supérieur.`,
            limitReached: true,
            plan: sub.plan,
            searchesUsed: sub.searches_used,
            searchesLimit: totalAllowed,
          },
          { status: 429 }
        )
      }
    }

    const RESULTS_LIMIT: Record<string, number> = {
      free: 5,
      starter: 5,
      growth: 20,
      pro: 60,
    }
    const maxResults = isStaff ? 60 : (RESULTS_LIMIT[sub.plan] ?? 5)

    // ── Cache lookup ──────────────────────────────────────────────────────────
    const cacheCity = city.toLowerCase()
    const cacheProfession = job.toLowerCase()

    const { data: cached } = await admin
      .from('search_cache')
      .select('results')
      .eq('city', cacheCity)
      .eq('profession', cacheProfession)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    let allGoogleResults: GooglePlace[]

    if (cached?.results) {
      allGoogleResults = cached.results as GooglePlace[]
    } else {
      // ── Google Maps avec pagination (jusqu'à 3 pages = 60 résultats) ────────
      allGoogleResults = []
      let pageToken: string | undefined = undefined
      let page = 1

      while (page <= 3) {
        if (page > 1 && pageToken) {
          // Obligatoire : Google renvoie INVALID_REQUEST si on appelle trop vite
          await new Promise((r) => setTimeout(r, 2000))
        }

        const requestBody: Record<string, unknown> = {
          textQuery: `${job} à ${city}`,
          languageCode: 'fr',
        }
        if (pageToken) requestBody.pageToken = pageToken

        const googleResponse = await fetch(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.formattedAddress,places.rating,nextPageToken',
            },
            body: JSON.stringify(requestBody),
          }
        )

        if (!googleResponse.ok) {
          const googleError = await googleResponse.json().catch(() => null)
          console.error(`[search] Google Places API error (page ${page}):`, googleError)
          if (page === 1) {
            // Échec total : le crédit réservé est remboursé
            if (!isStaff) await refundCredits(admin, user.id, 1)
            return NextResponse.json(
              { error: 'Le service de recherche est momentanément indisponible. Votre crédit n\'a pas été décompté — réessayez dans quelques instants.' },
              { status: 502 }
            )
          }
          // Pages 2/3 : on s'arrête silencieusement si erreur
          break
        }

        const json = await googleResponse.json()
        const places: GooglePlace[] = json.places ?? []
        allGoogleResults = allGoogleResults.concat(places)

        pageToken = json.nextPageToken ?? undefined
        if (!pageToken) break
        page++
      }

      // Sauvegarde en cache (upsert sur city + profession)
      const { error: cacheError } = await admin
        .from('search_cache')
        .upsert(
          {
            city: cacheCity,
            profession: cacheProfession,
            results: allGoogleResults,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'city,profession' }
        )

      if (cacheError) {
        console.warn('[search] Échec mise en cache (non bloquant):', cacheError.message)
      }
    }

    // ── Filtrage + plan limit ─────────────────────────────────────────────────
    const filtered: SearchResult[] = allGoogleResults
      .filter((p) => p.nationalPhoneNumber || p.internationalPhoneNumber)
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text ?? 'Inconnu',
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber!,
        address: p.formattedAddress ?? null,
        rating: p.rating ?? null,
        website: p.websiteUri ?? null,
      }))

    const sliced = filtered.slice(0, maxResults)
    const truncated = filtered.length > maxResults

    // Enrich with INSEE SIRENE data (non-blocking, capped at 20 to avoid rate limits)
    const toEnrich = sliced.slice(0, 20)
    const inseeSettled = process.env.INSEE_API_TOKEN
      ? await Promise.allSettled(toEnrich.map((r) => enrichWithInsee(r.name, r.address)))
      : []

    const results: SearchResult[] = sliced.map((r, i) => {
      const settlement = inseeSettled[i]
      const insee = settlement?.status === 'fulfilled' ? settlement.value : null
      return insee ? { ...r, siren: insee.siren, siret: insee.siret, naf_code: insee.naf_code, naf_label: insee.naf_label } : r
    })

    await admin.from('searches').insert({ user_id: user.id, query_job: job, query_city: city, results_count: results.length })

    return NextResponse.json({ results, total: filtered.length, truncated, plan: sub.plan })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}

function generateMockResults(job: string, city: string): SearchResult[] {
  const entries = [
    { name: `${job} Dupont & Fils`, website: 'https://example-pro.fr', address: `12 rue de la Paix, ${city}`, rating: 4.8 },
    { name: `Atelier ${job} Martin`, website: null, address: `7 avenue Gambetta, ${city}`, rating: 4.2 },
    { name: `${job} Express ${city}`, website: 'https://artisan-demo.fr', address: `3 place Victor Hugo, ${city}`, rating: 4.5 },
    { name: `Pro ${job} Services`, website: null, address: `18 boulevard Haussmann, ${city}`, rating: 3.9 },
    { name: `${job} du Centre`, website: 'https://services-demo.fr', address: `5 rue du Commerce, ${city}`, rating: 4.7 },
    { name: `${job} Leblanc`, website: 'https://pro-demo.fr', address: `22 allée des Roses, ${city}`, rating: 4.1 },
    { name: `${job} & Co ${city}`, website: null, address: `9 rue Lafayette, ${city}`, rating: 4.3 },
    { name: `Cabinet ${job} Bernard`, website: 'https://cabinet-demo.fr', address: `1 place de la République, ${city}`, rating: 4.6 },
  ]
  return entries.map((entry, i) => ({
    id: `demo-${i}`,
    name: entry.name,
    phone: `0${Math.floor(Math.random() * 9) + 1} ${Array.from({ length: 4 }, () =>
      String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')
    ).join(' ')}`,
    address: entry.address,
    rating: entry.rating,
    website: entry.website,
  }))
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

export interface SearchResult {
  id: string
  name: string
  phone: string
  address: string | null
  rating: number | null
  website: string | null
  siren?: string | null
  siret?: string | null
  naf_code?: string | null
  naf_label?: string | null
}
