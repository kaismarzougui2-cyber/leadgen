import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CrmClient from "@/components/CrmClient";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <CrmClient initialProspects={prospects ?? []} userEmail={user.email ?? ""} />;
}
