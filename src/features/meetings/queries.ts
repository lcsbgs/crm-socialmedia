import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getClientMeetings(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("id, titulo, data, ata_confirmada_em")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("data", { ascending: false });
  return data ?? [];
}

export async function getMeeting(workspaceId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("*, client:clients!inner (id, nome), tasks (id, titulo, due_date, status)")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  return data;
}
