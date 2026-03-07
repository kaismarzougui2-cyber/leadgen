import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DAILY_LIMIT_FREE = 5

function computeTrustScore(hasWebsite: boolean, hasPhone: boolean): number {
  if (hasWebsite && hasPhone) {
    return Math.floor(Math.random() * 16) + 85 // 85–100
  }
  if (hasPhone) {
    return Math.floor(Math.random() * 31) + 40 // 40–70
  }
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const { job, city } = await request.json()

    if (!job || !city) {
      return NextResponse.json(
        { error: 'Les champs "job" et "city" sont requis.' },
        { status: 400 }
      )
    }

    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    // Rate limiting for free users
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, plan')
      .eq('id', user.id)
      .single()

    const isPro = profile?.is_pro ?? false

    if (!isPro) {
      // Count today's searches using a simple approach via a searches counter
      // We track via a separate table or we can use a simple cookie approach.
      // For V1, we use a lightweight in-memory approach using Supabase custom metadata.
      // We store search_count + search_date in the profiles table.
      const { data: searchMeta } = await supabase
        .from('profiles')
        .select('daily_search_count, last_search_date')
        .eq('id', user.id)
        .single()

      const today = new Date().toISOString().split('T')[0]
      const lastDate = searchMeta?.last_search_date
      const currentCount =
        lastDate === today ? (searchMeta?.daily_search_count ?? 0) : 0

      if (currentCount >= DAILY_LIMIT_FREE) {
        return NextResponse.json(
          {
            error: `Limite quotidienne atteinte (${DAILY_LIMIT_FREE} recherches/jour). Passez en Pro pour des recherches illimitées.`,
            limitReached: true,
          },
          { status: 429 }
        )
      }

      // Increment counter
      await supabase
        .from('profiles')
        .update({
          daily_search_count: currentCount + 1,
          last_search_date: today,
        })
        .eq('id', user.id)
    }

    // Call Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Google Places non configurée.' },
        { status: 500 }
      )
    }

    const query = `${job} à ${city}`

    const googleResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedPhoneNumber,places.websiteUri',
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'fr',
        }),
      }
    )

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json()
      console.error('Google Places API error:', errorData)
      return NextResponse.json(
        { error: 'Erreur lors de la recherche Google Places.' },
        { status: 502 }
      )
    }

    const googleData = await googleResponse.json()
    const places = googleData.places ?? []

    // Transform and filter results
    const results = places
      .filter((place: GooglePlace) => place.formattedPhoneNumber) // Only with phone
      .map((place: GooglePlace) => {
        const hasWebsite = !!place.websiteUri
        const hasPhone = !!place.formattedPhoneNumber
        const trustScore = computeTrustScore(hasWebsite, hasPhone)
        const trustStatus =
          hasWebsite && hasPhone ? 'Vérifié' : 'Risqué'

        return {
          id: place.id,
          name: place.displayName?.text ?? 'Inconnu',
          phone: place.formattedPhoneNumber,
          website: place.websiteUri ?? null,
          trustScore,
          trustStatus,
        }
      })
      .sort((a: SearchResult, b: SearchResult) => b.trustScore - a.trustScore)

    return NextResponse.json({ results, total: results.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}

interface GooglePlace {
  id: string
  displayName?: { text: string }
  formattedPhoneNumber?: string
  websiteUri?: string
}

interface SearchResult {
  id: string
  name: string
  phone: string
  website: string | null
  trustScore: number
  trustStatus: string
}
