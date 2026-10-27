import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DeliverableFormat, DeliverableStatus } from "./schemas";

export type Media = { path: string; url: string | null; kind: "image" | "video" | "file" };

export function mediaKind(path: string): Media["kind"] {
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

export type BoardDeliverable = {
  id: string;
  titulo: string | null;
  slot_label: string | null;
  formato: DeliverableFormat;
  status: DeliverableStatus;
  data_publicacao: string | null;
  ordem: number;
  client: { id: string; nome: string; cor: number };
  responsavel: { id: string; nome: string } | null;
  thumb: string | null;
  midiaCount: number;
};

export type BoardFilters = {
  clientId?: string;
  formato?: string;
  responsavelId?: string;
  from?: string;
  to?: string;
  includeOldPublished?: boolean;
};

// Entregas para quadro, semana e calendário, com filtros.
export async function getBoardDeliverables(
  workspaceId: string,
  filters: BoardFilters = {},
): Promise<BoardDeliverable[]> {
  const supabase = await createClient();
  let query = supabase
    .from("deliverables")
    .select(
      "id, titulo, slot_label, formato, status, data_publicacao, ordem, midia_urls, client:clients!inner (id, nome, cor), responsavel:profiles (id, nome)",
    )
    .eq("workspace_id", workspaceId)
    .order("ordem")
    .order("created_at")
    .limit(600);

  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.formato) query = query.eq("formato", filters.formato as DeliverableFormat);
  if (filters.responsavelId === "ninguem") query = query.is("responsavel_id", null);
  else if (filters.responsavelId) query = query.eq("responsavel_id", filters.responsavelId);
  if (filters.from) query = query.gte("data_publicacao", filters.from);
  if (filters.to) query = query.lte("data_publicacao", filters.to);

  const { data } = await query;
  const rows = data ?? [];

  // Primeira imagem de cada entrega como miniatura.
  const thumbs = rows.flatMap((r) => r.midia_urls.filter((p) => mediaKind(p) === "image").slice(0, 1));
  const signed = await signMedia(thumbs);

  return rows.map((r) => {
    const firstImage = r.midia_urls.find((p) => mediaKind(p) === "image");
    return {
      id: r.id,
      titulo: r.titulo,
      slot_label: r.slot_label,
      formato: r.formato,
      status: r.status,
      data_publicacao: r.data_publicacao,
      ordem: r.ordem,
      client: { id: r.client.id, nome: r.client.nome, cor: r.client.cor ?? 0 },
      responsavel: r.responsavel ? { id: r.responsavel.id, nome: r.responsavel.nome } : null,
      thumb: firstImage ? (signed.get(firstImage) ?? null) : null,
      midiaCount: r.midia_urls.length,
    };
  });
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

export async function getMemberOptions(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles!inner (nome)")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  return (data ?? []).map((m) => ({ id: m.user_id, nome: m.profile.nome || "Sem nome" }));
}
