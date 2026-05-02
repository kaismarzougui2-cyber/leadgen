"use client";

import { useState, useCallback } from "react";
import {
  Zap,
  MapPin,
  Search,
  Loader2,
  Phone,
  Globe,
  Star,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  LogOut,
  Users,
  Settings,
  BookmarkPlus,
  Bot,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadCommunes } from "@/lib/communes";

// ── Types ────────────────────────────────────────────────────────────────────

interface BoostResult {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  rating: number | null;
  website: string | null;
  city: string;
  alreadySaved?: boolean;
}

interface Props {
  user: { email: string };
  plan: string;
  searchesUsed: number;
  searchesLimit: number;
  isStaff?: boolean;
}

// ── Données géographiques ────────────────────────────────────────────────────

const DEPARTMENTS = [
  { code: "01", nom: "Ain" }, { code: "02", nom: "Aisne" }, { code: "03", nom: "Allier" },
  { code: "04", nom: "Alpes-de-Haute-Provence" }, { code: "05", nom: "Hautes-Alpes" },
  { code: "06", nom: "Alpes-Maritimes" }, { code: "07", nom: "Ardèche" },
  { code: "08", nom: "Ardennes" }, { code: "09", nom: "Ariège" }, { code: "10", nom: "Aube" },
  { code: "11", nom: "Aude" }, { code: "12", nom: "Aveyron" },
  { code: "13", nom: "Bouches-du-Rhône" }, { code: "14", nom: "Calvados" },
  { code: "15", nom: "Cantal" }, { code: "16", nom: "Charente" },
  { code: "17", nom: "Charente-Maritime" }, { code: "18", nom: "Cher" },
  { code: "19", nom: "Corrèze" }, { code: "2A", nom: "Corse-du-Sud" },
  { code: "2B", nom: "Haute-Corse" }, { code: "21", nom: "Côte-d'Or" },
  { code: "22", nom: "Côtes-d'Armor" }, { code: "23", nom: "Creuse" },
  { code: "24", nom: "Dordogne" }, { code: "25", nom: "Doubs" }, { code: "26", nom: "Drôme" },
  { code: "27", nom: "Eure" }, { code: "28", nom: "Eure-et-Loir" },
  { code: "29", nom: "Finistère" }, { code: "30", nom: "Gard" },
  { code: "31", nom: "Haute-Garonne" }, { code: "32", nom: "Gers" },
  { code: "33", nom: "Gironde" }, { code: "34", nom: "Hérault" },
  { code: "35", nom: "Ille-et-Vilaine" }, { code: "36", nom: "Indre" },
  { code: "37", nom: "Indre-et-Loire" }, { code: "38", nom: "Isère" },
  { code: "39", nom: "Jura" }, { code: "40", nom: "Landes" },
  { code: "41", nom: "Loir-et-Cher" }, { code: "42", nom: "Loire" },
  { code: "43", nom: "Haute-Loire" }, { code: "44", nom: "Loire-Atlantique" },
  { code: "45", nom: "Loiret" }, { code: "46", nom: "Lot" },
  { code: "47", nom: "Lot-et-Garonne" }, { code: "48", nom: "Lozère" },
  { code: "49", nom: "Maine-et-Loire" }, { code: "50", nom: "Manche" },
  { code: "51", nom: "Marne" }, { code: "52", nom: "Haute-Marne" },
  { code: "53", nom: "Mayenne" }, { code: "54", nom: "Meurthe-et-Moselle" },
  { code: "55", nom: "Meuse" }, { code: "56", nom: "Morbihan" },
  { code: "57", nom: "Moselle" }, { code: "58", nom: "Nièvre" },
  { code: "59", nom: "Nord" }, { code: "60", nom: "Oise" }, { code: "61", nom: "Orne" },
  { code: "62", nom: "Pas-de-Calais" }, { code: "63", nom: "Puy-de-Dôme" },
  { code: "64", nom: "Pyrénées-Atlantiques" }, { code: "65", nom: "Hautes-Pyrénées" },
  { code: "66", nom: "Pyrénées-Orientales" }, { code: "67", nom: "Bas-Rhin" },
  { code: "68", nom: "Haut-Rhin" }, { code: "69", nom: "Rhône" },
  { code: "70", nom: "Haute-Saône" }, { code: "71", nom: "Saône-et-Loire" },
  { code: "72", nom: "Sarthe" }, { code: "73", nom: "Savoie" },
  { code: "74", nom: "Haute-Savoie" }, { code: "75", nom: "Paris" },
  { code: "76", nom: "Seine-Maritime" }, { code: "77", nom: "Seine-et-Marne" },
  { code: "78", nom: "Yvelines" }, { code: "79", nom: "Deux-Sèvres" },
  { code: "80", nom: "Somme" }, { code: "81", nom: "Tarn" },
  { code: "82", nom: "Tarn-et-Garonne" }, { code: "83", nom: "Var" },
  { code: "84", nom: "Vaucluse" }, { code: "85", nom: "Vendée" },
  { code: "86", nom: "Vienne" }, { code: "87", nom: "Haute-Vienne" },
  { code: "88", nom: "Vosges" }, { code: "89", nom: "Yonne" },
  { code: "90", nom: "Territoire de Belfort" }, { code: "91", nom: "Essonne" },
  { code: "92", nom: "Hauts-de-Seine" }, { code: "93", nom: "Seine-Saint-Denis" },
  { code: "94", nom: "Val-de-Marne" }, { code: "95", nom: "Val-d'Oise" },
  { code: "971", nom: "Guadeloupe" }, { code: "972", nom: "Martinique" },
  { code: "973", nom: "Guyane" }, { code: "974", nom: "La Réunion" },
  { code: "976", nom: "Mayotte" },
];

