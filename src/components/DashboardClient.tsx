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

  // ROI simulator
  const [roiLeads, setRoiLeads] = useState(50);
  const [roiConversion, setRoiConversion] = useState(5);
  const [roiRevenue, setRoiRevenue] = useState(500);
  const roiTotal = Math.round((roiLeads * roiConversion) / 100 * roiRevenue);

  const remaining = searchesLimit - searchesUsed;
  const limitReached = false; // DISABLED FOR TESTING — restore: remaining <= 0

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!job.trim() || !city.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSaveStatus({ loading: false, savedCount: 0, error: null });

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: job.trim(), city: city.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la recherche.");
        return;
      }

      setResults(data.results);
      setIsDemo(!!data.demo);
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

    const prospects = results.map((r) => ({
      user_id: authUser.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      rating: r.rating,
      google_place_id: r.id.startsWith("demo-") ? null : r.id,
      website: r.website,
      status: "À appeler",
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
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LeadGen</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/10">
              Recherche
            </Link>
            <Link href="/crm" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            <span className={remaining <= 2 ? "text-amber-400 font-medium" : "text-white font-medium"}>
              {searchesUsed}/{searchesLimit}
            </span>{" "}
            recherches ce mois
          </span>
          <span className="inline-flex items-center gap-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] text-xs font-medium px-2.5 py-1 rounded-full">
            {PLAN_LABELS[plan] ?? plan}
          </span>
          <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Search Section */}
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Moteur de recherche</h1>
            <p className="text-slate-400 mt-1">
              Entrez un métier et une ville pour trouver des prospects qualifiés.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Métier (ex: plombier, coiffeur...)"
                className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville (ex: Paris, Lyon...)"
                className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || limitReached}
              className="flex items-center justify-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Recherche..." : "Rechercher"}
            </button>
          </form>

          {limitReached && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Quota mensuel atteint. Passez à un plan supérieur pour continuer.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </section>

        {/* ROI Simulator */}
        <section className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-semibold text-white">Simulateur de ROI</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "Nombre de leads", value: roiLeads, min: 10, max: 500, step: 10, set: setRoiLeads, format: (v: number) => String(v) },
              { label: "Taux de conversion", value: roiConversion, min: 1, max: 30, step: 1, set: setRoiConversion, format: (v: number) => `${v}%` },
              { label: "Panier moyen", value: roiRevenue, min: 100, max: 5000, step: 100, set: setRoiRevenue, format: (v: number) => `${v}€` },
            ].map(({ label, value, min, max, step, set, format }) => (
              <div key={label}>
                <label className="block text-sm text-slate-400 mb-2">
                  {label} <span className="text-white font-medium">{format(value)}</span>
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">CA potentiel estimé</p>
              <p className="text-sm text-slate-500 mt-0.5">{roiLeads} leads × {roiConversion}% conv. × {roiRevenue}€</p>
            </div>
            <p className="text-3xl font-bold text-[#10B981]" suppressHydrationWarning>{roiTotal.toLocaleString("fr-FR")}€</p>
          </div>
        </section>

        {/* Results */}
        {searched && (
          <section className="space-y-4">
            {isDemo && (
              <div className="flex items-center gap-3 p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-xl text-sm text-[#8B5CF6]">
                <Zap className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Mode Démo</strong> — Données fictives. Ajoutez{" "}
                  <code className="bg-white/10 px-1 rounded">GOOGLE_PLACES_API_KEY</code> sur Vercel pour des résultats réels.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Résultats ({results.length})</h2>
              </div>
              {results.length > 0 && (
                <div className="flex items-center gap-3">
                  {saveStatus.savedCount > 0 && (
                    <Link href="/crm" className="text-sm text-[#10B981] hover:underline flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Voir dans le CRM
                    </Link>
                  )}
                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus.loading || saveStatus.savedCount > 0}
                    className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    {saveStatus.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus.savedCount > 0 ? <CheckCircle className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                    {saveStatus.savedCount > 0 ? `${saveStatus.savedCount} sauvegardés !` : saveStatus.loading ? "Sauvegarde..." : "Tout sauvegarder dans mon CRM"}
                  </button>
                </div>
              )}
            </div>

            {saveStatus.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {saveStatus.error}
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">Aucun résultat trouvé</p>
                <p className="text-sm mt-1">Essayez avec un autre métier ou une autre ville.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result) => (
                  <LeadCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function LeadCard({ result }: { result: SearchResult }) {
  return (
    <div className="bg-[#1E293B] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors flex flex-col gap-2.5">
      <h3 className="font-semibold text-white text-sm line-clamp-2">{result.name}</h3>

      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Phone className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
        <a href={`tel:${result.phone}`} className="hover:text-[#8B5CF6] transition-colors">{result.phone}</a>
      </div>

      {result.address && (
        <div className="flex items-start gap-2 text-sm text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{result.address}</span>
        </div>
      )}

      {result.rating !== null && (
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-amber-400 font-medium">{result.rating}</span>
          <span className="text-slate-500">/ 5</span>
        </div>
      )}

      {result.website ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Globe className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
          <a
            href={result.website}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#10B981] transition-colors truncate"
          >
            {result.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>Pas de site web</span>
        </div>
      )}
    </div>
  );
}
