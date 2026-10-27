import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getClientScopeRequests(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scope_requests")
    .select("id, descricao, valor_sugerido, status, created_at, resolvido_em")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