const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
  "Centre-Val de Loire", "Corse", "Grand Est", "Guadeloupe",
  "Guyane", "Hauts-de-France", "Île-de-France", "La Réunion",
  "Martinique", "Mayotte", "Normandie", "Nouvelle-Aquitaine",
  "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
];

const MULTIPLIERS = [
  { value: 3, label: "x3" },
  { value: 5, label: "x5" },
  { value: 10, label: "x10" },
  { value: 20, label: "x20" },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free", starter: "Starter", growth: "Growth", pro: "Pro",
};

// ── Composant ────────────────────────────────────────────────────────────────

export default function BoosterClient({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user: _user,
  plan,
  searchesUsed: initialUsed,
  searchesLimit,
  isStaff = false,
}: Props) {
  const isPaid = isStaff || plan !== "free";

  const [boostMode, setBoostMode] = useState<"manual" | "auto">("manual");
  const [trade, setTrade] = useState("");
  const [zoneType, setZoneType] = useState<"city" | "department" | "region">("city");
  const [cityZone, setCityZone] = useState("");
  const [deptZone, setDeptZone] = useState("");
  const [regionZone, setRegionZone] = useState("");
  const [multiplier, setMultiplier] = useState(5);
  const [franceCoverage, setFranceCoverage] = useState<{ covered: number; total: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BoostResult[]>([]);
  const [citiesSearched, setCitiesSearched] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [exhaustedMessage, setExhaustedMessage] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [searchesUsed, setSearchesUsed] = useState(initialUsed);

  const [saveLoading, setSaveLoading] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Autocomplete villes
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const remaining = isStaff ? Infinity : searchesLimit - searchesUsed;

  const zoneValue =
    zoneType === "city" ? cityZone : zoneType === "department" ? deptZone : regionZone;

  const isValid =
    trade.trim().length >= 2 &&
    (boostMode === "auto" || zoneValue.trim().length >= 2);

  // ── Autocomplete villes ──────────────────────────────────────────────────
  const handleCityZoneChange = useCallback(async (val: string) => {
    setCityZone(val);
    if (val.length < 2) { setCitySuggestions([]); return; }
    const communes = await loadCommunes();
    const normalized = val.toLowerCase();
    const matches = communes
      .filter((c) => c.nom.toLowerCase().startsWith(normalized))
      .slice(0, 6)
      .map((c) => c.nom);
    setCitySuggestions(matches);
  }, []);

  // ── Lancement du boost ───────────────────────────────────────────────────
  async function launchBoost(resetHistory = false) {
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setCitiesSearched([]);
    setDone(false);
    setExhausted(false);
    setExhaustedMessage(null);
    setSavedCount(0);
    setSaveError(null);

    try {
      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: trade.trim(),
          zone_type: boostMode === "auto" ? "france" : zoneType,
          zone_value: boostMode === "auto" ? "" : zoneValue.trim(),
          multiplier,
          reset_history: resetHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors du boost.");
        return;
      }

      // Déduplications vs CRM existant
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const savedIds = new Set<string>();
      const savedPhones = new Set<string>();

      if (authUser) {
        const { data: existing } = await supabase
          .from("prospects")
          .select("google_place_id, phone")
          .eq("user_id", authUser.id);
        for (const p of existing ?? []) {
          if (p.google_place_id) savedIds.add(p.google_place_id);
          if (p.phone) savedPhones.add(p.phone);
        }
      }

      const enriched: BoostResult[] = (data.results as BoostResult[]).map((r) => ({
        ...r,
        alreadySaved:
          (!r.id.startsWith("demo-") && savedIds.has(r.id)) ||
          !!(r.phone && savedPhones.has(r.phone)),
      }));

      setResults(enriched);
      setCitiesSearched(data.cities_searched ?? []);
      setCreditsUsed(data.credits_used ?? multiplier);
      setSearchesUsed((prev) => Math.min(prev + (data.credits_used ?? multiplier), searchesLimit));
      setExhausted(!!data.exhausted);
      setExhaustedMessage(data.message ?? null);
      if (boostMode === "auto" && data.total_pool) {
        const covered = (data.cities_already_covered ?? 0) + (data.credits_used ?? multiplier);
        setFranceCoverage({ covered, total: data.total_pool });
      }
      setDone(true);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  // ── Sauvegarde dans le CRM ───────────────────────────────────────────────
  async function handleSaveAll() {
    const newResults = results.filter((r) => !r.alreadySaved);
    if (!newResults.length) return;

    setSaveLoading(true);
    setSaveError(null);

    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setSaveLoading(false); setSaveError("Non authentifié."); return; }

    const prospects = newResults.map((r) => ({
      user_id: authUser.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      rating: r.rating,
      google_place_id: r.id.startsWith("demo-") ? null : r.id,
      website: r.website,
      status: "À appeler",
      query_job: trade,
      query_city: r.city,
    }));

    const { error: insertError, data: inserted } = await supabase
      .from("prospects")
      .insert(prospects)
      .select();

    setSaveLoading(false);
    if (insertError) {
      setSaveError(insertError.message);
    } else {
      setSavedCount(inserted?.length ?? 0);
      setResults((prev) => prev.map((r) => ({ ...r, alreadySaved: true })));
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-[#aaaaaa] hover:text-white hover:bg-[#111111] transition-colors"
            >
              Recherche
            </Link>
            <Link
              href="/booster"
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-white bg-[#1a1a1a] flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-[#E5000A]" />
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
          {isStaff ? (
            <span className="text-sm hidden sm:block">
              <span className="text-emerald-400 font-semibold">∞ Illimité</span>
            </span>
          ) : (
            <span className="text-sm text-[#aaaaaa] hidden sm:block">
              <span className={remaining <= 2 ? "text-amber-400 font-semibold" : "text-white font-semibold"}>
                {searchesUsed}/{searchesLimit}
              </span>{" "}
              crédits
            </span>
          )}
          <span className={`inline-flex items-center gap-1 border text-xs font-semibold px-2.5 py-1 rounded-full ${isStaff ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#160002] border-[#3a0002] text-[#E5000A]"}`}>
            {isStaff ? "Staff" : (PLAN_LABELS[plan] ?? plan)}
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

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-[#1a1a1a] flex">
        <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]">
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Recherche</span>
        </Link>
        <Link href="/booster" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#E5000A] bg-[#160002]">
          <Zap className="w-5 h-5" />
          <span className="text-xs font-semibold">Booster</span>
        </Link>
        <Link href="/crm" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]">
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Mon CRM</span>
        </Link>
        {plan === "free" && (
          <Link href="/pricing" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#E5000A] active:bg-[#111111]">
            <Zap className="w-5 h-5" />
            <span className="text-xs font-semibold">Upgrader</span>
          </Link>
        )}
        <button onClick={handleLogout} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]">
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Déco.</span>
        </button>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#160002] border border-[#3a0002] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#E5000A]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Mode Booster</h1>
              <p className="text-[#aaaaaa] text-sm">Multipliez vos leads en recherchant sur plusieurs villes en un clic.</p>
            </div>
          </div>
        </section>

        {/* ── PLAN FREE → UPGRADE ──────────────────────────────── */}
        {!isPaid && (
          <section className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-[14px] bg-[#160002] border border-[#3a0002] flex items-center justify-center mx-auto">
              <Zap className="w-7 h-7 text-[#E5000A]" />
            </div>
            <h2 className="text-xl font-bold text-white">Fonctionnalité réservée aux plans payants</h2>
            <p className="text-[#aaaaaa] text-sm max-w-md mx-auto">
              Le Mode Booster est disponible à partir du plan Starter. Passez au plan supérieur pour lancer des recherches multi-villes.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white font-bold px-6 py-3 rounded-[12px] transition-all shadow-[0_4px_20px_rgba(229,0,10,0.3)] hover:shadow-[0_4px_24px_rgba(229,0,10,0.45)]"
            >
              <Zap className="w-4 h-4" />
              Voir les plans
            </Link>
          </section>
        )}

        {/* ── FORMULAIRE BOOST ────────────────────────────────── */}
        {isPaid && (
          <section className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-6 space-y-6">

            {/* ── Sélecteur de mode ─── */}
            <div className="flex gap-1 bg-black border border-[#1a1a1a] rounded-[12px] p-1">
              <button
                type="button"
                onClick={() => { setBoostMode("manual"); setDone(false); setResults([]); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] text-sm font-semibold transition-all ${
                  boostMode === "manual"
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#666666] hover:text-[#aaaaaa]"
                }`}
              >
                <Zap className="w-4 h-4" />
                Mode Boost
              </button>
              <button
                type="button"
                onClick={() => { setBoostMode("auto"); setDone(false); setResults([]); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] text-sm font-semibold transition-all ${
                  boostMode === "auto"
                    ? "bg-[#160002] text-[#E5000A] border border-[#3a0002]"
                    : "text-[#666666] hover:text-[#aaaaaa]"
                }`}
              >
                <Bot className="w-4 h-4" />
                Mode Auto
              </button>
            </div>

            {/* Description du mode */}
            {boostMode === "auto" && (
              <div className="flex items-start gap-3 p-3.5 bg-[#160002]/50 border border-[#3a0002] rounded-[10px]">
                <Bot className="w-4 h-4 text-[#E5000A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">Prospection automatique — France entière</p>
                  <p className="text-xs text-[#aaaaaa] mt-0.5">
                    Entrez juste un métier. LeadGen choisit automatiquement les prochaines villes à prospecter
                    (top 1 000 par population) et enregistre les villes déjà couvertes pour éviter les doublons.
                  </p>
                </div>
              </div>
            )}

            {/* Métier */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">Métier à prospecter</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type="text"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  placeholder="Plombier, coiffeur, garage auto..."
                  className="w-full pl-11 pr-4 py-3.5 bg-black border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors text-sm"
                />
              </div>
            </div>

            {/* Sélection du boost */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">Multiplicateur de boost</label>
              <div className="grid grid-cols-4 gap-2">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMultiplier(m.value)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-[12px] border transition-all text-sm font-bold ${
                      multiplier === m.value
                        ? "bg-[#160002] border-[#E5000A] text-[#E5000A] shadow-[0_0_12px_rgba(229,0,10,0.15)]"
                        : "bg-black border-[#1a1a1a] text-[#aaaaaa] hover:border-[#333333] hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{m.label}</span>
                    <span className="text-xs font-normal opacity-70">{m.value} crédit{m.value > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#555555]">
                {remaining >= multiplier ? (
                  <span className="text-[#22C55E]">
                    Vous avez {remaining} crédit{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""}. Ce boost en utilise {multiplier}.
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Crédit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""} : {remaining}. Ce boost en demande {multiplier}.{" "}
                    <Link href="/pricing" className="underline">Rechargez.</Link>
                  </span>
                )}
              </p>
            </div>

            {/* Couverture France (Mode Auto) */}
            {boostMode === "auto" && franceCoverage && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#aaaaaa] font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-[#E5000A]" />
                    Couverture France — {trade || "ce métier"}
                  </span>
                  <span className="text-white font-semibold">
                    {franceCoverage.covered} / {franceCoverage.total} villes
                  </span>
                </div>
                <div className="w-full h-2 bg-[#111111] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E5000A] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((franceCoverage.covered / franceCoverage.total) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#555555]">
                  {franceCoverage.total - franceCoverage.covered} ville{franceCoverage.total - franceCoverage.covered !== 1 ? "s" : ""} restante{franceCoverage.total - franceCoverage.covered !== 1 ? "s" : ""} à prospecter
                </p>
              </div>
            )}

            {/* Zone géographique (Mode Manuel uniquement) */}
            {boostMode === "manual" && <div className="space-y-3">
              <label className="text-sm font-semibold text-white">Zone géographique</label>

              {/* Tabs zone */}
              <div className="flex gap-1 bg-black border border-[#1a1a1a] rounded-[10px] p-1">
                {(["city", "department", "region"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setZoneType(type)}
                    className={`flex-1 text-xs font-semibold py-2 px-3 rounded-[8px] transition-all ${
                      zoneType === type
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#666666] hover:text-[#aaaaaa]"
                    }`}
                  >
                    {type === "city" ? "Ville centrale" : type === "department" ? "Département" : "Région"}
                  </button>
                ))}
              </div>

              {/* Input selon le type */}
              {zoneType === "city" && (
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                  <input
                    type="text"
                    value={cityZone}
                    onChange={(e) => handleCityZoneChange(e.target.value)}
                    placeholder="Lyon, Paris, Bordeaux..."
                    className="w-full pl-11 pr-4 py-3.5 bg-black border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors text-sm"
                  />
                  {citySuggestions.length > 0 && cityZone.length >= 2 && (
                    <ul className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[10px] z-10 overflow-hidden shadow-xl">
                      {citySuggestions.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => { setCityZone(s); setCitySuggestions([]); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#aaaaaa] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1.5 text-xs text-[#555555]">Recherche dans un rayon de 50 km autour de cette ville</p>
                </div>
              )}

              {zoneType === "department" && (
                <select
                  value={deptZone}
                  onChange={(e) => setDeptZone(e.target.value)}
                  className="w-full px-4 py-3.5 bg-black border border-[#1a1a1a] rounded-[12px] text-sm text-white focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors appearance-none"
                >
                  <option value="">— Choisir un département —</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.nom}
                    </option>
                  ))}
                </select>
              )}

              {zoneType === "region" && (
                <select
                  value={regionZone}
                  onChange={(e) => setRegionZone(e.target.value)}
                  className="w-full px-4 py-3.5 bg-black border border-[#1a1a1a] rounded-[12px] text-sm text-white focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors appearance-none"
                >
                  <option value="">— Choisir une région —</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>}

            {/* Bouton lancement */}
            <button
              type="button"
              onClick={() => launchBoost(false)}
              disabled={loading || !isValid || remaining < 1}
              className="w-full flex items-center justify-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-[12px] transition-all text-sm shadow-[0_4px_20px_rgba(229,0,10,0.3)] hover:shadow-[0_4px_24px_rgba(229,0,10,0.45)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recherche sur {multiplier} ville{multiplier > 1 ? "s" : ""}...
                </>
              ) : boostMode === "auto" ? (
                <>
                  <Bot className="w-4 h-4" />
                  Scanner {multiplier} prochaines villes ({multiplier} crédit{multiplier > 1 ? "s" : ""})
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Lancer le Boost — {multiplier} villes ({multiplier} crédit{multiplier > 1 ? "s" : ""})
                </>
              )}
            </button>
          </section>
        )}

        {/* ── ERREUR ───────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/8 border border-red-500/25 rounded-[12px] text-red-400 text-sm">
            <X className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── RÉSULTATS ────────────────────────────────────────── */}
        {done && (
          <section className="space-y-4">

            {/* Récap du boost */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px]">
              <div className="space-y-1">
                <p className="text-white font-semibold text-sm">
                  Boost terminé — {results.length} lead{results.length !== 1 ? "s" : ""} trouvé{results.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {citiesSearched.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-[#1a1a1a] text-[#aaaaaa] text-xs px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-[#555555]">{creditsUsed} crédit{creditsUsed > 1 ? "s" : ""} utilisé{creditsUsed > 1 ? "s" : ""}</span>
            </div>

            {/* Message épuisement du pool */}
            {exhausted && exhaustedMessage && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/8 border border-amber-500/25 rounded-[12px] text-sm text-amber-400">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{exhaustedMessage} Relancez le cycle pour tout recouvrir depuis le début.</span>
                </div>
                <button
                  type="button"
                  onClick={() => launchBoost(true)}
                  disabled={loading}
                  className="shrink-0 flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold px-4 py-2 rounded-[9px] transition-colors min-h-[36px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Relancer le cycle
                </button>
              </div>
            )}

            {/* Sauvegarde CRM */}
            {results.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold text-white">
                  {results.length} résultat{results.length !== 1 ? "s" : ""}
                </h2>
                <div className="flex items-center gap-3">
                  {savedCount > 0 && (
                    <Link href="/crm" className="text-sm text-[#22C55E] hover:underline flex items-center gap-1.5 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {savedCount} enregistré{savedCount > 1 ? "s" : ""} → CRM
                    </Link>
                  )}
                  {saveError && <span className="text-xs text-red-400">{saveError}</span>}
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={saveLoading || results.every((r) => r.alreadySaved)}
                    className="flex items-center gap-2 bg-[#0d0d0d] hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed border border-[#1a1a1a] text-white font-semibold px-4 py-2 rounded-[9px] transition-colors text-sm min-h-[36px]"
                  >
                    {saveLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BookmarkPlus className="w-4 h-4" />
                    )}
                    Tout sauvegarder dans le CRM
                  </button>
                </div>
              </div>
            )}

            {/* Grille des résultats */}
            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={`bg-[#0d0d0d] border rounded-[12px] p-5 space-y-3 transition-all ${
                      r.alreadySaved ? "border-[#22C55E]/30 opacity-60" : "border-[#1a1a1a] hover:border-[#2a2a2a]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{r.name}</h3>
                      {r.alreadySaved && (
                        <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[#E5000A] text-sm font-semibold">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>
                      </div>
                      {r.address && (
                        <div className="flex items-start gap-2 text-[#aaaaaa] text-xs">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{r.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        {r.rating && (
                          <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {r.rating.toFixed(1)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[#555555] text-xs">
                          <MapPin className="w-3 h-3" />
                          {r.city}
                        </span>
                        {r.website && (
                          <a
                            href={r.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#aaaaaa] hover:text-white text-xs transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Site web
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-[#555555] space-y-2">
                <Search className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-sm">Aucun résultat trouvé pour cette combinaison.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
