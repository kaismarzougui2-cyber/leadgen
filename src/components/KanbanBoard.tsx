"use client";

import { useState } from "react";
import { Phone, Globe, Star, Calendar, ChevronDown } from "lucide-react";

type Status =
  | "À appeler"
  | "A répondu"
  | "N'a pas répondu"
  | "Réfléchit"
  | "Intéressé"
  | "À rappeler"
  | "Pas intéressé"
  | "Client signé"
  | "Ne pas rappeler";

interface Prospect {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  rating: number | null;
  website: string | null;
  status: Status;
  note: string;
  callback_at?: string | null;
  query_city?: string | null;
  query_job?: string | null;
  contact_name?: string | null;
}

interface Props {
  prospects: Prospect[];
  onStatusChange: (id: string, status: Status) => void;
}

const KANBAN_COLUMNS: { status: Status; label: string; emoji: string; color: string }[] = [
  { status: "À appeler",   label: "À appeler",   emoji: "📞", color: "border-blue-500/30" },
  { status: "Intéressé",  label: "Intéressé",   emoji: "⭐", color: "border-emerald-500/30" },
  { status: "À rappeler", label: "À rappeler",   emoji: "🔔", color: "border-[#E5000A]/30" },
  { status: "Client signé", label: "Client signé", emoji: "🏆", color: "border-emerald-400/40" },
];

const KANBAN_STATUSES = new Set(KANBAN_COLUMNS.map((c) => c.status));

const COLUMN_COLORS: Record<string, string> = {
  "À appeler":    "bg-blue-500/8 border-blue-500/30",
  "Intéressé":   "bg-emerald-500/8 border-emerald-500/30",
  "À rappeler":  "bg-[#160002] border-[#E5000A]/30",
  "Client signé": "bg-emerald-500/12 border-emerald-400/40",
};

const COLUMN_HEADER_COLORS: Record<string, string> = {
  "À appeler":    "text-blue-400",
  "Intéressé":   "text-emerald-400",
  "À rappeler":  "text-[#E5000A]",
  "Client signé": "text-emerald-300",
};

const ALL_STATUSES: { status: Status; emoji: string }[] = [
  { status: "À appeler",       emoji: "📞" },
  { status: "A répondu",       emoji: "✅" },
  { status: "N'a pas répondu", emoji: "📵" },
  { status: "Réfléchit",       emoji: "💭" },
  { status: "À rappeler",      emoji: "🔔" },
  { status: "Intéressé",       emoji: "⭐" },
  { status: "Pas intéressé",   emoji: "❌" },
  { status: "Client signé",    emoji: "🏆" },
  { status: "Ne pas rappeler", emoji: "🚫" },
];

export default function KanbanBoard({ prospects, onStatusChange }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);

  const hidden = prospects.filter((p) => !KANBAN_STATUSES.has(p.status));

  return (
    <div className="space-y-4">
      {hidden.length > 0 && (
        <p className="text-xs text-[#555555]">
          {hidden.length} prospect{hidden.length !== 1 ? "s" : ""} masqué{hidden.length !== 1 ? "s" : ""} (statut hors pipeline) — visible{hidden.length !== 1 ? "s" : ""} en vue liste
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const colProspects = prospects.filter((p) => p.status === col.status);
          const isOver = dragOverCol === col.status;

          return (
            <div
              key={col.status}
              className={`rounded-[14px] border transition-all ${
                isOver
                  ? "ring-2 ring-[#E5000A]/50 bg-[#160002] border-[#E5000A]/40"
                  : COLUMN_COLORS[col.status]
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => {
                if (draggingId) onStatusChange(draggingId, col.status);
                setDraggingId(null);
                setDragOverCol(null);
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{col.emoji}</span>
                  <span className={`text-sm font-semibold ${COLUMN_HEADER_COLORS[col.status]}`}>
                    {col.label}
                  </span>
                </div>
                <span className="text-xs text-[#555555] bg-[#111111] px-2 py-0.5 rounded-full border border-[#1a1a1a]">
                  {colProspects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
                {colProspects.length === 0 && (
                  <div className="text-center text-xs text-[#333333] py-8">
                    Glissez un prospect ici
                  </div>
                )}
                {colProspects.map((p) => (
                  <KanbanCard
                    key={p.id}
                    prospect={p}
                    isDragging={draggingId === p.id}
                    onDragStart={() => setDraggingId(p.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  prospect,
  isDragging,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: {
  prospect: Prospect;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onStatusChange: (id: string, status: Status) => void;
}) {
  const [showMove, setShowMove] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-[#0d0d0d] border rounded-[10px] p-3 cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging
          ? "opacity-40 border-[#E5000A]/30 shadow-none"
          : "border-[#1a1a1a] hover:border-[#2a2a2a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
      }`}
    >
      {/* Name */}
      <p className="text-sm font-semibold text-white leading-tight truncate">{prospect.name}</p>

      {/* Contact name */}
      {prospect.contact_name && (
        <p className="text-xs text-[#666666] mt-0.5 truncate">{prospect.contact_name}</p>
      )}

      {/* Phone */}
      <a
        href={`tel:${prospect.phone}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 mt-2 text-xs text-[#aaaaaa] hover:text-[#E5000A] transition-colors"
      >
        <Phone className="w-3 h-3 text-[#E5000A] shrink-0" />
        <span className="truncate">{prospect.phone}</span>
      </a>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {prospect.rating !== null && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            {prospect.rating}
          </span>
        )}
        {prospect.website && (
          <a
            href={prospect.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 text-[10px] text-[#22C55E] hover:underline"
          >
            <Globe className="w-2.5 h-2.5" />
            Site
          </a>
        )}
        {prospect.query_city && (
          <span className="text-[10px] text-blue-400 truncate max-w-[80px]">
            📍 {prospect.query_city}
          </span>
        )}
      </div>

      {/* Callback */}
      {prospect.callback_at && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#E5000A]">
          <Calendar className="w-2.5 h-2.5" />
          {new Date(prospect.callback_at).toLocaleString("fr-FR", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </div>
      )}

      {/* Mobile move button */}
      <div className="mt-2 sm:hidden">
        <button
          onClick={() => setShowMove((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-[#555555] hover:text-[#aaaaaa] transition-colors"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showMove ? "rotate-180" : ""}`} />
          Déplacer vers...
        </button>
        {showMove && (
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {ALL_STATUSES.filter((s) => s.status !== prospect.status).map(({ status, emoji }) => (
              <button
                key={status}
                onClick={() => { onStatusChange(prospect.id, status); setShowMove(false); }}
                className="text-[10px] text-[#aaaaaa] hover:text-white bg-[#111111] hover:bg-[#1a1a1a] border border-[#1a1a1a] rounded-[6px] px-1.5 py-1.5 transition-colors text-center leading-tight"
              >
                {emoji} {status.replace("N'a pas répondu", "Absent").replace("Ne pas rappeler", "Stop").replace("Pas intéressé", "Non")}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
