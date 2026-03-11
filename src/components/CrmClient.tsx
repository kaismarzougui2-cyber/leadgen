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
}

const STATUS_COLORS: Record<Status, string> = {
  "À appeler": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "A répondu": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Réfléchit": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Pas intéressé": "bg-red-500/20 text-red-400 border-red-500/30",
  "Intéressé": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "À rappeler": "bg-purple-500/20 text-purple-400 border-purple-500/30",
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
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  const supabase = createClient();

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

  const filtered = prospects.filter((p) => {
    const matchStatus = filterStatus === "Tous" || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.phone.includes(q) || (p.address ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const countByStatus = (s: Status) => prospects.filter((p) => p.status === s).length;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col pb-20 sm:pb-0">
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
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              Recherche
            </Link>
            <Link href="/crm" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/10 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 hidden sm:block">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A] border-t border-white/10 flex">
        <Link
          href="/dashboard"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-400 active:bg-white/5"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Recherche</span>
        </Link>
        <Link
          href="/crm"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-white bg-white/10"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Mon CRM</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-400 active:bg-white/5"
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
            <p className="text-slate-400 mt-1">{prospects.length} prospect{prospects.length !== 1 ? "s" : ""} sauvegardé{prospects.length !== 1 ? "s" : ""}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            Nouvelle recherche
          </Link>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "Tous" : s)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterStatus === s
                  ? STATUS_COLORS[s] + " border-opacity-100"
                  : "bg-[#1E293B] border-white/10 hover:border-white/20"
              }`}
            >
              <p className="text-2xl font-bold text-white">{countByStatus(s)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un prospect..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1E293B] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | "Tous")}
            className="bg-[#1E293B] border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="Tous">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
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
    <div className="bg-[#1E293B] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Info */}
        <div className="flex-1 space-y-2 min-w-0">
          <h3 className="font-semibold text-white">{prospect.name}</h3>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-400">
            <a href={`tel:${prospect.phone}`} className="flex items-center gap-1.5 hover:text-[#8B5CF6] transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#8B5CF6]" />
              {prospect.phone}
            </a>
            {prospect.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
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
                className="flex items-center gap-1.5 hover:text-[#10B981] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#10B981]" />
                {prospect.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            {prospect.siren && (
              <span className="flex items-center gap-1.5 font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
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
                className="w-full bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-[#8B5CF6] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSaveNote(prospect.id)}
                  className="text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  onClick={onCancelNote}
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onEditNote(prospect.id)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mt-1"
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
              className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-xs font-medium cursor-pointer focus:outline-none ${STATUS_COLORS[prospect.status]}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#1E293B] text-white">{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
          </div>
          <button
            onClick={() => onDelete(prospect.id)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
