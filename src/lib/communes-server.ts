/**
 * Utilitaires communes côté serveur pour le Mode Booster.
 * Lit communes.json via fs (Node.js) — ne pas importer côté client.
 */
import fs from 'fs'
import path from 'path'

export interface CommuneEnriched {
  nom: string
  code?: string
  centre: { type: 'Point'; coordinates: [number, number] } // [lon, lat]
  codesPostaux?: string[]
  population?: number
  departement?: { code: string; nom: string }
  region?: { code: string; nom: string }
}

export type ZoneType = 'city' | 'department' | 'region'

let serverCache: CommuneEnriched[] | null = null

export function loadCommunesServer(): CommuneEnriched[] {
  if (serverCache) return serverCache
  const filePath = path.join(process.cwd(), 'public', 'communes.json')
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    serverCache = JSON.parse(raw) as CommuneEnriched[]
    return serverCache
  } catch {
    return []
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Retourne les villes candidates pour le boost selon la zone,
 * triées par population décroissante.
 * Limit interne à 500 pour éviter de charger trop de mémoire.
 */
export function getCitiesForBoost(
  communes: CommuneEnriched[],
  zoneType: ZoneType,
  zoneValue: string
): CommuneEnriched[] {
  if (!communes.length) return []

  if (zoneType === 'city') {
    const normalized = zoneValue.trim().toLowerCase()
    const origin =
      communes.find((c) => c.nom.toLowerCase() === normalized) ??
      communes.find((c) => c.nom.toLowerCase().startsWith(normalized))
    if (!origin?.centre) return []

    const [originLon, originLat] = origin.centre.coordinates

    return communes
      .filter((c) => c.nom.toLowerCase() !== origin.nom.toLowerCase() && c.centre)
      .map((c) => {
        const [lon, lat] = c.centre.coordinates
        const dist = haversine(originLat, originLon, lat, lon)
        return { commune: c, dist }
      })
      .filter(({ dist }) => dist <= 50)
      .sort((a, b) => (b.commune.population ?? 0) - (a.commune.population ?? 0))
      .slice(0, 500)
      .map(({ commune }) => commune)
  }

  if (zoneType === 'department') {
    return communes
      .filter((c) => c.departement?.code === zoneValue)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .slice(0, 500)
  }

  if (zoneType === 'region') {
    return communes
      .filter((c) => c.region?.nom === zoneValue || c.region?.code === zoneValue)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .slice(0, 500)
  }

  return []
}
