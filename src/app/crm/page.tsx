import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CrmClient from "@/components/CrmClient";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Paginate prospects to bypass PostgREST max_rows (default 1000)
  const PAGE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProspects: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    allProspects.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  const { data: folders } = await supabase
    .from("prospect_folders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCallLogs: any[] = [];
  let logOffset = 0;
  while (true) {
    const { data } = await supabase
      .from("call_logs")
      .select("id, prospect_id, called_at, outcome, contact_name, note")
      .eq("user_id", user.id)
      .order("called_at", { ascending: false })
      .range(logOffset, logOffset + PAGE - 1);
    if (!data || data.length === 0) break;
    allCallLogs.push(...data);
    if (data.length < PAGE) break;
    logOffset += PAGE;
  }

  return (
    <CrmClient
      initialProspects={allProspects}
      initialFolders={folders ?? []}
      initialCallLogs={allCallLogs}
      userEmail={user.email ?? ""}
    />
  );
}
