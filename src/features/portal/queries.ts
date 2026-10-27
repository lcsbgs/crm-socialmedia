import "server-only";
import { deliverableLabel, formatLabels } from "@/features/deliverables/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortalItem = {
  id: string;
  titulo: string;
  formato: string;
  data_publicacao: string | null;
  legenda: string | null;
  midia: { url: string; kind: "image" | "video" | "file" }[];
};

export type PortalHistory = {
  id: string;
  titulo: string;
  decisao: "aprovado" | "ajuste";
  autor_nome: string;
  comentario: string | null;
  created_at: string;
};

const kind = (p: string): PortalItem["midia"][number]["kind"] =>
  /\.(jpe?g|png|webp|gif)$/i.test(p) ? "image" : /\.(mp4|mov)$/i.test(p) ? "video" : "file";

// Leitura pública do portal: valida o token e usa o service role com filtros
// explícitos por cliente e workspace. Nunca expõe dados fora desse cliente.
export async function getPortal(token: string) {
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, workspace_id, nome, status, workspace:workspaces!inner (nome, logo_path)")
    .eq("portal_token", token)
    .neq("status", "encerrado")
    .maybeSingle();
  if (!client) return null;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: rows }, { data: history }] = await Promise.all([
    admin
      .from("deliverables")
      .select("id, titulo, slot_label, formato, data_publicacao, legenda, midia_urls")
      .eq("workspace_id", client.workspace_id)
      .eq("client_id", client.id)
      .eq("status", "em_aprovacao")
      .order("data_publicacao", { nullsFirst: false })
      .order("ordem"),
    admin
      .from("approvals")
      .select(
        "id, decisao, autor_nome, comentario, created_at, deliverable:deliverables!inner (titulo, slot_label, client_id)",
      )
      .eq("workspace_id", client.workspace_id)
      .eq("deliverable.client_id", client.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const logo = client.workspace.logo_path;
  const paths = [...(rows ?? []).flatMap((r) => r.midia_urls), ...(logo ? [logo] : [])];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await admin.storage.from("midia").createSignedUrls(paths, 60 * 60);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const items: PortalItem[] = (rows ?? []).map(({ midia_urls, slot_label, ...r }) => ({
    ...r,
    titulo: deliverableLabel({ titulo: r.titulo, slot_label }),
    formato: formatLabels[r.formato],
    midia: midia_urls.filter((p) => signed.has(p)).map((p) => ({ url: signed.get(p)!, kind: kind(p) })),
  }));

  return {
    clientNome: client.nome,
    workspaceNome: client.workspace.nome,
    logoUrl: logo ? (signed.get(logo) ?? null) : null,
    items,
    history: (history ?? []).map((h) => ({
      id: h.id,
      titulo: deliverableLabel(h.deliverable),
      decisao: h.decisao,
      autor_nome: h.autor_nome,
      comentario: h.comentario,
      created_at: h.created_at,
    })) as PortalHistory[],
  };
}
