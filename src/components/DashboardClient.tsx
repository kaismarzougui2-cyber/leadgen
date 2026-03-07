"use client";

import { useState } from "react";
import {
  Search,
  Zap,
  Globe,
  Phone,
  Shield,
  AlertTriangle,
  Loader2,
  TrendingUp,
  LogOut,
  BookmarkPlus,
  CheckCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  id: string;
  name: string;
  phone: string;
  website: string | null;
  trustScore: number;
  trustStatus: "Vérifié" | "Risqué";
}

interface SaveStatus {
  loading: boolean;
  savedCount: number;
  error: string | null;
}

interface Props {
  user: { email: string };
  isPro: boolean;
  searchesUsed: number;
}

const DAILY_LIMIT = 5;

export default function DashboardClient({ user, isPro, searchesUsed: initialSearchesUsed }: Props) {
  const [job, setJob] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [searchesUsed, setSearchesUsed] = useState(initialSearchesUsed);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    loading: false,
    savedCount: 0,
    error: null,
  });

  // ROI simulator
  const [roiLeads, setRoiLeads] = useState(50);
  const [roiConversion, setRoiConversion] = useState(5);
  const [roiRevenue, setRoiRevenue] = useState(500);
  const roiTotal = Math.round((roiLeads * roiConversion) / 100 * roiRevenue);

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
        if (res.status === 429) {
          setError(data.error);
        } else {
          setError(data.error ?? "Erreur lors de la recherche.");
        }
        return;
      }

      setResults(data.results);
      setSearched(true);
      if (!isPro) {
        setSearchesUsed((prev) => Math.min(prev + 1, DAILY_LIMIT));
      }
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
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setSaveStatus({ loading: false, savedCount: 0, error: "Non authentifié." });
      return;
    }

    const leads = results.map((r) => ({
      user_id: authUser.id,
      name: r.name,
      phone: r.phone,
      website: r.website,
      trust_score: r.trustScore,
      contact_status: "À contacter",
    }));

    const { error: insertError, data: inserted } = await supabase
      .from("leads")
      .insert(leads)
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

  const remainingSearches = DAILY_LIMIT - searchesUsed;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">LeadVibe</span>
        </div>

        <div className="flex items-center gap-4">
          {!isPro && (
            <span className="text-sm text-slate-400">
              <span className="text-white font-medium">{remainingSearches}</span> recherche
              {remainingSearches !== 1 ? "s" : ""} restante
              {remainingSearches !== 1 ? "s" : ""} aujourd&apos;hui
            </span>
          )}
          {isPro && (
            <span className="inline-flex items-center gap-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] text-xs font-medium px-2.5 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              PRO
            </span>
          )}
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

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Métier (ex: plombier, coiffeur, restaurant...)"
                className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville (ex: Paris, Lyon, Marseille...)"
                className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || (!isPro && remainingSearches <= 0)}
              className="flex items-center justify-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? "Recherche..." : "Rechercher"}
            </button>
          </form>

          {!isPro && remainingSearches <= 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Limite quotidienne atteinte. Passez en Pro pour des recherches illimitées.
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
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Nombre de leads
                <span className="text-white font-medium ml-2">{roiLeads}</span>
              </label>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={roiLeads}
                onChange={(e) => setRoiLeads(Number(e.target.value))}
                className="w-full accent-[#8B5CF6]"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>10</span><span>500</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Taux de conversion
                <span className="text-white font-medium ml-2">{roiConversion}%</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={roiConversion}
                onChange={(e) => setRoiConversion(Number(e.target.value))}
                className="w-full accent-[#8B5CF6]"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1%</span><span>30%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Panier moyen
                <span className="text-white font-medium ml-2">{roiRevenue}€</span>
              </label>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={roiRevenue}
                onChange={(e) => setRoiRevenue(Number(e.target.value))}
                className="w-full accent-[#8B5CF6]"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>100€</span><span>5 000€</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">CA potentiel estimé</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {roiLeads} leads × {roiConversion}% conv. × {roiRevenue}€
              </p>
            </div>
            <p className="text-3xl font-bold text-[#10B981]">
              {roiTotal.toLocaleString("fr-FR")}€
            </p>
          </div>
        </section>

        {/* Results */}
        {searched && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Résultats ({results.length})
                </h2>
                {results.length > 0 && (
                  <p className="text-slate-400 text-sm mt-0.5">
                    Triés par Trust Score décroissant
                  </p>
                )}
              </div>

              {results.length > 0 && (
                <button
                  onClick={handleSaveAll}
                  disabled={saveStatus.loading || saveStatus.savedCount > 0}
                  className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  {saveStatus.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saveStatus.savedCount > 0 ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4" />
                  )}
                  {saveStatus.savedCount > 0
                    ? `${saveStatus.savedCount} sauvegardés !`
                    : saveStatus.loading
                    ? "Sauvegarde..."
                    : "Tout sauvegarder dans mon CRM"}
                </button>
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
                <p className="text-sm mt-1">
                  Essayez avec un autre métier ou une autre ville.
                </p>
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
  const isVerified = result.trustStatus === "Vérifié";

  return (
    <div className="bg-[#1E293B] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
      {/* Trust Badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isVerified
              ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }`}
        >
          {isVerified ? (
            <Shield className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
          {result.trustStatus}
        </span>

        {/* Score circle */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
            isVerified
              ? "border-[#10B981] text-[#10B981]"
              : "border-amber-400 text-amber-400"
          }`}
        >
          {result.trustScore}
        </div>
      </div>

      {/* Name */}
      <h3 className="font-semibold text-white text-sm mb-3 line-clamp-2">
        {result.name}
      </h3>

      {/* Phone */}
      <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
        <Phone className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
        <a
          href={`tel:${result.phone}`}
          className="hover:text-[#8B5CF6] transition-colors"
        >
          {result.phone}
        </a>
      </div>

      {/* Website */}
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
