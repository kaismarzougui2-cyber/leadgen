import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CrmClient from "@/components/CrmClient";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Use range(0, 9999) to bypass the default 1000-row PostgREST cap
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, 9999);

  const { data: folders } = await supabase
    .from("prospect_folders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: callLogs } = await supabase
    .from("call_logs")
    .select("id, prospect_id, called_at, outcome, contact_name, note")
    .eq("user_id", user.id)
    .order("called_at", { ascending: false })
    .range(0, 4999);

  return (
    <CrmClient
      initialProspects={prospects ?? []}
      initialFolders={folders ?? []}
      initialCallLogs={callLogs as { id: string; prospect_id: string; called_at: string; outcome: string | null; contact_name: string | null; note: string }[] ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
