"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Users, TrendingUp, Phone, Calendar, Search,
  Download, BarChart2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MobileNav from "@/components/ui/MobileNav";
import Sidebar from "@/components/ui/Sidebar";

interface Props {
  totalProspects: number;
  interestedCount: number;
  signedCount: number;
  callbackCount: number;
  conversionRate: number;
  searchesThisMonth: number;
  statusCounts: Record<string, number>;
  weeklyTrend: { week: string; count: number }[];
  hourCounts: { hour: number; calls: number }[];
  topJobs: { job: string; count: number }[];
  callsLast7Days: { day: string; calls: number }[];
  plan: string;
  searchesUsed: number;
  searchesLimit: number;
  userEmail: string;
}

const STATUS_ORDER = [
  "À appeler", "A répondu", "N'a pas répondu", "Réfléchit",
  "À rappeler", "Intéressé", "Pas intéressé", "Client signé", "Ne pas rappeler",
];

const STATUS_COLORS_MAP: Record<string, string> = {
  "À appeler":       "#3B82F6",
  "A répondu":       "#06B6D4",
  "N'a pas répondu": "#71717A",
  "Réfléchit":       "#F59E0B",
  "À rappeler":      "#E5000A",
  "Intéressé":       "#22C55E",
  "Pas intéressé":   "#EF4444",
  "Client signé":    "#10B981",
  "Ne pas rappeler": "#52525B",
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#0d0d0d",
  border: "1px solid #1a1a1a",
  borderRadius: 8,
  color: "#ffffff",
  fontSize: 12,
};

function KpiCard({
  label, value, sub, icon: Icon, color = "#E5000A",
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#555555] font-medium uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[#555555]">{sub}</p>}
    </div>
  );
}

export default function AnalyticsClient({
  totalProspects, interestedCount, signedCount, callbackCount,
  conversionRate, searchesThisMonth, statusCounts, weeklyTrend,
  hourCounts, topJobs, callsLast7Days, plan, searchesUsed, searchesLimit, userEmail,
}: Props) {

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function exportCSV() {
    const lines = [
      ["Métrique", "Valeur"],
      ["Total prospects", totalProspects],
      ["Taux de conversion", `${conversionRate}%`],
      ["Clients signés", signedCount],
      ["Rappels programmés", callbackCount],
      ["Recherches ce mois", searchesThisMonth],
      [],
      ["Statut", "Nombre"],
      ...STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => [s, statusCounts[s]]),
    ];
    const csv = lines.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadvibe-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusData = STATUS_ORDER
    .filter((s) => statusCounts[s])
    .map((s) => ({ name: s.replace("N'a pas répondu", "Absent"), count: statusCounts[s], fill: STATUS_COLORS_MAP[s] ?? "#666" }));

  return (
    <div className="min-h-screen bg-black flex flex-col pb-20 sm:pb-0 sm:pl-56">
      <Sidebar
        currentPage="analytics"
        onLogout={handleLogout}
        userEmail={userEmail}
        plan={plan}
        searchesUsed={searchesUsed}
        searchesLimit={searchesLimit}
      />
      <MobileNav currentPage="analytics" onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
            <p className="text-[#aaaaaa] mt-1">Vue d&apos;ensemble de votre activité de prospection</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] text-white font-medium px-4 py-2.5 rounded-[9px] transition-colors text-sm min-h-[44px]"
          >
            <Download className="w-4 h-4" />Exporter CSV
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <KpiCard label="Total prospects" value={totalProspects} sub={`dont ${interestedCount} intéressés`} icon={Users} color="#3B82F6" />
          <KpiCard label="Taux de conversion" value={`${conversionRate}%`} sub={`${signedCount} client${signedCount !== 1 ? "s" : ""} signé${signedCount !== 1 ? "s" : ""}`} icon={TrendingUp} color="#22C55E" />
          <KpiCard label="Rappels programmés" value={callbackCount} sub="prospects à rappeler" icon={Calendar} color="#E5000A" />
          <KpiCard label="Recherches ce mois" value={searchesThisMonth} sub={`${searchesUsed}/${searchesLimit} crédits utilisés`} icon={Search} color="#A855F7" />
        </div>

        {/* ── Trend + Calls ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>

          {/* Prospects par semaine */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-6">
            <h2 className="text-base font-semibold text-white mb-4">Prospects ajoutés — 8 dernières semaines</h2>
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E5000A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E5000A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="week" tick={{ fill: "#555555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555555", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: "#E5000A", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="count" name="Prospects" stroke="#E5000A" strokeWidth={2} fill="url(#colorCount)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[#444444] text-sm text-center py-12">Pas encore de données</p>
            )}
          </div>

          {/* Appels par jour (7j) */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-6">
            <h2 className="text-base font-semibold text-white mb-4">Appels — 7 derniers jours</h2>
            {callsLast7Days.some((d) => d.calls > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={callsLast7Days} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="day" tick={{ fill: "#555555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555555", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "#1a1a1a" }} />
                  <Bar dataKey="calls" name="Appels" fill="#E5000A" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] gap-2">
                <Phone className="w-8 h-8 text-[#2a2a2a]" />
                <p className="text-[#444444] text-sm">Aucun appel enregistré</p>
                <p className="text-[#333333] text-xs">Les appels apparaissent quand vous changez un statut de prospect</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Status breakdown + Heatmap ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>

          {/* Répartition par statut */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-6">
            <h2 className="text-base font-semibold text-white mb-4">Répartition par statut</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={statusData} margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                  <XAxis type="number" tick={{ fill: "#555555", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#aaaaaa", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "#111111" }} />
                  <Bar dataKey="count" name="Prospects" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {statusData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[#444444] text-sm text-center py-12">Pas encore de prospects</p>
            )}
          </div>

          {/* Heatmap heure d'appel */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-6">
            <h2 className="text-base font-semibold text-white mb-1">Heatmap — heure des appels</h2>
            <p className="text-xs text-[#555555] mb-4">Heures auxquelles vous appelez le plus</p>
            {hourCounts.some((h) => h.calls > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourCounts.filter((h) => h.hour >= 7 && h.hour <= 20)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fill: "#555555", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555555", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(h) => `${h}h00`} cursor={{ fill: "#1a1a1a" }} />
                  <Bar dataKey="calls" name="Appels" fill="#E5000A" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] gap-2">
                <BarChart2 className="w-8 h-8 text-[#2a2a2a]" />
                <p className="text-[#444444] text-sm">Aucune donnée d&apos;appel</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Top métiers ── */}
        {topJobs.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[14px] p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-base font-semibold text-white mb-4">Top métiers prospectés</h2>
            <div className="space-y-3">
              {topJobs.map(({ job, count }, i) => {
                const pct = Math.round((count / (topJobs[0]?.count ?? 1)) * 100);
                return (
                  <div key={job} className="flex items-center gap-4">
                    <span className="text-[#555555] text-xs w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white capitalize">{job}</span>
                        <span className="text-xs text-[#666666]">{count} recherche{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#E5000A] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
