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

  let { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, searches_used, searches_limit, extra_credits, is_staff")
    .eq("user_id", user.id)
    .single();

  if (!sub) {
    await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan: "free",
      searches_limit: 5,
      searches_used: 0,
    });
    const { data: newSub } = await supabase
      .from("subscriptions")
      .select("plan, searches_used, searches_limit, extra_credits, is_staff")
      .eq("user_id", user.id)
      .single();
    sub = newSub;
  }

  return (
    <DashboardClient
      user={{ email: user.email ?? "" }}
      plan={sub?.plan ?? "free"}
      searchesUsed={sub?.searches_used ?? 0}
      searchesLimit={(sub?.searches_limit ?? 5) + (sub?.extra_credits ?? 0)}
      isStaff={sub?.is_staff ?? false}
    />
  );
}
