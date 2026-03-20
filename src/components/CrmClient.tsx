"use client";

import { useState } from "react";
import {
  Zap,
  Users,
  Search,
  LogOut,
  Phone,
  MapPin,
  Star,
  ChevronDown,
  FileText,
  Trash2,
  Globe,
  Download,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
}

const STATUS_COLORS: Record<Status, string> = {
  "À appeler": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "A répondu": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Réfléchit": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Pas intéressé": "bg-red-500/20 text-red-400 border-red-500/30",
  "Intéressé": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "À rappeler": "bg-[#160002] text-[#E5000A] border-[#3a0002]",
};

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

  function exportCSV() {
    const headers = ["Nom", "Téléphone", "Adresse", "Note Google", "Site web", "Statut", "SIREN", "Activité", "Commentaire", "Date d'ajout"];
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
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function updateStatus(id: string, status: Status) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("prospects").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function saveNote(id: string) {
    const note = noteValues[id] ?? "";
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
    setEditingNote(null);
    await supabase.from("prospects").update({ note, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function deleteProspect(id: string) {
    setProspects((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("prospects").delete().eq("id", id);
  }

  const uniqueCities = Array.from(new Set(prospects.map((p) => p.query_city).filter(Boolean))) as string[];
  const uniqueJobs = Array.from(new Set(prospects.map((p) => p.query_job).filter(Boolean))) as string[];

  const filtered = prospects.filter((p) => {
    const matchStatus = filterStatus === "Tous" || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.phone.includes(q) || (p.address ?? "").toLowerCase().includes(q);
    const matchNoWebsite = !filterNoWebsite || !p.website;
    const matchCity = !filterCity || p.query_city === filterCity;
    const matchJob = !filterJob || p.query_job === filterJob;
    return matchStatus && matchSearch && matchNoWebsite && matchCity && matchJob;
  });

  const countByStatus = (s: Status) => prospects.filter((p) => p.status === s).length;

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
            <Link href="/dashboard" className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-[#aaaaaa] hover:text-white hover:bg-[#111111] transition-colors">
              Recherche
            </Link>
            <Link href="/crm" className="px-3 py-1.5 rounded-[9px] text-sm font-medium text-white bg-[#1a1a1a] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#aaaaaa] hidden sm:block">{userEmail}</span>
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
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#aaaaaa] active:bg-[#111111]"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Recherche</span>
        </Link>
        <Link
          href="/crm"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#E5000A] bg-[#160002]"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Mon CRM</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[#aaaaaa] active:bg-[#111111]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Déco</span>
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Mon CRM</h1>
            <p className="text-[#aaaaaa] mt-1">{prospects.length} prospect{prospects.length !== 1 ? "s" : ""} sauvegardé{prospects.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            {prospects.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] text-white font-medium px-4 py-2 rounded-[9px] transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:block">Exporter CSV</span>
              </button>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white font-medium px-4 py-2 rounded-[9px] transition-colors text-sm"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:block">Nouvelle recherche</span>
            </Link>
          </div>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "Tous" : s)}
              className={`p-3 rounded-[12px] border text-left transition-all ${
                filterStatus === s
                  ? STATUS_COLORS[s] + " border-opacity-100"
                  : "bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]"
              }`}
            >
              <p className="text-2xl font-bold text-white">{countByStatus(s)}</p>
              <p className="text-xs text-[#aaaaaa] mt-0.5">{s}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un prospect..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white placeholder-[#666666] focus:outline-none focus:border-[#E5000A] text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | "Tous")}
            className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#E5000A]"
          >
            <option value="Tous">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {uniqueCities.length > 0 && (
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#E5000A]"
            >
              <option value="">Toutes les villes</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {uniqueJobs.length > 0 && (
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#E5000A]"
            >
              <option value="">Tous les métiers</option>
              {uniqueJobs.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setFilterNoWebsite((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] border text-sm font-medium transition-colors ${
              filterNoWebsite
                ? "bg-[#160002] border-[#3a0002] text-[#E5000A]"
                : "bg-[#0d0d0d] border-[#1a1a1a] text-[#aaaaaa] hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4" />
            Sans site web
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#666666]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Aucun prospect trouvé</p>
            <p className="text-sm mt-1">
              {prospects.length === 0
                ? "Faites une recherche et sauvegardez des prospects."
                : "Modifiez vos filtres."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((prospect) => (
              <ProspectRow
                key={prospect.id}
                prospect={prospect}
                editingNote={editingNote}
                noteValue={noteValues[prospect.id] ?? prospect.note}
                onStatusChange={updateStatus}
                onEditNote={(id) => {
                  setEditingNote(id);
                  setNoteValues((prev) => ({ ...prev, [id]: prospect.note }));
                }}
                onNoteChange={(id, val) => setNoteValues((prev) => ({ ...prev, [id]: val }))}
                onSaveNote={saveNote}
                onCancelNote={() => setEditingNote(null)}
                onDelete={deleteProspect}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProspectRow({
  prospect,
  editingNote,
  noteValue,
  onStatusChange,
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
  onEditNote: (id: string) => void;
  onNoteChange: (id: string, val: string) => void;
  onSaveNote: (id: string) => void;
  onCancelNote: () => void;
  onDelete: (id: string) => void;
}) {
  const isEditingThis = editingNote === prospect.id;

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-5 hover:border-[#2a2a2a] transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Info */}
        <div className="flex-1 space-y-2 min-w-0">
          <h3 className="font-semibold text-white">{prospect.name}</h3>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[#aaaaaa]">
            <a href={`tel:${prospect.phone}`} className="flex items-center gap-1.5 hover:text-[#E5000A] transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#E5000A]" />
              {prospect.phone}
            </a>
            {prospect.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#666666]" />
                {prospect.address}
              </span>
            )}
            {prospect.rating !== null && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-amber-400">{prospect.rating}</span>
              </span>
            )}
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
                className="w-full bg-black border border-[#1a1a1a] rounded-[9px] text-white text-sm px-3 py-2 placeholder-[#333333] focus:outline-none focus:border-[#E5000A] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSaveNote(prospect.id)}
                  className="text-xs bg-[#E5000A] hover:bg-[#CC0000] text-white px-3 py-1.5 rounded-[9px] transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  onClick={onCancelNote}
                  className="text-xs text-[#aaaaaa] hover:text-white px-3 py-1.5 rounded-[9px] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onEditNote(prospect.id)}
              className="flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#aaaaaa] transition-colors mt-1"
            >
              <FileText className="w-3.5 h-3.5" />
              {prospect.note ? (
                <span className="line-clamp-1">{prospect.note}</span>
              ) : (
                <span className="italic">Ajouter une note...</span>
              )}
            </button>
          )}
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={prospect.status}
              onChange={(e) => onStatusChange(prospect.id, e.target.value as Status)}
              className={`appearance-none pl-3 pr-8 py-1.5 rounded-[9px] border text-xs font-medium cursor-pointer focus:outline-none ${STATUS_COLORS[prospect.status]}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#0d0d0d] text-white">{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
          </div>
          <button
            onClick={() => onDelete(prospect.id)}
            className="p-1.5 rounded-[9px] text-[#333333] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
