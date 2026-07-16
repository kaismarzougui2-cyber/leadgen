import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "@/components/AnalyticsClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics – LeadVibe" };

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1); // Monday
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch raw data (status + created_at only — minimal payload)
  const { data: prospects } = await supabase
    .from("prospects")
    .select("status, created_at, callback_at, query_job")
    .eq("user_id", user.id)
    .range(0, 9999);

  const { data: callLogs } = await supabase
    .from("call_logs")
    .select("called_at, outcome")
    .eq("user_id", user.id)
    .range(0, 9999);

  const { data: searches } = await supabase
    .from("searches")
    .select("query_job, created_at")
    .eq("user_id", user.id)
    .range(0, 4999);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, searches_used, searches_limit")
    .eq("user_id", user.id)
    .single();

  const rows = prospects ?? [];
  const logs = callLogs ?? [];
  const srch = searches ?? [];

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalProspects = rows.length;
  const interestedCount = rows.filter((p) =>
    p.status === "Intéressé" || p.status === "Client signé"
  ).length;
  const signedCount = rows.filter((p) => p.status === "Client signé").length;
  const callbackCount = rows.filter((p) => p.callback_at).length;
  const conversionRate =
    totalProspects > 0 ? Math.round((interestedCount / totalProspects) * 100) : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const searchesThisMonth = srch.filter((s) => s.created_at >= monthStart).length;

  // ── Status breakdown ─────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  for (const p of rows) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }

  // ── Weekly trend (last 8 weeks) ──────────────────────────────────────────────
  const weeks: Record<string, number> = {};
  const cutoff8w = new Date(now);
  cutoff8w.setUTCDate(cutoff8w.getUTCDate() - 56);
  for (const p of rows) {
    if (new Date(p.created_at) >= cutoff8w) {
      const wk = getWeekStart(new Date(p.created_at));
      weeks[wk] = (weeks[wk] ?? 0) + 1;
    }
  }
  const weeklyTrend = Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week: week.slice(5), count })); // "MM-DD"

  // ── Call heatmap (hour of day 0-23) ──────────────────────────────────────────
  const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, calls: 0 }));
  for (const log of logs) {
    const h = new Date(log.called_at).getHours();
    hourCounts[h].calls += 1;
  }

  // ── Top 5 jobs searched ──────────────────────────────────────────────────────
  const jobCounts: Record<string, number> = {};
  for (const s of srch) {
    if (s.query_job) jobCounts[s.query_job] = (jobCounts[s.query_job] ?? 0) + 1;
  }
  const topJobs = Object.entries(jobCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([job, count]) => ({ job, count }));

  // ── Calls per day (last 7 days) ───────────────────────────────────────────────
  const cutoff7d = new Date(now);
  cutoff7d.setUTCDate(cutoff7d.getUTCDate() - 6);
  const dayCallCounts: Record<string, number> = {};
  for (const log of logs) {
    const d = new Date(log.called_at);
    if (d >= cutoff7d) {
      const key = d.toISOString().slice(0, 10);
      dayCallCounts[key] = (dayCallCounts[key] ?? 0) + 1;
    }
  }
  const callsLast7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: key.slice(5), calls: dayCallCounts[key] ?? 0 };
  });

  return (
    <AnalyticsClient
      totalProspects={totalProspects}
      interestedCount={interestedCount}
      signedCount={signedCount}
      callbackCount={callbackCount}
      conversionRate={conversionRate}
      searchesThisMonth={searchesThisMonth}
      statusCounts={statusCounts}
      weeklyTrend={weeklyTrend}
      hourCounts={hourCounts}
      topJobs={topJobs}
      callsLast7Days={callsLast7Days}
      plan={sub?.plan ?? "free"}
      searchesUsed={sub?.searches_used ?? 0}
      searchesLimit={sub?.searches_limit ?? 5}
      userEmail={user.email ?? ""}
    />
  );
}
