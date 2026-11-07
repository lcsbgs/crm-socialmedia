import "server-only";
import { deliverableLabel, formatLabels } from "@/features/deliverables/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortalItem = {
  id: string;
  titulo: string;
  formato: string;
  hora_publicacao: string | null;
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
    .select("id, workspace_id, nome, cor, status, contatos, instagram_handle, workspace:workspaces!inner (nome, logo_path)")
    .eq("portal_token", token)
    .neq("status", "encerrado")
    .maybeSingle();
  if (!client) return null;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: plan } = await admin
    .from("month_plans")
    .select("competencia, status, enviado_em")
    .eq("client_id", client.id)
    .eq("status", "enviado")
    .order("competencia")
    .limit(1)
    .maybeSingle();
  const planEnd = plan ? new Date(Date.UTC(+plan.competencia.slice(0, 4), +plan.competencia.slice(5, 7), 0)).toISOString().slice(0, 10) : null;
  const { data: planPosts } = plan
    ? await admin
        .from("deliverables")
        .select("id, titulo, slot_label, formato, data_publicacao, pilar")
        .eq("client_id", client.id)
        .gte("data_publicacao", plan.competencia)
        .lte("data_publicacao", planEnd!)
        .order("data_publicacao")
    : { data: [] };
  const [{ data: rows }, { data: history }] = await Promise.all([
    admin
      .from("deliverables")
      .select("id, titulo, slot_label, formato, data_publicacao, hora_publicacao, legenda, midia_urls")
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

  const { data: reports } = await admin
    .from("reports")
    .select("competencia, token")
    .eq("client_id", client.id)
    .eq("status", "publicado")
    .order("competencia", { ascending: false })
    .limit(6);
  const contato = Array.isArray(client.contatos) ? (client.contatos[0] as { nome?: string } | undefined) : undefined;
  return {
    clientNome: client.nome,
    clientCor: client.cor ?? 0,
    handle: client.instagram_handle ?? client.nome.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    contatoNome: contato?.nome?.split(" ")[0] ?? "",
    reports: (reports ?? []).map((r) => ({ competencia: r.competencia, token: r.token })),
    plan: plan
      ? {
          competencia: plan.competencia,
          posts: (planPosts ?? []).map((p) => ({
            id: p.id,
            titulo: deliverableLabel(p),
            formato: formatLabels[p.formato],
            data: p.data_publicacao as string,
            pilar: p.pilar,
          })),
        }
      : null,
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
