import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistView } from "./components/hub/onboarding-checklist";
import { brandKitSchema, checklistItemSchema, defaultChecklist, strategySchema } from "./hub-schemas";

export async function getClientStrategy(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_strategies")
    .select("objetivo, publico, objetivos, pilares, formatos, decisoes, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .maybeSingle();
  const parsed = strategySchema.safeParse(data ?? {});
  return { strategy: parsed.success ? parsed.data : strategySchema.parse({}), updatedAt: data?.updated_at ?? null, exists: !!data };
}

export async function getBrandKit(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_kits")
    .select("cores, fontes, tom, evitar, observacoes, share_token, share_ativo")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .maybeSingle();
  const parsed = brandKitSchema.safeParse(data ?? {});
  return {
    kit: parsed.success ? parsed.data : brandKitSchema.parse({}),
    shareToken: data?.share_token ?? null,
    shared: data?.share_ativo ?? false,
    exists: !!data,
  };
}

export async function getClientFiles(workspaceId: string, clientId: string, categoria?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("client_files")
    .select("id, nome, mime, tamanho, created_at, path, categoria")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (categoria) q = q.eq("categoria", categoria);
  const { data } = await q;
  const rows = data ?? [];
  const signed = rows.length
    ? (await supabase.storage.from("midia").createSignedUrls(rows.map((r) => r.path), 60 * 60)).data ?? []
    : [];
  return rows.map((r, i) => ({ ...r, url: signed[i]?.signedUrl ?? null }));
}

export async function getClientAssigneeNames(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_assignees")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId);
  const ids = (data ?? []).map((a) => a.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("id, nome").in("id", ids);
  return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome }));
}

type ClientForChecklist = {
  id: string;
  onboarding_checklist: unknown;
  package_template_id: string | null;
  briefing_respondido_em: string | null;
  instagram_handle: string | null;
  drive_folder_url: string | null;
};

export async function getChecklist(workspaceId: string, client: ClientForChecklist): Promise<ChecklistView[]> {
  const supabase = await createClient();
  const [kit, files, meetings] = await Promise.all([
    supabase.from("brand_kits").select("cores, tom").eq("client_id", client.id).maybeSingle(),
    supabase.from("client_files").select("id", { count: "exact", head: true }).eq("client_id", client.id).eq("categoria", "marca"),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("client_id", client.id),
  ]);
  const stored = z.array(checklistItemSchema).catch([]).parse(client.onboarding_checklist);
  const kitDone =
    (Array.isArray(kit.data?.cores) && kit.data.cores.length > 0) || (kit.data?.tom?.length ?? 0) > 0 || (files.count ?? 0) > 0;
  const autoDone: Record<string, boolean> = {
    pacote: !!client.package_template_id,
    briefing: !!client.briefing_respondido_em,
    kit: kitDone,
    instagram: !!client.instagram_handle,
    drive: !!client.drive_folder_url,
    kickoff: (meetings.count ?? 0) > 0,
  };
  return defaultChecklist.map((d) => {
    const s = stored.find((x) => x.key === d.key);
    if (d.auto) return { key: d.key, label: d.label, done: autoDone[d.auto] || !!s?.done, auto: autoDone[d.auto] };
    return { key: d.key, label: d.label, done: s?.done ?? false, auto: false };
  });
}
