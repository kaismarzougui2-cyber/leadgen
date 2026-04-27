import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CrmClient from "@/components/CrmClient";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch first 200 prospects instantly — client loads the rest in background
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, 199);

  const { data: folders } = await supabase
    .from("prospect_folders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <CrmClient
      initialProspects={prospects ?? []}
      initialFolders={folders ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
