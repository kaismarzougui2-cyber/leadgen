import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountClient from "@/components/AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: sub }, { data: profile }, { count: prospectsCount }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, searches_used, searches_limit, extra_credits, current_period_end, stripe_subscription_id")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (
    <AccountClient
      user={{ email: user.email ?? "", id: user.id }}
      plan={sub?.plan ?? "free"}
      searchesUsed={sub?.searches_used ?? 0}
      searchesLimit={(sub?.searches_limit ?? 5) + (sub?.extra_credits ?? 0)}
      periodEnd={sub?.current_period_end ?? null}
      hasStripe={!!profile?.stripe_customer_id && !!sub?.stripe_subscription_id}
      prospectsCount={prospectsCount ?? 0}
    />
  );
}
