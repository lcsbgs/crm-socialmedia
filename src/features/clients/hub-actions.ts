"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checklistItemSchema, strategySchema, brandKitSchema } from "./hub-schemas";

type Result = { ok: true } | { error: string };

const ids = z.object({ workspaceId: z.uuid(), clientId: z.uuid() });

function done(): Result {
  revalidatePath("/w", "layout");
  return { ok: true };
}

export async function saveStrategy(input: z.input<typeof strategySchema> & { workspaceId: string; clientId: string }): Promise<Result> {
  const user = await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  const parsed = strategySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const total = parsed.data.pilares.reduce((s, p) => s + p.pct, 0);
  if (parsed.data.pilares.length && total !== 100) return { error: `Os pilares somam ${total}%. Ajuste para 100%.` };
  const supabase = await createClient();
  const { error } = await supabase.from("client_strategies").upsert({
    client_id: clientId,
    workspace_id: workspaceId,
    ...parsed.data,
    updated_by: user.id,
  });
  return error ? { error: "Não foi possível salvar a estratégia." } : done();
}

export async function saveBrandKit(input: z.input<typeof brandKitSchema> & { workspaceId: string; clientId: string }): Promise<Result> {
  await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_kits")
    .upsert({ client_id: clientId, workspace_id: workspaceId, ...parsed.data });
  return error ? { error: "Não foi possível salvar o kit." } : done();
}

export async function setBrandKitSharing(input: { workspaceId: string; clientId: string; ativo: boolean }): Promise<Result> {
  await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_kits")
    .upsert({ client_id: clientId, workspace_id: workspaceId, share_ativo: input.ativo });
  return error ? { error: "Não foi possível mudar o compartilhamento." } : done();
}

export async function registerClientFile(input: {
  workspaceId: string;
  clientId: string;
  path: string;
  nome: string;
  mime: string;
  tamanho: number;
  categoria: "geral" | "marca" | "briefing" | "contrato";
}): Promise<Result> {
  const user = await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  if (!input.path.startsWith(`${workspaceId}/clientes/${clientId}/`)) return { error: "Caminho inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("client_files").insert({
    workspace_id: workspaceId,
    client_id: clientId,
    path: input.path,
    nome: input.nome.slice(0, 200),
    mime: input.mime.slice(0, 100),
    tamanho: input.tamanho,
    categoria: input.categoria,
    uploaded_by: user.id,
  });
  return error ? { error: "Não foi possível registrar o arquivo." } : done();
}

export async function deleteClientFile(input: { workspaceId: string; id: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_files")
    .select("path")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.id)
    .maybeSingle();
  if (!data) return { error: "Arquivo não encontrado." };
  await supabase.storage.from("midia").remove([data.path]);
  await supabase.from("client_files").delete().eq("id", input.id);
  return done();
}

export async function saveChecklist(input: { workspaceId: string; clientId: string; items: unknown }): Promise<Result> {
  await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  const items = z.array(checklistItemSchema).max(30).safeParse(input.items);
  if (!items.success) return { error: "Checklist inválido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ onboarding_checklist: items.data })
    .eq("workspace_id", workspaceId)
    .eq("id", clientId);
  return error ? { error: "Não foi possível salvar." } : done();
}

export async function addTimelineNote(input: { workspaceId: string; clientId: string; titulo: string; corpo?: string }): Promise<Result> {
  const user = await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  const titulo = input.titulo.trim();
  if (!titulo) return { error: "Escreva o que aconteceu." };
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_events").insert({
    workspace_id: workspaceId,
    client_id: clientId,
    tipo: "nota",
    titulo: titulo.slice(0, 300),
    corpo: input.corpo?.trim() || null,
    autor_id: user.id,
  });
  return error ? { error: "Não foi possível registrar." } : done();
}

export async function regenerateBriefingLink(input: { clientId: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_briefing_token", { p_client_id: z.uuid().parse(input.clientId) });
  return error ? { error: "Não foi possível gerar outro link." } : done();
}

export async function updateClientChannels(input: {
  workspaceId: string;
  clientId: string;
  instagram: string;
  drive: string;
}): Promise<Result> {
  await requireUser();
  const { workspaceId, clientId } = ids.parse(input);
  const instagram = input.instagram.trim().replace(/^@/, "").slice(0, 60) || null;
  const drive = input.drive.trim().slice(0, 500) || null;
  if (drive && !/^https:\/\//.test(drive)) return { error: "O link da pasta precisa começar com https://" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ instagram_handle: instagram, drive_folder_url: drive })
    .eq("workspace_id", workspaceId)
    .eq("id", clientId);
  return error ? { error: "Não foi possível salvar." } : done();
}
