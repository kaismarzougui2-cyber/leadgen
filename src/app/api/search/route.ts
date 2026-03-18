import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichWithInsee } from '@/lib/insee'
import { PLAN_LIMITS, type PlanId } from '@/lib/plans'

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

    // Quota check via subscriptions table
    let { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan, searches_used, searches_limit, extra_credits, period_start')
      .eq('user_id', user.id)
      .single()

    // Fallback for existing users without a subscription row
    if (!sub) {
      const now = new Date().toISOString()
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan: 'free',
        searches_limit: 5,
        searches_used: 0,
        period_start: now,
      })
      const { data: newSub } = await supabase
        .from('subscriptions')
        .select('id, plan, searches_used, searches_limit, extra_credits, period_start')
        .eq('user_id', user.id)
        .single()
      sub = newSub
    }

    // Auto-reset if 30 days have passed since period_start
    if (sub?.period_start) {
      const daysSince = (Date.now() - new Date(sub.period_start).getTime()) / 86_400_000
      if (daysSince >= 30) {
        const now = new Date().toISOString()
        await supabase
          .from('subscriptions')
          .update({ searches_used: 0, period_start: now, updated_at: now })
          .eq('user_id', user.id)
        sub = { ...sub, searches_used: 0, period_start: now }
      }
    }

    if (!sub) {
      return NextResponse.json({ error: 'Abonnement introuvable.' }, { status: 500 })
    }

    const planLimit = PLAN_LIMITS[(sub.plan as PlanId) ?? 'free'] ?? 5
    const totalAllowed = planLimit + (sub.extra_credits ?? 0)

    // ── Atomic quota increment ────────────────────────────────────────────────
    const now = new Date().toISOString()
    const { data: incremented } = await supabase
      .from('subscriptions')
      .update({ searches_used: sub.searches_used + 1, updated_at: now })
      .eq('user_id', user.id)
      .eq('searches_used', sub.searches_used)
      .lt('searches_used', totalAllowed)
      .select('searches_used')

    if (!incremented || incremented.length === 0) {
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
    // ─────────────────────────────────────────────────────────────────────────

    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    // Demo mode
    if (!apiKey) {
      const mockResults = generateMockResults(job, city)
      await supabase.from('searches').insert({ user_id: user.id, query_job: job, query_city: city, results_count: mockResults.length })
      return NextResponse.json({ results: mockResults, total: mockResults.length, demo: true })
    }

    const RESULTS_LIMIT: Record<string, number> = {
      free: 5,
      starter: 5,
      growth: 20,
      pro: 60,
    }
    const maxResults = RESULTS_LIMIT[sub?.plan ?? 'free'] ?? 5

    // ── Cache lookup ──────────────────────────────────────────────────────────
    const cacheCity = city.toLowerCase()
    const cacheProfession = job.toLowerCase()

    const { data: cached } = await supabase
      .from('search_cache')
      .select('results')
      .eq('city', cacheCity)
      .eq('profession', cacheProfession)
      .gt('expires_at', new Date().toISOString())
      .single()

    let allGoogleResults: GooglePlace[]

    if (cached?.results) {
      console.log(`[search] CACHE HIT — "${job}" à "${city}" (${(cached.results as GooglePlace[]).length} résultats)`)
      allGoogleResults = cached.results as GooglePlace[]
    } else {
      console.log(`[search] CACHE MISS — "${job}" à "${city}" — appel Google Maps API`)

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
          const googleError = await googleResponse.json()
          console.error(`[search] Google Places API error (page ${page}):`, googleError)
          if (page === 1) {
            const detail = googleError?.error?.message ?? googleError?.error?.status ?? JSON.stringify(googleError)
            return NextResponse.json({ error: `Erreur Google Places : ${detail}` }, { status: 502 })
          }
          // Pages 2/3 : on s'arrête silencieusement si erreur
          break
        }

        const json = await googleResponse.json()
        const places: GooglePlace[] = json.places ?? []
        allGoogleResults = allGoogleResults.concat(places)

        console.log(`[search] Page ${page} — ${places.length} résultats (total: ${allGoogleResults.length})`)

        pageToken = json.nextPageToken ?? undefined
        if (!pageToken) break
        page++
      }

      // Sauvegarde en cache (upsert sur city + profession)
      const { error: cacheError } = await supabase
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
      } else {
        console.log(`[search] Résultats mis en cache — "${job}" à "${city}" (${allGoogleResults.length} entrées)`)
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

    await supabase.from('searches').insert({ user_id: user.id, query_job: job, query_city: city, results_count: results.length })

    return NextResponse.json({ results, total: filtered.length, truncated, plan: sub?.plan ?? 'free' })

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
