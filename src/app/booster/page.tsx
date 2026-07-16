import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateSubscription } from "@/lib/quota";
import { redirect } from "next/navigation";
import BoosterClient from "@/components/BoosterClient";

export const dynamic = "force-dynamic";

export default async function BoosterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const sub = await getOrCreateSubscription(createAdminClient(), user.id);

  return (
    <BoosterClient
      user={{ email: user.email ?? "" }}
      plan={sub?.plan ?? "free"}
      searchesUsed={sub?.searches_used ?? 0}
      searchesLimit={(sub?.searches_limit ?? 5) + (sub?.extra_credits ?? 0)}
      isStaff={sub?.is_staff ?? false}
    />
  );
}
