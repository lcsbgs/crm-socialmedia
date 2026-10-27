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

// Leitura pública do portal: valida o token e usa o service role com filtros
// explícitos por cliente e workspace. Nunca expõe dados fora desse cliente.
export async function getPortal(token: string) {
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, workspace_id, nome, status, workspace:workspaces!inner (nome)")
    .eq("portal_token", token)
    .neq("status", "encerrado")
    .maybeSingle();
  if (!client) return null;

  const { data: rows } = await admin
    .from("deliverables")
    .select("id, titulo, slot_label, formato, data_publicacao, legenda, midia_urls")
    .eq("workspace_id", client.workspace_id)
    .eq("client_id", client.id)
    .eq("status", "em_aprovacao")
    .order("data_publicacao", { nullsFirst: false })
    .order("ordem");

  const paths = (rows ?? []).flatMap((r) => r.midia_urls);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await admin.storage.from("midia").createSignedUrls(paths, 60 * 60);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const items: PortalItem[] = (rows ?? []).map(({ midia_urls, slot_label, ...r }) => ({
    ...r,
    titulo: deliverableLabel({ titulo: r.titulo, slot_label }),
    formato: formatLabels[r.formato],
    midia: midia_urls
      .filter((p) => signed.has(p))
      .map((p) => ({
        url: signed.get(p)!,
        kind: /\.(jpe?g|png|webp|gif)$/i.test(p) ? "image" : /\.(mp4|mov)$/i.test(p) ? "video" : "file",
      })),
  }));

  return { clientNome: client.nome, workspaceNome: client.workspace.nome, items };
}
