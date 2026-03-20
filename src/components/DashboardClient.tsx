"use client";

import { useState } from "react";
import {
  Search,
  Zap,
  Globe,
  Phone,
  MapPin,
  Star,
  Loader2,
  TrendingUp,
  LogOut,
  BookmarkPlus,
  CheckCircle,
  X,
  Users,
  AlertTriangle,
  Settings,
  Lightbulb,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface SearchResult {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  rating: number | null;
  website: string | null;
  siren?: string | null;
  siret?: string | null;
  naf_code?: string | null;
  naf_label?: string | null;
  alreadySaved?: boolean;
}

interface SaveStatus {
  loading: boolean;
  savedCount: number;
  error: string | null;
}

interface Props {
  user: { email: string };
  plan: string;
  searchesUsed: number;
  searchesLimit: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

export default function DashboardClient({ user, plan, searchesUsed: initialUsed, searchesLimit }: Props) {
  const [job, setJob] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [searchesUsed, setSearchesUsed] = useState(initialUsed);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ loading: false, savedCount: 0, error: null });
  const [truncated, setTruncated] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  // ROI simulator
  const [roiLeads, setRoiLeads] = useState(50);
  const [roiConversion, setRoiConversion] = useState(5);
  const [roiRevenue, setRoiRevenue] = useState(500);
  const roiTotal = Math.round((roiLeads * roiConversion) / 100 * roiRevenue);

  const remaining = searchesLimit - searchesUsed;
  const limitReached = remaining <= 0;

  const allSaved = results.length > 0 && results.every((r) => r.alreadySaved);

  function getSuggestions(): { label: string; job: string; city: string }[] {
    if (!job || !city) return [];
    const synonymes: Record<string, string[]> = {
      plombier: ["plomberie", "chauffagiste", "sanitaire"],
      electricien: ["électricité", "électricien industriel", "domotique"],
      menuisier: ["menuiserie", "charpentier", "ébéniste"],
      peintre: ["peinture bâtiment", "décorateur", "revêtement sol"],
      maçon: ["maçonnerie", "carreleur", "façadier"],
      serrurier: ["serrurerie", "métallerie", "sécurité porte"],
      coiffeur: ["salon de coiffure", "barbier", "esthéticienne"],
      boulanger: ["boulangerie", "pâtissier", "artisan boulanger"],
      comptable: ["expert comptable", "cabinet comptable", "gestion paie"],
      avocat: ["cabinet avocat", "juriste", "notaire"],
      médecin: ["cabinet médical", "généraliste", "médecin de garde"],
      restaurant: ["brasserie", "pizzeria", "traiteur"],
      garage: ["mécanicien auto", "carrossier", "auto-école"],
      agent: ["agence immobilière", "promoteur immobilier", "syndic"],
    };
    const jobLower = job.toLowerCase();
    const altJobs = Object.entries(synonymes).find(([k]) => jobLower.includes(k))?.[1] ?? [];
    const suggestions: { label: string; job: string; city: string }[] = [];
    altJobs.slice(0, 2).forEach((alt) => suggestions.push({ label: `${alt} à ${city}`, job: alt, city }));
    suggestions.push({ label: `${job} dans ${city} centre`, job, city: `${city} centre` });
    suggestions.push({ label: `${job} près de ${city}`, job, city: `près de ${city}` });
    return suggestions.slice(0, 3);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!job.trim() || !city.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSaveStatus({ loading: false, savedCount: 0, error: null });
    setTruncated(false);
    setHiddenCount(0);

    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // Fetch already-saved place IDs in parallel with the search
      const [res, savedRes] = await Promise.all([
        fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: job.trim(), city: city.trim() }),
        }),
        authUser
          ? supabase
              .from("prospects")
              .select("google_place_id, phone")
              .eq("user_id", authUser.id)
          : Promise.resolve({ data: [] }),
      ]);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la recherche.");
        return;
      }

      // Build a set of already-saved identifiers
      const savedIds = new Set<string>();
      const savedPhones = new Set<string>();
      if (savedRes && "data" in savedRes && savedRes.data) {
        for (const p of savedRes.data) {
          if (p.google_place_id) savedIds.add(p.google_place_id);
          if (p.phone) savedPhones.add(p.phone);
        }
      }

      // Mark duplicates then sort: new leads first, already-saved last
      const allResults: SearchResult[] = data.results
        .map((r: SearchResult) => ({
          ...r,
          alreadySaved:
            (!r.id.startsWith("demo-") && savedIds.has(r.id)) ||
            !!(r.phone && savedPhones.has(r.phone)),
        }))
        .sort((a: SearchResult, b: SearchResult) => Number(a.alreadySaved) - Number(b.alreadySaved));
      const hiddenDuplicates = allResults.filter((r) => r.alreadySaved).length;

      setHiddenCount(hiddenDuplicates);
      setResults(allResults);
      setIsDemo(!!data.demo);
      setTruncated(!!data.truncated);
      setSearched(true);
      setSearchesUsed((prev) => Math.min(prev + 1, searchesLimit));
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAll() {
    if (results.length === 0) return;
    setSaveStatus({ loading: true, savedCount: 0, error: null });

    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      setSaveStatus({ loading: false, savedCount: 0, error: "Non authentifié." });
      return;
    }

    const prospects = results.filter((r) => !r.alreadySaved).map((r) => ({
      user_id: authUser.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      rating: r.rating,
      google_place_id: r.id.startsWith("demo-") ? null : r.id,
      website: r.website,
      status: "À appeler",
      siren: r.siren ?? null,
      siret: r.siret ?? null,
      naf_code: r.naf_code ?? null,
      naf_label: r.naf_label ?? null,
    }));

    const { error: insertError, data: inserted } = await supabase
      .from("prospects")
      .insert(prospects)
      .select();

    if (insertError) {
      setSaveStatus({ loading: false, savedCount: 0, error: insertError.message });
    } else {
      setSaveStatus({ loading: false, savedCount: inserted?.length ?? 0, error: null });
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pb-20 sm:pb-0">
      {/* Navbar */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LeadGen</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-white bg-[#1a1a1a]">
              Recherche
            </Link>
            <Link href="/crm" className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-[#aaaaaa] hover:text-white hover:bg-[#111111] transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-[#aaaaaa] hidden sm:block">
            <span className={remaining <= 2 ? "text-amber-400 font-medium" : "text-white font-medium"}>
              {searchesUsed}/{searchesLimit}
            </span>{" "}
            recherches ce mois
          </span>
          <span className="inline-flex items-center gap-1 bg-[#160002] border border-[#3a0002] text-[#E5000A] text-xs font-medium px-2.5 py-1 rounded-full">
            {PLAN_LABELS[plan] ?? plan}
          </span>
          {plan === "free" && (
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center gap-1 bg-[#E5000A] hover:bg-[#CC0000] text-white text-xs font-semibold px-3 py-1.5 rounded-[9px] transition-colors"
            >
              <Zap className="w-3 h-3" />
              Upgrader
            </Link>
          )}
          <span className="text-sm text-[#aaaaaa] hidden sm:block">{user.email}</span>
          <Link href="/account" className="flex items-center gap-1.5 text-sm text-[#aaaaaa] hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:block">Compte</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[#aaaaaa] hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-[#1a1a1a] flex">
        <Link
          href="/dashboard"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#E5000A] bg-[#160002]"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Recherche</span>
        </Link>
        <Link
          href="/crm"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#666666] active:bg-[#111111]"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Mon CRM</span>
        </Link>
        {plan === "free" && (
          <Link
            href="/pricing"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#E5000A] active:bg-[#111111]"
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium">Upgrader</span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#666666] active:bg-[#111111]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Déco</span>
        </button>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Search Section */}
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Moteur de recherche</h1>
            <p className="text-[#aaaaaa] mt-1">
              Entrez un métier et une ville pour trouver des prospects qualifiés.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Métier (ex: plombier, coiffeur...)"
                className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville (ex: Paris, Lyon...)"
                className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || limitReached}
              className="flex items-center justify-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-[12px] transition-colors whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Recherche..." : "Rechercher"}
            </button>
          </form>

          {limitReached && (
            <div className="flex items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-[12px] text-amber-400 text-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Quota mensuel atteint. Passez à un plan supérieur pour continuer.
              </div>
              <Link
                href="/pricing"
                className="shrink-0 bg-[#E5000A] hover:bg-[#CC0000] text-white text-xs font-semibold px-3 py-1.5 rounded-[9px] transition-colors"
              >
                Voir les plans
              </Link>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-[12px] text-red-400 text-sm">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </section>

        {/* ROI Simulator */}
        <section className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-[#22C55E]" />
            <h2 className="text-lg font-semibold text-white">Simulateur de ROI</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "Nombre de leads", value: roiLeads, min: 10, max: 500, step: 10, set: setRoiLeads, format: (v: number) => String(v) },
              { label: "Taux de conversion", value: roiConversion, min: 1, max: 30, step: 1, set: setRoiConversion, format: (v: number) => `${v}%` },
              { label: "Panier moyen", value: roiRevenue, min: 100, max: 5000, step: 100, set: setRoiRevenue, format: (v: number) => `${v}€` },
            ].map(({ label, value, min, max, step, set, format }) => (
              <div key={label}>
                <label className="block text-sm text-[#aaaaaa] mb-2">
                  {label} <span className="text-white font-medium">{format(value)}</span>
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full accent-[#E5000A]"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#001a05] border border-[#22C55E]/30 rounded-[12px] flex items-center justify-between">
            <div>
              <p className="text-[#aaaaaa] text-sm">CA potentiel estimé</p>
              <p className="text-sm text-[#666666] mt-0.5">{roiLeads} leads × {roiConversion}% conv. × {roiRevenue}€</p>
            </div>
            <p className="text-3xl font-bold text-[#22C55E]" suppressHydrationWarning>{roiTotal.toLocaleString("fr-FR")}€</p>
          </div>
        </section>

        {/* Results */}
        {searched && (
          <section className="space-y-4">
            {isDemo && (
              <div className="flex items-center gap-3 p-4 bg-[#E5000A]/10 border border-[#E5000A]/30 rounded-[12px] text-sm text-[#E5000A]">
                <Zap className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Mode Démo</strong> — Données fictives. Ajoutez{" "}
                  <code className="bg-[#1a1a1a] px-1 rounded">GOOGLE_PLACES_API_KEY</code> sur Vercel pour des résultats réels.
                </span>
              </div>
            )}
            {truncated && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-[12px] text-sm text-amber-400">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Plan Free — 5 résultats maximum.</strong> Passez au plan Growth ou Pro pour voir jusqu&apos;à 20 ou 60 résultats par recherche.
                  </span>
                </div>
                <Link
                  href="/pricing"
                  className="shrink-0 bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold px-4 py-2 rounded-[9px] transition-colors whitespace-nowrap"
                >
                  Voir les plans
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Résultats ({results.length})</h2>
                {hiddenCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#E5000A]/10 border border-[#E5000A]/30 text-[#E5000A] px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {hiddenCount} déjà dans votre CRM
                  </span>
                )}
                {allSaved && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full">
                    Tous déjà dans le CRM
                  </span>
                )}
              </div>
              {results.length > 0 && (
                <div className="flex items-center gap-3">
                  {saveStatus.savedCount > 0 && (
                    <Link href="/crm" className="text-sm text-[#22C55E] hover:underline flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Voir dans le CRM
                    </Link>
                  )}
                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus.loading || saveStatus.savedCount > 0}
                    className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-[9px] transition-colors text-sm"
                  >
                    {saveStatus.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus.savedCount > 0 ? <CheckCircle className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                    {saveStatus.savedCount > 0 ? `${saveStatus.savedCount} sauvegardés !` : saveStatus.loading ? "Sauvegarde..." : "Tout sauvegarder dans mon CRM"}
                  </button>
                </div>
              )}
            </div>

            {saveStatus.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[9px] text-red-400 text-sm">
                {saveStatus.error}
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-center py-16 text-[#666666]">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">Aucun résultat trouvé</p>
                <p className="text-sm mt-1">Essayez avec un autre métier ou une autre ville.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((result) => (
                    <LeadCard key={result.id} result={result} />
                  ))}
                </div>

                {allSaved && getSuggestions().length > 0 && (
                  <div className="p-5 rounded-[12px] border border-amber-500/20 bg-amber-500/5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                      <Lightbulb className="w-4 h-4" />
                      Tous ces prospects sont déjà dans votre CRM. Essayez ces variantes pour trouver de nouveaux leads :
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestions().map((s) => (
                        <button
                          key={s.label}
                          onClick={() => { setJob(s.job); setCity(s.city); }}
                          className="inline-flex items-center gap-1.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] text-white text-sm px-3 py-1.5 rounded-[9px] transition-colors"
                        >
                          <Search className="w-3.5 h-3.5 text-[#aaaaaa]" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function LeadCard({ result }: { result: SearchResult }) {
  return (
    <div className={`bg-[#0d0d0d] border rounded-[12px] p-5 transition-colors flex flex-col gap-2.5 ${result.alreadySaved ? "border-white/5 opacity-50" : "border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white text-sm line-clamp-2">{result.name}</h3>
        {result.alreadySaved && (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium bg-[#E5000A]/10 border border-[#E5000A]/30 text-[#E5000A] px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> CRM
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-[#aaaaaa]">
        <Phone className="w-3.5 h-3.5 text-[#E5000A] shrink-0" />
        <a href={`tel:${result.phone}`} className="hover:text-[#E5000A] transition-colors">{result.phone}</a>
      </div>

      {result.address && (
        <div className="flex items-start gap-2 text-sm text-[#aaaaaa]">
          <MapPin className="w-3.5 h-3.5 text-[#666666] shrink-0 mt-0.5" />
          <span className="line-clamp-2">{result.address}</span>
        </div>
      )}

      {result.rating !== null && (
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-amber-400 font-medium">{result.rating}</span>
          <span className="text-[#666666]">/ 5</span>
        </div>
      )}

      {result.website ? (
        <div className="flex items-center gap-2 text-sm text-[#aaaaaa]">
          <Globe className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
          <a
            href={result.website}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#22C55E] transition-colors truncate"
          >
            {result.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-[#333333]">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>Pas de site web</span>
        </div>
      )}

      {result.siren && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-mono">
            SIREN {result.siren}
          </span>
          {result.naf_label && (
            <span className="text-xs text-[#666666] truncate">{result.naf_label}</span>
          )}
        </div>
      )}
    </div>
  );
}
