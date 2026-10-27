import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DeliverableFormat, DeliverableStatus } from "./schemas";

export type Media = { path: string; url: string | null; kind: "image" | "video" | "file" };

export type Deliverable = {
  id: string;
  client_id: string;
  titulo: string | null;
  slot_label: string | null;
  formato: DeliverableFormat;
  status: DeliverableStatus;
  data_publicacao: string | null;
  legenda: string | null;
  ordem: number;
  midia: Media[];
  aprovacoes: {
    decisao: "aprovado" | "ajuste";
    comentario: string | null;
    autor_nome: string;
    created_at: string;
  }[];
};

function mediaKind(path: string): Media["kind"] {
  if (/\.(jpe?g|png|webp|gif)$/i.test(path)) return "image";
  if (/\.(mp4|mov)$/i.test(path)) return "video";
  return "file";
}

// URLs assinadas (1 h) para os caminhos do bucket privado.
export async function signMedia(paths: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (!paths.length) return map;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("midia").createSignedUrls(paths, 60 * 60);
  for (const item of data ?? []) if (item.path) map.set(item.path, item.signedUrl ?? null);
  return map;
}

export async function getClientDeliverables(workspaceId: string, clientId: string): Promise<Deliverable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliverables")
    .select(
      "id, client_id, titulo, slot_label, formato, status, data_publicacao, legenda, ordem, midia_urls, approvals (decisao, comentario, autor_nome, created_at)",
    )
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("ordem")
    .order("created_at");

  const rows = data ?? [];
  const urls = await signMedia(rows.flatMap((r) => r.midia_urls));
  return rows.map(({ midia_urls, approvals, ...r }) => ({
    ...r,
    aprovacoes: [...approvals].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    midia: midia_urls.map((path) => ({ path, url: urls.get(path) ?? null, kind: mediaKind(path) })),
  }));
}

export async function countPendingApprovals(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("deliverables")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("status", "em_aprovacao");
  return count ?? 0;
}
