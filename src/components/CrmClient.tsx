"use client";

import { useState } from "react";
import {
  Zap,
  Users,
  Search,
  LogOut,
  Phone,
  PhoneCall,
  MapPin,
  Star,
  FileText,
  Globe,
  Download,
  Settings,
  CheckCircle,
  Calendar,
  X,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUSES = [
  "À appeler",
  "A répondu",
  "Réfléchit",
  "Pas intéressé",
  "Intéressé",
  "À rappeler",
] as const;

type Status = (typeof STATUSES)[number];

interface Prospect {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  rating: number | null;
  website: string | null;
  google_place_id: string | null;
  status: Status;
  note: string;
  created_at: string;
  siren?: string | null;
  naf_label?: string | null;
  query_city?: string | null;
  query_job?: string | null;
  callback_at?: string | null;
}

const STATUS_COLORS: Record<Status, string> = {
  "À appeler":      "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "A répondu":      "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "Réfléchit":      "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Pas intéressé":  "bg-red-500/15  text-red-400  border-red-500/25",
  "Intéressé":      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "À rappeler":     "bg-[#160002] text-[#E5000A] border-[#3a0002]",
};

/** Emoji + libellé court pour chaque statut */
const STATUS_ACTIONS: { status: Status; emoji: string; short: string }[] = [
  { status: "À appeler",     emoji: "📞", short: "Appeler"  },
  { status: "A répondu",     emoji: "✅", short: "Répondu"  },
  { status: "Réfléchit",     emoji: "💭", short: "Réfléchit"},
  { status: "À rappeler",    emoji: "🔔", short: "Rappeler" },
  { status: "Intéressé",     emoji: "⭐", short: "Intéressé"},
  { status: "Pas intéressé", emoji: "❌", short: "Non"      },
];

export default function CrmClient({
  initialProspects,
  userEmail,
}: {
  initialProspects: Prospect[];
  userEmail: string;
}) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [filterStatus, setFilterStatus] = useState<Status | "Tous">("Tous");
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [filterCity, setFilterCity] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  const supabase = createClient();
  const { toast } = useToast();

  function exportCSV() {
    const headers = ["Nom", "Téléphone", "Adresse", "Note Google", "Site web", "Statut", "SIREN", "Activité", "Commentaire", "Date d'ajout", "Rappel le"];
    const rows = filtered.map((p) => [
      p.name,
      p.phone,
      p.address ?? "",
      p.rating ?? "",
      p.website ?? "",
      p.status,
      p.siren ?? "",
      p.naf_label ?? "",
      p.note,
      new Date(p.created_at).toLocaleDateString("fr-FR"),
      p.callback_at ? new Date(p.callback_at).toLocaleString("fr-FR") : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadvibe-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Export CSV de ${filtered.length} prospect${filtered.length !== 1 ? "s" : ""} téléchargé`, "success");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function updateStatus(id: string, status: Status) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    const { error } = await supabase
      .from("prospects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Erreur lors de la mise à jour du statut", "error");
    } else {
      toast(`Statut mis à jour : ${status}`, "success");
    }
  }

  async function saveCallbackAt(id: string, value: string) {
    const callback_at = value ? new Date(value).toISOString() : null;
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, callback_at } : p)));
    const { error } = await supabase
      .from("prospects")
      .update({ callback_at, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Erreur lors de la sauvegarde du rappel", "error");
    } else {
      toast(callback_at ? `Rappel programmé : ${new Date(callback_at).toLocaleString("fr-FR")}` : "Rappel supprimé", "success");
    }
  }

  async function saveNote(id: string) {
    const note = noteValues[id] ?? "";
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
    setEditingNote(null);
    const { error } = await supabase
      .from("prospects")
      .update({ note, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Erreur lors de l'enregistrement de la note", "error");
    } else {
      toast("Note enregistrée", "success");
    }
  }

  async function deleteProspect(id: string) {
    const prospect = prospects.find((p) => p.id === id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("prospects").delete().eq("id", id);
    if (error) {
      toast("Erreur lors de la suppression", "error");
      if (prospect) setProspects((prev) => [prospect, ...prev]);
    } else {
      toast(`${prospect?.name ?? "Prospect"} supprimé`, "info");
    }
  }

  const uniqueCities = Array.from(new Set(prospects.map((p) => p.query_city).filter(Boolean))) as string[];
  const uniqueJobs  = Array.from(new Set(prospects.map((p) => p.query_job).filter(Boolean))) as string[];

  const filtered = prospects.filter((p) => {
    const matchStatus = filterStatus === "Tous" || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.address ?? "").toLowerCase().includes(q) ||
      (p.query_city ?? "").toLowerCase().includes(q) ||
      (p.query_job ?? "").toLowerCase().includes(q);
    const matchNoWebsite = !filterNoWebsite || !p.website;
    const matchCity = !filterCity || p.query_city === filterCity;
    const matchJob  = !filterJob  || p.query_job  === filterJob;
    return matchStatus && matchSearch && matchNoWebsite && matchCity && matchJob;
  });

  const countByStatus = (s: Status) => prospects.filter((p) => p.status === s).length;
  const hasActiveFilters = filterStatus !== "Tous" || filterNoWebsite || filterCity || filterJob || search;

  return (
    <div className="min-h-screen bg-black flex flex-col pb-20 sm:pb-0">

      {/* ── Navbar ─────────────────────────────────────────── */}
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
              href="/crm"
              className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-white bg-[#1a1a1a] flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#666666] hidden sm:block truncate max-w-[160px]">{userEmail}</span>
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

      {/* ── Mobile bottom tab bar ──────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-[#1a1a1a] flex">
        <Link
          href="/dashboard"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Recherche</span>
        </Link>
        <Link
          href="/crm"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#E5000A] bg-[#160002]"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-semibold">Mon CRM</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Déco.</span>
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Mon CRM</h1>
            <p className="text-[#aaaaaa] mt-1">
              {prospects.length} prospect{prospects.length !== 1 ? "s" : ""} sauvegardé{prospects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {prospects.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-[#2a2a2a] text-white font-medium px-4 py-2.5 rounded-[9px] transition-colors text-sm min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:block">Exporter CSV</span>
              </button>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold px-4 py-2.5 rounded-[9px] transition-colors text-sm min-h-[44px] shadow-[0_2px_8px_rgba(229,0,10,0.25)]"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:block">Nouvelle recherche</span>
            </Link>
          </div>
        </div>

        {/* ── Compteurs par statut ────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "Tous" : s)}
              className={`p-3 rounded-[12px] border text-left transition-all min-h-[72px] ${
                filterStatus === s
                  ? STATUS_COLORS[s]
                  : "bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#111111]"
              }`}
            >
              <p className="text-2xl font-bold text-white">{countByStatus(s)}</p>
              <p className="text-xs text-[#aaaaaa] mt-0.5 leading-tight">{s}</p>
            </button>
          ))}
        </div>

        {/* ── Filtres ─────────────────────────────────────── */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone, ville, métier..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#666666] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] text-sm min-h-[44px]"
            />
          </div>

          {/* Filtres ville + métier en pills */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Filtre villes */}
            {uniqueCities.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-[#555555] shrink-0">
                  <MapPin className="w-3 h-3" /> Villes :
                </span>
                {uniqueCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setFilterCity(filterCity === city ? "" : city)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      filterCity === city
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/35"
                        : "bg-[#0d0d0d] text-[#aaaaaa] border-[#1a1a1a] hover:border-[#2a2a2a] hover:text-white"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}

            {/* Filtre métiers */}
            {uniqueJobs.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-[#555555] shrink-0">
                  <Briefcase className="w-3 h-3" /> Métiers :
                </span>
                {uniqueJobs.map((job) => (
                  <button
                    key={job}
                    onClick={() => setFilterJob(filterJob === job ? "" : job)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      filterJob === job
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/35"
                        : "bg-[#0d0d0d] text-[#aaaaaa] border-[#1a1a1a] hover:border-[#2a2a2a] hover:text-white"
                    }`}
                  >
                    {job}
                  </button>
                ))}
              </div>
            )}

            {/* Filtre sans site web */}
            <button
              onClick={() => setFilterNoWebsite((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                filterNoWebsite
                  ? "bg-[#160002] border-[#3a0002] text-[#E5000A]"
                  : "bg-[#0d0d0d] border-[#1a1a1a] text-[#aaaaaa] hover:text-white hover:border-[#2a2a2a]"
              }`}
            >
              <Globe className="w-3 h-3" />
              Sans site web
            </button>

            {/* Reset filtres */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStatus("Tous");
                  setFilterNoWebsite(false);
                  setFilterCity("");
                  setFilterJob("");
                  setSearch("");
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-full border border-[#1a1a1a] text-xs text-[#666666] hover:text-white hover:border-[#2a2a2a] transition-colors"
              >
                <X className="w-3 h-3" />
                Effacer tout
              </button>
            )}
          </div>

          {/* Résultat du filtre */}
          {hasActiveFilters && (
            <p className="text-xs text-[#555555]">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} sur {prospects.length}
            </p>
          )}
        </div>

        {/* ── Liste prospects ─────────────────────────────── */}
        {filtered.length === 0 ? (
          prospects.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun prospect sauvegardé"
              description="Lancez une recherche pour trouver des leads qualifiés et les ajouter à votre CRM."
              action={{ label: "Faire une recherche", href: "/dashboard" }}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Aucun résultat"
              description="Aucun prospect ne correspond à vos filtres. Modifiez ou réinitialisez les filtres."
              action={{
                label: "Réinitialiser les filtres",
                onClick: () => {
                  setFilterStatus("Tous");
                  setFilterNoWebsite(false);
                  setFilterCity("");
                  setFilterJob("");
                  setSearch("");
                },
              }}
            />
          )
        ) : (
          <div className="space-y-3">
            {filtered.map((prospect, index) => (
              <div
                key={prospect.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
              >
                <ProspectRow
                  prospect={prospect}
                  editingNote={editingNote}
                  noteValue={noteValues[prospect.id] ?? prospect.note}
                  onStatusChange={updateStatus}
                  onCallbackChange={saveCallbackAt}
                  onEditNote={(id) => {
                    setEditingNote(id);
                    setNoteValues((prev) => ({ ...prev, [id]: prospect.note }));
                  }}
                  onNoteChange={(id, val) => setNoteValues((prev) => ({ ...prev, [id]: val }))}
                  onSaveNote={saveNote}
                  onCancelNote={() => setEditingNote(null)}
                  onDelete={deleteProspect}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── ProspectRow ────────────────────────────────────────────── */
function ProspectRow({
  prospect,
  editingNote,
  noteValue,
  onStatusChange,
  onCallbackChange,
  onEditNote,
  onNoteChange,
  onSaveNote,
  onCancelNote,
  onDelete,
}: {
  prospect: Prospect;
  editingNote: string | null;
  noteValue: string;
  onStatusChange: (id: string, status: Status) => void;
  onCallbackChange: (id: string, value: string) => void;
  onEditNote: (id: string) => void;
  onNoteChange: (id: string, val: string) => void;
  onSaveNote: (id: string) => void;
  onCancelNote: () => void;
  onDelete: (id: string) => void;
}) {
  const isEditingThis = editingNote === prospect.id;

  // Format datetime-local value from stored ISO string
  const callbackLocalValue = prospect.callback_at
    ? new Date(new Date(prospect.callback_at).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-4 sm:p-5 hover:border-[#2a2a2a] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

        {/* ── Infos prospect ─── */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* Nom + tags ville/métier */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white leading-tight">{prospect.name}</h3>
            {prospect.query_city && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                📍 {prospect.query_city}
              </span>
            )}
            {prospect.query_job && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                💼 {prospect.query_job}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#aaaaaa]">
            {/* Téléphone */}
            <a
              href={`tel:${prospect.phone}`}
              className="flex items-center gap-1.5 hover:text-[#E5000A] transition-colors font-medium"
            >
              <Phone className="w-3.5 h-3.5 text-[#E5000A]" />
              {prospect.phone}
            </a>

            {/* Adresse */}
            {prospect.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#666666]" />
                {prospect.address}
              </span>
            )}

            {/* Note Google */}
            {prospect.rating !== null && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-amber-400 font-semibold">{prospect.rating}</span>
              </span>
            )}

            {/* Site web */}
            {prospect.website && (
              <a
                href={prospect.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#22C55E] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
                {prospect.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}

            {/* SIREN */}
            {prospect.siren && (
              <span className="flex items-center gap-1.5 font-mono text-xs text-[#aaaaaa] bg-[#111111] border border-[#1e1e1e] px-2 py-0.5 rounded-full">
                {prospect.siren}
                {prospect.naf_label && ` · ${prospect.naf_label}`}
              </span>
            )}
          </div>

          {/* Note */}
          {isEditingThis ? (
            <div className="space-y-2 mt-2">
              <textarea
                value={noteValue}
                onChange={(e) => onNoteChange(prospect.id, e.target.value)}
                placeholder="Ajouter une note..."
                rows={3}
                className="w-full bg-black border border-[#1a1a1a] rounded-[9px] text-white text-sm px-3 py-2.5 placeholder-[#333333] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSaveNote(prospect.id)}
                  className="flex items-center gap-1.5 text-xs bg-[#E5000A] hover:bg-[#CC0000] text-white px-4 py-2 rounded-[9px] transition-colors font-semibold min-h-[36px]"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Enregistrer
                </button>
                <button
                  onClick={onCancelNote}
                  className="text-xs text-[#aaaaaa] hover:text-white px-4 py-2 rounded-[9px] transition-colors border border-[#1a1a1a] hover:border-[#2a2a2a] min-h-[36px]"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onEditNote(prospect.id)}
              className="flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#aaaaaa] transition-colors mt-1 min-h-[36px] text-left"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              {prospect.note ? (
                <span className="line-clamp-1">{prospect.note}</span>
              ) : (
                <span className="italic">Ajouter une note...</span>
              )}
            </button>
          )}
        </div>

        {/* ── Actions droite ─── */}
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[180px]">

          {/* Bouton Appeler — long, vert, horizontal */}
          <a
            href={`tel:${prospect.phone}`}
            className="flex items-center justify-center gap-2 w-full bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold px-4 py-3 rounded-[10px] transition-colors min-h-[48px] shadow-[0_2px_12px_rgba(22,163,74,0.3)] text-sm tracking-wide"
          >
            <PhoneCall className="w-4 h-4" />
            Appeler
          </a>

          {/* Boutons statut (emoji pills) */}
          <div className="grid grid-cols-3 gap-1">
            {STATUS_ACTIONS.map(({ status, emoji, short }) => (
              <button
                key={status}
                onClick={() => onStatusChange(prospect.id, status)}
                title={status}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-[8px] border text-[10px] font-medium transition-all min-h-[44px] ${
                  prospect.status === status
                    ? STATUS_COLORS[status]
                    : "bg-[#111111] border-[#1a1a1a] text-[#666666] hover:border-[#2a2a2a] hover:text-[#aaaaaa]"
                }`}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="leading-tight text-center">{short}</span>
              </button>
            ))}
          </div>

          {/* Mini calendrier si "À rappeler" */}
          {prospect.status === "À rappeler" && (
            <div className="mt-1 space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-[#E5000A] font-medium">
                <Calendar className="w-3 h-3" />
                Date de rappel
              </label>
              <input
                type="datetime-local"
                defaultValue={callbackLocalValue}
                onBlur={(e) => onCallbackChange(prospect.id, e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#3a0002] rounded-[8px] text-white text-xs px-3 py-2 focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A]/30 min-h-[40px] [color-scheme:dark]"
              />
              {prospect.callback_at && (
                <p className="text-[10px] text-[#aaaaaa] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#E5000A]" />
                  {new Date(prospect.callback_at).toLocaleString("fr-FR", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Supprimer */}
          <button
            onClick={() => onDelete(prospect.id)}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-[8px] border border-[#1a1a1a] text-[#444444] hover:text-red-400 hover:border-red-500/25 hover:bg-red-500/5 transition-colors text-xs min-h-[36px]"
            title="Supprimer ce prospect"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
