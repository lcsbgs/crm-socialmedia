import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getPackages(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("package_templates")
    .select("id, nome, itens, clients (count)")
    .eq("workspace_id", workspaceId)
    .order("nome");
  return (data ?? []).map(({ clients, ...p }) => ({ ...p, clientes: clients[0]?.count ?? 0 }));
}

export async function getPackage(workspaceId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("package_templates")
    .select("id, nome, itens")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  return data;
}
