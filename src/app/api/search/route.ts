import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { job, city } = await request.json()

    if (!job || !city) {
      return NextResponse.json(
        { error: 'Les champs "job" et "city" sont requis.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    // Quota check via subscriptions table
    let { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan, searches_used, searches_limit, extra_credits')
      .eq('user_id', user.id)
      .single()

    // Fallback for existing users without a subscription row
    if (!sub) {
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan: 'free',
        searches_limit: 5,
        searches_used: 0,
      })
      const { data: newSub } = await supabase
        .from('subscriptions')
        .select('id, plan, searches_used, searches_limit, extra_credits')
        .eq('user_id', user.id)
        .single()
      sub = newSub
    }

    if (sub) {
      const totalAllowed = sub.searches_limit + (sub.extra_credits ?? 0)
      if (sub.searches_used >= totalAllowed) {
        return NextResponse.json(
          {
            error: `Quota mensuel atteint (${sub.searches_used}/${totalAllowed} recherches). Passez à un plan supérieur ou achetez des crédits.`,
            limitReached: true,
            plan: sub.plan,
            searchesUsed: sub.searches_used,
            searchesLimit: totalAllowed,
          },
          { status: 429 }
        )
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    // Demo mode
    if (!apiKey) {
      const mockResults = generateMockResults(job, city)
      await Promise.all([
        supabase.from('searches').insert({ user_id: user.id, query_job: job, query_city: city, results_count: mockResults.length }),
        supabase.from('subscriptions').update({ searches_used: (sub?.searches_used ?? 0) + 1, updated_at: new Date().toISOString() }).eq('user_id', user.id),
      ])
      return NextResponse.json({ results: mockResults, total: mockResults.length, demo: true })
    }

    const googleResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedPhoneNumber,places.websiteUri,places.formattedAddress,places.rating',
        },
        body: JSON.stringify({ textQuery: `${job} à ${city}`, languageCode: 'fr' }),
      }
    )

    if (!googleResponse.ok) {
      console.error('Google Places API error:', await googleResponse.json())
      return NextResponse.json({ error: 'Erreur lors de la recherche Google Places.' }, { status: 502 })
    }

    const places = (await googleResponse.json()).places ?? []

    const results: SearchResult[] = places
      .filter((p: GooglePlace) => p.formattedPhoneNumber)
      .map((p: GooglePlace) => ({
        id: p.id,
        name: p.displayName?.text ?? 'Inconnu',
        phone: p.formattedPhoneNumber!,
        address: p.formattedAddress ?? null,
        rating: p.rating ?? null,
        website: p.websiteUri ?? null,
      }))

    await Promise.all([
      supabase.from('searches').insert({ user_id: user.id, query_job: job, query_city: city, results_count: results.length }),
      supabase.from('subscriptions').update({ searches_used: (sub?.searches_used ?? 0) + 1, updated_at: new Date().toISOString() }).eq('user_id', user.id),
    ])

    return NextResponse.json({ results, total: results.length })
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
  formattedPhoneNumber?: string
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
}
