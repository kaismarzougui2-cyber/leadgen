/**
 * Module de gestion des communes françaises.
 * Charge communes.json une seule fois (cache mémoire) et
 * calcule les villes proches via la formule Haversine.
 */

interface Commune {
  nom: string;
  centre: { type: "Point"; coordinates: [number, number] }; // [lon, lat]
  codesPostaux: string[];
}

export interface NearbyCity {
  nom: string;
  distance: number; // km
}

// ─── Cache module-level (persiste pendant la durée de vie de la page) ──────
let cache: Commune[] | null = null;
let loadPromise: Promise<Commune[]> | null = null;

export async function loadCommunes(): Promise<Commune[]> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/communes.json")
    .then((r) => {
      if (!r.ok) throw new Error(`communes.json non disponible (${r.status})`);
      return r.json() as Promise<Commune[]>;
    })
    .then((data) => {
      cache = data;
      return data;
    })
    .catch(() => {
      // Fichier absent ou erreur réseau → suggestions désactivées silencieusement
      loadPromise = null;
      return [];
    });

  return loadPromise;
}

// ─── Haversine ───────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Recherche des communes proches ─────────────────────────────────────────
/**
 * Retourne les communes les plus proches de `cityName` dans un rayon de `maxKm`.
 * Renvoie un tableau vide si la ville n'est pas trouvée dans le fichier.
 */
export function getNearbyCities(
  communes: Commune[],
  cityName: string,
  maxKm = 30,
  limit = 5
): NearbyCity[] {
  if (!communes.length) return [];

  const normalized = cityName.trim().toLowerCase();

  // Correspondance exacte d'abord, puis partielle
  const origin =
    communes.find((c) => c.nom.toLowerCase() === normalized) ??
    communes.find((c) => c.nom.toLowerCase().startsWith(normalized));

  if (!origin || !origin.centre) return [];

  const [originLon, originLat] = origin.centre.coordinates;

  return communes
    .filter(
      (c) =>
        c.nom.toLowerCase() !== origin.nom.toLowerCase() &&
        c.centre // certaines petites communes n'ont pas de centre
    )
    .map((c) => {
      const [lon, lat] = c.centre.coordinates;
      return { nom: c.nom, distance: haversine(originLat, originLon, lat, lon) };
    })
    .filter((c) => c.distance <= maxKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
