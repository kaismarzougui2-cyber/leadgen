// INSEE SIRENE V3.11 API client
// Registration required at https://portail-api.insee.fr/
// Set INSEE_API_TOKEN env var with your bearer token

export interface InseeData {
  siren: string
  siret: string
  naf_code: string | null
  naf_label: string | null
  legal_form: string | null
  employee_range: string | null
  creation_date: string | null
}

// Partial NAF code lookup for common trades (artisans, services)
const NAF_LABELS: Record<string, string> = {
  '43.22A': 'Plomberie',
  '43.22B': 'Installation chauffage / climatisation',
  '43.21A': 'Travaux électricité courante',
  '43.21B': 'Travaux électricité basse tension',
  '43.31Z': 'Travaux de plâtrerie',
  '43.32A': 'Menuiserie bois / PVC',
  '43.32B': 'Menuiserie aluminium',
  '43.33Z': 'Travaux de revêtement des sols et murs',
  '43.34Z': 'Peinture et vitrerie',
  '43.91A': 'Travaux de charpente',
  '43.91B': 'Travaux de couverture',
  '43.99C': 'Travaux de maçonnerie générale',
  '43.12A': 'Travaux de terrassement courants',
  '43.12B': 'Travaux de terrassement spécialisés',
  '96.02A': 'Coiffure',
  '96.02B': 'Soins de beauté',
  '96.04Z': 'Entretien corporel',
  '86.21Z': 'Médecine générale',
  '86.22A': 'Activités de radiodiagnostic',
  '86.23Z': 'Pratique dentaire',
  '86.90A': 'Ambulances',
  '86.90B': 'Laboratoires d\'analyses médicales',
  '86.90D': 'Activités des infirmiers / sages-femmes',
  '86.90E': 'Activités des professionnels de la rééducation',
  '86.90F': 'Activités de santé humaine NCA',
  '47.11A': 'Commerce alimentaire de surface < 120m²',
  '47.11B': 'Commerce alimentaire de surface ≥ 120m²',
  '56.10A': 'Restauration traditionnelle',
  '56.10B': 'Cafétérias et libres-services',
  '56.30Z': 'Débits de boissons',
  '45.11Z': 'Commerce voitures / véhicules légers',
  '45.20A': 'Entretien / réparation véhicules',
  '45.20B': 'Carrosserie',
  '49.32Z': 'Transports de voyageurs par taxi',
  '49.41A': 'Transports routiers de fret interurbains',
  '68.20A': 'Location logements',
  '68.20B': 'Location terrains / logements ruraux',
  '81.10Z': 'Services généraux de nettoyage de bâtiments',
  '81.21Z': 'Nettoyage courant des bâtiments',
  '74.20Z': 'Activités photographiques',
  '62.01Z': 'Programmation informatique',
  '69.10Z': 'Activités juridiques',
  '69.20Z': 'Activités comptables',
  '70.22Z': 'Conseil pour les affaires',
  '85.59B': 'Autres enseignements',
  '85.51Z': 'Enseignement de disciplines sportives / récréatives',
  '85.52Z': 'Enseignement culturel',
  '93.11Z': 'Gestion d\'installations sportives',
  '93.12Z': 'Activités de clubs de sports',
  '93.29Z': 'Autres activités récréatives / de loisirs',
}

// Legal form codes (top used in France)
const LEGAL_FORMS: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '2110': 'Indivision',
  '5499': 'SARL',
  '5498': 'EURL',
  '5710': 'SAS',
  '5720': 'SASU',
  '5800': 'SA',
  '6540': 'SCI',
  '6599': 'Autre société civile',
  '9210': 'Association loi 1901',
  '1100': 'Auto-entrepreneur',
  '5306': 'SNC',
  '2120': 'Indivision entre personnes morales',
  '5305': 'SCP',
  '5308': 'Société en commandite simple',
  '5410': 'GIE',
}

// Employee range codes
const EMPLOYEE_RANGES: Record<string, string> = {
  'NN': 'Non renseigné',
  '00': '0 salarié',
  '01': '1-2 salariés',
  '02': '3-5 salariés',
  '03': '6-9 salariés',
  '11': '10-19 salariés',
  '12': '20-49 salariés',
  '21': '50-99 salariés',
  '22': '100-199 salariés',
  '31': '200-249 salariés',
  '32': '250-499 salariés',
  '41': '500-999 salariés',
  '42': '1 000-1 999 salariés',
  '51': '2 000-4 999 salariés',
  '52': '5 000-9 999 salariés',
  '53': '10 000 salariés et plus',
}

const LEGAL_SUFFIX_RE = /\b(sarl|sas|sa|eurl|snc|sci|sasu|eirl|gmbh|ltd|llc)\b\.?/gi
const POSTAL_CODE_RE = /\b(\d{5})\b/

function extractPostalCode(address: string | null): string | null {
  if (!address) return null
  const match = address.match(POSTAL_CODE_RE)
  return match ? match[1] : null
}

function normalizeName(name: string): string {
  return name
    .replace(LEGAL_SUFFIX_RE, '')
    .replace(/[+\-&|!(){}[\]^"~*?:\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function enrichWithInsee(
  name: string,
  address: string | null
): Promise<InseeData | null> {
  const token = process.env.INSEE_API_TOKEN
  if (!token) return null

  const cleanName = normalizeName(name)
  if (!cleanName) return null

  const postalCode = extractPostalCode(address)

  let query: string
  if (postalCode) {
    query = `denominationUniteLegale:"${cleanName}" AND codePostalEtablissement:${postalCode} AND etatAdministratifEtablissement:A`
  } else {
    // Fallback: extract city from address (last word-group before "France")
    const cityMatch = address?.replace(/, France$/i, '').split(',').pop()?.trim().toUpperCase()
    if (cityMatch) {
      query = `denominationUniteLegale:"${cleanName}" AND libelleCommuneEtablissement:"${cityMatch}" AND etatAdministratifEtablissement:A`
    } else {
      query = `denominationUniteLegale:"${cleanName}" AND etatAdministratifEtablissement:A`
    }
  }

  try {
    const url = `https://api.insee.fr/entreprises/sirene/V3.11/siret?q=${encodeURIComponent(query)}&nombre=1`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const json = await res.json()
    const etab = json?.etablissements?.[0]
    if (!etab) return null

    const ul = etab.uniteLegale ?? {}
    const nafCode = ul.activitePrincipaleUniteLegale ?? null
    const legalFormCode = ul.categorieJuridiqueUniteLegale ?? null
    const employeeCode = ul.trancheEffectifsUniteLegale ?? null
    const siret: string = etab.siret ?? ''
    const siren = siret.slice(0, 9) || (ul.siren ?? '')

    return {
      siren,
      siret,
      naf_code: nafCode,
      naf_label: nafCode ? (NAF_LABELS[nafCode] ?? null) : null,
      legal_form: legalFormCode ? (LEGAL_FORMS[legalFormCode] ?? null) : null,
      employee_range: employeeCode ? (EMPLOYEE_RANGES[employeeCode] ?? null) : null,
      creation_date: ul.dateCreationUniteLegale ?? null,
    }
  } catch {
    return null
  }
}
