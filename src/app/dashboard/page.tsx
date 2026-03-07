import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, plan, daily_search_count, last_search_date")
    .eq("id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const searchesUsed =
    profile?.last_search_date === today
      ? (profile?.daily_search_count ?? 0)
      : 0;

  return (
    <DashboardClient
      user={{ email: user.email ?? "" }}
      isPro={profile?.is_pro ?? false}
      searchesUsed={searchesUsed}
    />
  );
}
