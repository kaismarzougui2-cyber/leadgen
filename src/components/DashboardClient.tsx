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
  PhoneCall,
  BarChart2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { LeadCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadCommunes, getNearbyCities, type NearbyCity } from "@/lib/communes";

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

  const [nearbyCities, setNearbyCities] = useState<NearbyCity[]>([]);

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

  /** Logique de recherche partagée — accepte des valeurs explicites pour éviter
   *  les problèmes de closure sur le state React (ex: clic sur une ville proche). */
  async function doSearch(jobVal: string, cityVal: string) {
    if (!jobVal.trim() || !cityVal.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setNearbyCities([]);
    setSaveStatus({ loading: false, savedCount: 0, error: null });
    setTruncated(false);
    setHiddenCount(0);

    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const [res, savedRes] = await Promise.all([
        fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: jobVal.trim(), city: cityVal.trim() }),
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

      const savedIds = new Set<string>();
      const savedPhones = new Set<string>();
      if (savedRes && "data" in savedRes && savedRes.data) {
        for (const p of savedRes.data) {
          if (p.google_place_id) savedIds.add(p.google_place_id);
          if (p.phone) savedPhones.add(p.phone);
        }
      }

      const allResults: SearchResult[] = data.results
        .map((r: SearchResult) => ({
          ...r,
          alreadySaved:
            (!r.id.startsWith("demo-") && savedIds.has(r.id)) ||
            !!(r.phone && savedPhones.has(r.phone)),
        }))
        .sort((a: SearchResult, b: SearchResult) => Number(a.alreadySaved) - Number(b.alreadySaved));

      setHiddenCount(allResults.filter((r) => r.alreadySaved).length);
      setResults(allResults);
      setIsDemo(!!data.demo);
      setTruncated(!!data.truncated);
      setSearched(true);
      setSearchesUsed((prev) => Math.min(prev + 1, searchesLimit));

      // Suggestions de villes proches — zéro appel API supplémentaire
      if (allResults.length > 0) {
        loadCommunes().then((communes) => {
          setNearbyCities(getNearbyCities(communes, cityVal.trim()));
        });
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await doSearch(job, city);
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
      query_job: job,
      query_city: city,
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
      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center shadow-[0_0_12px_rgba(229,0,10,0.3)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">LeadGen</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-white bg-[#1a1a1a]"
            >
              Recherche
            </Link>
            <Link
              href="/booster"
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-[#aaaaaa] hover:text-white hover:bg-[#111111] transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Mode Booster
            </Link>
            <Link
              href="/crm"
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-[#aaaaaa] hover:text-white hover:bg-[#111111] transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
            <Link
              href="/analytics"
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-[#aaaaaa] hover:text-white hover:bg-[#111111] transition-colors flex items-center gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Analytics
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[#666666] hidden sm:block truncate max-w-[160px]">{user.email}</span>
          <span className="text-sm text-[#aaaaaa] hidden sm:block">
            <span className={remaining <= 2 ? "text-amber-400 font-semibold" : "text-white font-semibold"}>
              {searchesUsed}/{searchesLimit}
            </span>{" "}
            recherches
          </span>
          <span className="inline-flex items-center gap-1 bg-[#160002] border border-[#3a0002] text-[#E5000A] text-xs font-semibold px-2.5 py-1 rounded-full">
            {PLAN_LABELS[plan] ?? plan}
          </span>
          {plan === "free" && (
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center gap-1 bg-[#E5000A] hover:bg-[#CC0000] text-white text-xs font-bold px-3 py-2 rounded-[9px] transition-colors min-h-[36px]"
            >
              <Zap className="w-3 h-3" />
              Upgrader
            </Link>
          )}
          <Link
            href="/account"
            className="flex items-center gap-1.5 text-sm text-[#aaaaaa] hover:text-white transition-colors p-1.5 rounded-[9px] hover:bg-[#111111] min-h-[44px] min-w-[44px] justify-center sm:min-w-0 sm:justify-start"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:block">Compte</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[#aaaaaa] hover:text-white transition-colors p-1.5 rounded-[9px] hover:bg-[#111111] min-h-[44px] min-w-[44px] justify-center sm:min-w-0 sm:justify-start"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ───────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-[#1a1a1a] flex">
        <Link
          href="/dashboard"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#E5000A] bg-[#160002]"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-semibold">Recherche</span>
        </Link>
        <Link
          href="/booster"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]"
        >
          <Zap className="w-5 h-5" />
          <span className="text-xs font-medium">Booster</span>
        </Link>
        <Link
          href="/crm"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Mon CRM</span>
        </Link>
        {plan === "free" && (
          <Link
            href="/pricing"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#E5000A] active:bg-[#111111]"
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-semibold">Upgrader</span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Déco.</span>
        </button>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 space-y-10">

        {/* ── HERO SEARCH ──────────────────────────────────── */}
        <section className="space-y-6 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Trouvez vos prochains clients
            </h1>
            <p className="text-[#aaaaaa] text-base sm:text-lg">
              Entrez un métier et une ville — obtenez des prospects avec numéros de téléphone.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Plombier, coiffeur, garage..."
                className="w-full pl-11 pr-4 py-3.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors text-sm"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris, Lyon, Bordeaux..."
                className="w-full pl-11 pr-4 py-3.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || limitReached}
              className="flex items-center justify-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3.5 rounded-[12px] transition-all whitespace-nowrap text-sm shadow-[0_4px_20px_rgba(229,0,10,0.3)] hover:shadow-[0_4px_24px_rgba(229,0,10,0.45)] min-h-[52px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Rechercher
                </>
              )}
            </button>
          </form>

          {/* Alerte quota */}
          {limitReached && (
            <div className="flex items-center justify-between gap-3 p-4 bg-amber-500/8 border border-amber-500/25 rounded-[12px] text-amber-400 text-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Quota mensuel atteint. Passez à un plan supérieur pour continuer.
              </div>
              <Link
                href="/pricing"
                className="shrink-0 bg-[#E5000A] hover:bg-[#CC0000] text-white text-xs font-bold px-4 py-2 rounded-[9px] transition-colors min-h-[36px] flex items-center"
              >
                Voir les plans
              </Link>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/8 border border-red-500/25 rounded-[12px] text-red-400 text-sm animate-fade-in">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </section>

        {/* ── ROI SIMULATOR ────────────────────────────────── */}
        <section className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
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
                  {label} <span className="text-white font-semibold">{format(value)}</span>
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full accent-[#E5000A] h-1.5"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#001a05] border border-[#22C55E]/30 rounded-[12px] flex items-center justify-between">
            <div>
              <p className="text-[#aaaaaa] text-sm">CA potentiel estimé</p>
              <p className="text-sm text-[#666666] mt-0.5">{roiLeads} leads × {roiConversion}% × {roiRevenue}€</p>
            </div>
            <p className="text-3xl font-bold text-[#22C55E]" suppressHydrationWarning>
              {roiTotal.toLocaleString("fr-FR")}€
            </p>
          </div>
        </section>

        {/* ── RÉSULTATS ────────────────────────────────────── */}
        {(searched || loading) && (
          <section className="space-y-4">
            {/* Skeleton loaders pendant la recherche */}
            {loading && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-7 w-36 rounded-[9px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <LeadCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            )}

            {!loading && (
              <>
                {/* Mode démo */}
                {isDemo && (
                  <div className="flex items-center gap-3 p-4 bg-[#160002] border border-[#3a0002] rounded-[12px] text-sm text-[#E5000A] animate-fade-in">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Mode Démo</strong> — Données fictives. Ajoutez{" "}
                      <code className="bg-[#1a1a1a] px-1 rounded font-mono text-xs">GOOGLE_PLACES_API_KEY</code>{" "}
                      sur Vercel pour des résultats réels.
                    </span>
                  </div>
                )}

                {/* Résultats tronqués */}
                {truncated && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/8 border border-amber-500/25 rounded-[12px] text-sm text-amber-400 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Plan Free — 5 résultats maximum.</strong> Passez au plan Starter ou Pro pour voir jusqu&apos;à 60 résultats.
                      </span>
                    </div>
                    <Link
                      href="/pricing"
                      className="shrink-0 bg-[#E5000A] hover:bg-[#CC0000] text-white font-bold px-4 py-2 rounded-[9px] transition-colors whitespace-nowrap min-h-[36px] flex items-center text-xs"
                    >
                      Voir les plans
                    </Link>
                  </div>
                )}

                {/* En-tête résultats */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-white">
                      {results.length} résultat{results.length !== 1 ? "s" : ""}
                    </h2>
                    {hiddenCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#160002] border border-[#3a0002] text-[#E5000A] px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {hiddenCount} déjà dans votre CRM
                      </span>
                    )}
                    {allSaved && results.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2.5 py-1 rounded-full">
                        Tous déjà dans le CRM
                      </span>
                    )}
                  </div>
                  {results.length > 0 && (
                    <div className="flex items-center gap-3">
                      {saveStatus.savedCount > 0 && (
                        <Link
                          href="/crm"
                          className="text-sm text-[#22C55E] hover:underline flex items-center gap-1.5 font-medium"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Voir dans le CRM
                        </Link>
                      )}
                      <button
                        onClick={handleSaveAll}
                        disabled={saveStatus.loading || saveStatus.savedCount > 0 || allSaved}
                        className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-[9px] transition-colors text-sm min-h-[44px]"
                      >
                        {saveStatus.loading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : saveStatus.savedCount > 0
                          ? <CheckCircle className="w-4 h-4" />
                          : <BookmarkPlus className="w-4 h-4" />}
                        {saveStatus.savedCount > 0
                          ? `${saveStatus.savedCount} sauvegardés !`
                          : saveStatus.loading
                          ? "Sauvegarde..."
                          : "Tout sauvegarder"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Erreur sauvegarde */}
                {saveStatus.error && (
                  <div className="p-3 bg-red-500/8 border border-red-500/25 rounded-[9px] text-red-400 text-sm">
                    {saveStatus.error}
                  </div>
                )}

                {/* Empty state */}
                {results.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="Aucun résultat trouvé"
                    description="Essayez avec un autre métier, une ville différente ou vérifiez l'orthographe."
                  />
                ) : (
                  <>
                    {/* Grille de cards avec stagger */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.map((result, index) => (
                        <LeadCard
                          key={result.id}
                          result={result}
                          index={index}
                        />
                      ))}
                    </div>

                    {/* ── Villes proches (Haversine sur communes.json) ── */}
                    {nearbyCities.length > 0 && (
                      <div className="p-5 rounded-[12px] border border-[#1a1a1a] bg-[#0a0a0a] space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2 text-[#aaaaaa] text-sm font-semibold">
                          <MapPin className="w-4 h-4 text-[#E5000A]" />
                          Explorer les villes proches
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {nearbyCities.map((c) => (
                            <button
                              key={c.nom}
                              onClick={() => {
                                setCity(c.nom);
                                doSearch(job, c.nom);
                              }}
                              className="inline-flex items-center gap-1.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-full transition-all min-h-[36px]"
                            >
                              <MapPin className="w-3 h-3 text-[#555555]" />
                              {c.nom}
                              <span className="text-[#444444] text-xs">{Math.round(c.distance)} km</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions si tout est déjà dans le CRM */}
                    {allSaved && getSuggestions().length > 0 && (
                      <div className="p-5 rounded-[12px] border border-amber-500/20 bg-amber-500/5 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                          <Lightbulb className="w-4 h-4" />
                          Tous ces prospects sont déjà dans votre CRM — essayez ces variantes :
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getSuggestions().map((s) => (
                            <button
                              key={s.label}
                              onClick={() => { setJob(s.job); setCity(s.city); doSearch(s.job, s.city); }}
                              className="inline-flex items-center gap-1.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] text-white text-sm px-3 py-2 rounded-[9px] transition-colors min-h-[40px]"
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
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

/* ─── LeadCard ───────────────────────────────────────────────── */
function LeadCard({ result, index }: { result: SearchResult; index: number }) {
  const staggerClass = index < 12 ? `stagger-${index + 1}` : "";

  return (
    <div
      className={`
        animate-fade-in ${staggerClass}
        bg-[#0d0d0d] border rounded-[12px] p-5 flex flex-col gap-2.5
        transition-all duration-200
        ${result.alreadySaved
          ? "border-[#1a1a1a] opacity-60"
          : "border-[#1a1a1a] hover:border-[#2a2a2a] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
        }
      `}
    >
      {/* Nom + badge CRM */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white text-sm line-clamp-2 leading-snug">{result.name}</h3>
        {result.alreadySaved && (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold bg-[#160002] border border-[#3a0002] text-[#E5000A] px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> CRM
          </span>
        )}
      </div>

      {/* Téléphone */}
      <div className="flex items-center gap-2 text-sm text-[#aaaaaa]">
        <Phone className="w-3.5 h-3.5 text-[#E5000A] shrink-0" />
        <a href={`tel:${result.phone}`} className="hover:text-[#E5000A] transition-colors font-medium">
          {result.phone}
        </a>
      </div>

      {/* Adresse */}
      {result.address && (
        <div className="flex items-start gap-2 text-sm text-[#aaaaaa]">
          <MapPin className="w-3.5 h-3.5 text-[#666666] shrink-0 mt-0.5" />
          <span className="line-clamp-2">{result.address}</span>
        </div>
      )}

      {/* Note Google */}
      {result.rating !== null && (
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-amber-400 font-semibold">{result.rating}</span>
          <span className="text-[#666666]">/ 5</span>
        </div>
      )}

      {/* Site web */}
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

      {/* SIREN */}
      {result.siren && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-[#111111] border border-[#1e1e1e] text-[#aaaaaa] text-xs px-2 py-0.5 rounded-full font-mono">
            SIREN {result.siren}
          </span>
          {result.naf_label && (
            <span className="text-xs text-[#666666] truncate">{result.naf_label}</span>
          )}
        </div>
      )}

      {/* ── Bouton Appeler (CTA principal) ── */}
      {!result.alreadySaved && (
        <a
          href={`tel:${result.phone}`}
          className="mt-1 flex items-center justify-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white text-sm font-bold px-4 py-2.5 rounded-[9px] transition-colors min-h-[44px] shadow-[0_2px_8px_rgba(229,0,10,0.25)]"
        >
          <PhoneCall className="w-4 h-4" />
          Appeler
        </a>
      )}
    </div>
  );
}
