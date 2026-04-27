"use client";

import { useState, useEffect, useRef } from "react";
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
  FolderOpen,
  FolderPlus,
  Folder,
  Plus,
  Upload,
  BarChart2,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import CsvImportModal from "@/components/CsvImportModal";
import KanbanBoard from "@/components/KanbanBoard";

const STATUSES = [
  "À appeler",
  "A répondu",
  "N'a pas répondu",
  "Réfléchit",
  "Intéressé",
  "À rappeler",
  "Pas intéressé",
  "Client signé",
  "Ne pas rappeler",
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
  folder_id?: string | null;
  contact_name?: string | null;
}

interface CallLog {
  id: string;
  called_at: string;
  outcome: string | null;
  contact_name: string | null;
  note: string;
}

const STATUS_COLORS: Record<Status, string> = {
  "À appeler":       "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "A répondu":       "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "N'a pas répondu": "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  "Réfléchit":       "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Pas intéressé":   "bg-red-500/15 text-red-400 border-red-500/25",
  "Intéressé":       "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "À rappeler":      "bg-[#160002] text-[#E5000A] border-[#3a0002]",
  "Client signé":    "bg-emerald-500/25 text-emerald-300 border-emerald-500/40",
  "Ne pas rappeler": "bg-zinc-800/50 text-zinc-500 border-zinc-700/50",
};

/** Emoji + libellé court pour chaque statut */
const STATUS_ACTIONS: { status: Status; emoji: string; short: string }[] = [
  { status: "À appeler",       emoji: "📞", short: "Appeler"  },
  { status: "A répondu",       emoji: "✅", short: "Répondu"  },
  { status: "N'a pas répondu", emoji: "📵", short: "Absent"   },
  { status: "Réfléchit",       emoji: "💭", short: "Réfléchit"},
  { status: "À rappeler",      emoji: "🔔", short: "Rappeler" },
  { status: "Intéressé",       emoji: "⭐", short: "Intéressé"},
  { status: "Pas intéressé",   emoji: "❌", short: "Non"      },
  { status: "Client signé",    emoji: "🏆", short: "Signé"    },
  { status: "Ne pas rappeler", emoji: "🚫", short: "Stop"     },
];

const FOLDER_COLORS = [
  "#E5000A", "#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#06B6D4", "#F97316",
];

interface ProspectFolder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const DISPLAY_PAGE = 50; // rows rendered per page in list view

export default function CrmClient({
  initialProspects,
  initialFolders = [],
  userEmail,
}: {
  initialProspects: Prospect[];
  initialFolders?: ProspectFolder[];
  userEmail: string;
}) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [folders, setFolders] = useState<ProspectFolder[]>(initialFolders);
  const [callLogs, setCallLogs] = useState<Record<string, CallLog[]>>({});
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  // background loading
  const [loadingMore, setLoadingMore] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(initialProspects.length < 200);
  // list pagination
  const [displayLimit, setDisplayLimit] = useState(DISPLAY_PAGE);
  // bottom sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [filterStatus, setFilterStatus] = useState<Status | "Tous">("Tous");
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [filterCity, setFilterCity] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const supabase = createClient();
  const { toast } = useToast();

  // ── Load remaining prospects + call_logs in background after mount ──
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoadingMore(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoadingMore(false); return; }

      const PAGE = 1000;
      // start at 200 (already loaded by SSR)
      let offset = initialProspects.length >= 200 ? 200 : initialProspects.length;
      const extra: Prospect[] = [];
      while (!cancelled) {
        const { data } = await supabase
          .from("prospects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        extra.push(...(data as Prospect[]));
        if (!cancelled) setProspects(prev => [...prev, ...(data as Prospect[])]);
        if (data.length < PAGE) break;
        offset += PAGE;
      }

      // Load call_logs
      const logsMap: Record<string, CallLog[]> = {};
      let logOffset = 0;
      while (!cancelled) {
        const { data } = await supabase
          .from("call_logs")
          .select("id, prospect_id, called_at, outcome, contact_name, note")
          .eq("user_id", user.id)
          .order("called_at", { ascending: false })
          .range(logOffset, logOffset + PAGE - 1);
        if (!data || data.length === 0) break;
        for (const log of data as (CallLog & { prospect_id: string })[]) {
          const { prospect_id, ...rest } = log;
          if (!logsMap[prospect_id]) logsMap[prospect_id] = [];
          logsMap[prospect_id].push(rest);
        }
        if (data.length < PAGE) break;
        logOffset += PAGE;
      }
      if (!cancelled) {
        setCallLogs(logsMap);
        setFullyLoaded(true);
        setLoadingMore(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Infinite scroll: reveal more rows when sentinel enters viewport ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDisplayLimit(l => l + DISPLAY_PAGE); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("prospects")
      .update({ status, updated_at: now })
      .eq("id", id);
    if (error) {
      toast("Erreur lors de la mise à jour du statut", "error");
      return;
    }
    toast(`Statut mis à jour : ${status}`, "success");
    // Auto-log the interaction
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const { data: log } = await supabase
        .from("call_logs")
        .insert({ user_id: u.id, prospect_id: id, outcome: status, called_at: now })
        .select()
        .single();
      if (log) {
        setCallLogs((prev) => ({
          ...prev,
          [id]: [{ id: log.id, called_at: log.called_at, outcome: log.outcome, contact_name: log.contact_name, note: log.note }, ...(prev[id] ?? [])],
        }));
      }
    }
  }

  async function saveContactName(id: string, contact_name: string) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, contact_name } : p)));
    const { error } = await supabase
      .from("prospects")
      .update({ contact_name, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast("Erreur lors de l'enregistrement du contact", "error");
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

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data, error } = await supabase
      .from("prospect_folders")
      .insert({ user_id: u.id, name, color: newFolderColor })
      .select()
      .single();
    if (error) { toast("Erreur lors de la création du dossier", "error"); return; }
    setFolders((prev) => [...prev, data as ProspectFolder]);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowCreateFolder(false);
    toast(`Dossier "${name}" créé`, "success");
  }

  async function deleteFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setProspects((prev) => prev.map((p) => p.folder_id === id ? { ...p, folder_id: null } : p));
    if (filterFolder === id) setFilterFolder(null);
    const { error } = await supabase.from("prospect_folders").delete().eq("id", id);
    if (error) toast("Erreur lors de la suppression du dossier", "error");
    else toast(`Dossier "${folder?.name ?? ""}" supprimé`, "info");
  }

  async function moveToFolder(prospectId: string, folderId: string | null) {
    setProspects((prev) => prev.map((p) => p.id === prospectId ? { ...p, folder_id: folderId } : p));
    const { error } = await supabase
      .from("prospects")
      .update({ folder_id: folderId })
      .eq("id", prospectId);
    if (error) toast("Erreur lors du déplacement", "error");
  }

  // Reset display limit whenever filters change
  useEffect(() => { setDisplayLimit(DISPLAY_PAGE); }, [filterStatus, filterNoWebsite, filterCity, filterJob, filterFolder, search]);

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
    const matchFolder = !filterFolder || p.folder_id === filterFolder;
    return matchStatus && matchSearch && matchNoWebsite && matchCity && matchJob && matchFolder;
  });

  const countByStatus = (s: Status) => prospects.filter((p) => p.status === s).length;
  const countByFolder = (id: string) => prospects.filter((p) => p.folder_id === id).length;
  const hasActiveFilters = filterStatus !== "Tous" || filterNoWebsite || filterCity || filterJob || filterFolder || search;

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
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[#aaaaaa]">
                {prospects.length} prospect{prospects.length !== 1 ? "s" : ""} sauvegardé{prospects.length !== 1 ? "s" : ""}
              </p>
              {loadingMore && (
                <span className="flex items-center gap-1.5 text-xs text-[#555555]">
                  <span className="animate-spin border border-[#333333] border-t-[#666666] rounded-full w-3 h-3" />
                  chargement…
                </span>
              )}
              {fullyLoaded && !loadingMore && (
                <span className="text-xs text-emerald-600">✓ tout chargé</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-[#0d0d0d] border border-[#1a1a1a] rounded-[9px] p-1 gap-1">
              <button
                onClick={() => setViewMode("list")}
                title="Vue liste"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-xs font-medium transition-colors min-h-[32px] ${
                  viewMode === "list"
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#666666] hover:text-[#aaaaaa]"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Liste</span>
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Vue Kanban"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-xs font-medium transition-colors min-h-[32px] ${
                  viewMode === "kanban"
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#666666] hover:text-[#aaaaaa]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Kanban</span>
              </button>
            </div>
            <button
              onClick={() => setShowCsvImport(true)}
              className="flex items-center gap-2 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-[#2a2a2a] text-white font-medium px-4 py-2.5 rounded-[9px] transition-colors text-sm min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:block">Importer CSV</span>
            </button>
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
          {showCsvImport && (
            <CsvImportModal
              onClose={() => setShowCsvImport(false)}
              onImported={(count) => {
                toast(`${count} prospect${count !== 1 ? "s" : ""} importé${count !== 1 ? "s" : ""}`, "success");
                window.location.reload();
              }}
            />
          )}
        </div>

        {/* ── Dossiers ────────────────────────────────────── */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.04s" }}>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tous */}
            <button
              onClick={() => setFilterFolder(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border text-xs font-medium transition-all min-h-[36px] ${
                !filterFolder
                  ? "bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  : "bg-[#0d0d0d] border-[#1a1a1a] text-[#666666] hover:text-[#aaaaaa] hover:border-[#2a2a2a]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Tous ({prospects.length})
            </button>

            {/* Dossiers existants */}
            {folders.map((f) => (
              <div key={f.id} className="relative group flex items-center">
                <button
                  onClick={() => setFilterFolder(filterFolder === f.id ? null : f.id)}
                  className={`flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-[9px] border text-xs font-medium transition-all min-h-[36px] ${
                    filterFolder === f.id
                      ? "bg-[#1a1a1a] border-[#2a2a2a] text-white"
                      : "bg-[#0d0d0d] border-[#1a1a1a] text-[#666666] hover:text-[#aaaaaa] hover:border-[#2a2a2a]"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" style={{ color: f.color }} />
                  {f.name} ({countByFolder(f.id)})
                </button>
                <button
                  onClick={() => deleteFolder(f.id)}
                  title="Supprimer ce dossier"
                  className="absolute right-1.5 opacity-0 group-hover:opacity-100 text-[#444444] hover:text-red-400 transition-all p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Créer dossier */}
            <button
              onClick={() => setShowCreateFolder((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-dashed border-[#2a2a2a] text-[#555555] hover:text-[#aaaaaa] hover:border-[#3a3a3a] text-xs font-medium transition-all min-h-[36px]"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Nouveau dossier
            </button>
          </div>

          {/* Formulaire création dossier */}
          {showCreateFolder && (
            <div className="flex items-center gap-2 flex-wrap p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[10px]">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                placeholder="Nom du dossier..."
                autoFocus
                className="flex-1 min-w-[140px] bg-black border border-[#1a1a1a] rounded-[8px] text-white text-sm px-3 py-2 placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A]"
              />
              <div className="flex items-center gap-1">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newFolderColor === c ? "scale-125 ring-2 ring-white/30" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="flex items-center gap-1.5 bg-[#E5000A] hover:bg-[#CC0000] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-[8px] transition-colors min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Créer
              </button>
              <button
                onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }}
                className="text-[#666666] hover:text-white text-xs px-2 py-2 min-h-[36px]"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* ── Compteurs par statut ────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 animate-fade-in" style={{ animationDelay: "0.05s" }}>
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
                  setFilterFolder(null);
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

        {/* ── Prospects ───────────────────────────────────── */}
        {viewMode === "kanban" ? (
          prospects.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun prospect sauvegardé"
              description="Lancez une recherche pour trouver des leads qualifiés et les ajouter à votre CRM."
              action={{ label: "Faire une recherche", href: "/dashboard" }}
            />
          ) : (
            <KanbanBoard prospects={filtered} onStatusChange={updateStatus} />
          )
        ) : filtered.length === 0 ? (
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
                  setFilterFolder(null);
                  setSearch("");
                },
              }}
            />
          )
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, displayLimit).map((prospect, index) => (
              <div
                key={prospect.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index * 0.02, 0.2)}s` }}
              >
                <ProspectRow
                  prospect={prospect}
                  folders={folders}
                  callLogs={callLogs[prospect.id] ?? []}
                  logExpanded={expandedLog === prospect.id}
                  onToggleLog={() => setExpandedLog(expandedLog === prospect.id ? null : prospect.id)}
                  editingNote={editingNote}
                  noteValue={noteValues[prospect.id] ?? prospect.note}
                  onStatusChange={updateStatus}
                  onCallbackChange={saveCallbackAt}
                  onMoveFolder={moveToFolder}
                  onSaveContactName={saveContactName}
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
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {filtered.length > displayLimit && (
              <p className="text-center text-xs text-[#444444] py-2">
                {filtered.length - displayLimit} prospects supplémentaires — défile pour en voir plus
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── ProspectRow ────────────────────────────────────────────── */
function ProspectRow({
  prospect, folders, callLogs, logExpanded, onToggleLog,
  editingNote, noteValue, onStatusChange, onCallbackChange,
  onMoveFolder, onSaveContactName, onEditNote, onNoteChange,
  onSaveNote, onCancelNote, onDelete,
}: {
  prospect: Prospect;
  folders: ProspectFolder[];
  callLogs: CallLog[];
  logExpanded: boolean;
  onToggleLog: () => void;
  editingNote: string | null;
  noteValue: string;
  onStatusChange: (id: string, status: Status) => void;
  onCallbackChange: (id: string, value: string) => void;
  onMoveFolder: (id: string, folderId: string | null) => void;
  onSaveContactName: (id: string, name: string) => void;
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
          {/* Nom + tags ville/métier + dossier */}
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
            {prospect.folder_id && folders.find((f) => f.id === prospect.folder_id) && (() => {
              const f = folders.find((f) => f.id === prospect.folder_id)!;
              return (
                <span
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
                  style={{ color: f.color, borderColor: f.color + "40", backgroundColor: f.color + "15" }}
                >
                  <FolderOpen className="w-2.5 h-2.5" />
                  {f.name}
                </span>
              );
            })()}
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

          {/* Contact name */}
          <ContactNameField
            value={prospect.contact_name ?? ""}
            onSave={(v) => onSaveContactName(prospect.id, v)}
          />

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

          {/* Call history */}
          <div className="mt-1">
            <button
              onClick={onToggleLog}
              className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-[#aaaaaa] transition-colors min-h-[28px]"
            >
              <Phone className="w-3 h-3" />
              {callLogs.length > 0
                ? `${callLogs.length} interaction${callLogs.length !== 1 ? "s" : ""} — ${logExpanded ? "masquer" : "voir"}`
                : "Aucun appel enregistré"}
            </button>
            {logExpanded && callLogs.length > 0 && (
              <div className="mt-2 space-y-1 border-l-2 border-[#1a1a1a] pl-3">
                {callLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="text-xs text-[#666666]">
                    <span className="text-[#aaaaaa]">
                      {new Date(log.called_at).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {log.outcome && (
                      <span className="ml-2 text-[#888888]">→ {log.outcome}</span>
                    )}
                    {log.contact_name && (
                      <span className="ml-2 text-[#555555]">({log.contact_name})</span>
                    )}
                    {log.note && <p className="mt-0.5 text-[#555555] italic">{log.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
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

          {/* Dossier */}
          {folders.length > 0 && (
            <select
              value={prospect.folder_id ?? ""}
              onChange={(e) => onMoveFolder(prospect.id, e.target.value || null)}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-[8px] text-[#aaaaaa] text-xs px-2.5 py-2 focus:outline-none focus:border-[#E5000A] min-h-[36px] appearance-none"
            >
              <option value="">📁 Sans dossier</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>📁 {f.name}</option>
              ))}
            </select>
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

/* ─── ContactNameField ───────────────────────────────────────────────────── */
function ContactNameField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => { onSave(val); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
          placeholder="Nom du contact..."
          autoFocus
          className="flex-1 bg-black border border-[#1a1a1a] rounded-[7px] text-white text-xs px-2.5 py-1.5 placeholder-[#333333] focus:outline-none focus:border-[#E5000A] min-h-[30px]"
        />
      </div>
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-[#aaaaaa] transition-colors mt-1 min-h-[28px] text-left"
    >
      <Users className="w-3 h-3 shrink-0" />
      {value ? <span>{value}</span> : <span className="italic">Ajouter le contact...</span>}
    </button>
  );
}
