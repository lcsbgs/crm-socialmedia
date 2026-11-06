"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createDeliverableSchema,
  mediaPrefix,
  moveDeliverableSchema,
  updateDeliverableSchema,
} from "./schemas";

function revalidate() {
  revalidatePath("/w", "layout");
}

export async function createDeliverable(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = createDeliverableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, clientId, ...values } = parsed.data;
  const supabase = await createClient();
  const extra = formData.get("extra"); // "sim" | "nao" | null (ainda não perguntou)

  // Limite do pacote: se o mês já está cheio, pergunta se vira escopo extra.
  const month = (values.data_publicacao ?? new Date().toISOString().slice(0, 10)).slice(0, 7) + "-01";
  if (!extra) {
    const { data: cap } = await supabase
      .rpc("package_month_status", { p_client_id: clientId, p_month: month })
      .maybeSingle();
    if (cap && cap.capacidade > 0 && cap.usados >= cap.capacidade) {
      return { data: { overLimit: `${cap.usados} de ${cap.capacidade}` } };
    }
  }

  // Entra no fim da coluna "Planejar".
  const { data: last } = await supabase
    .from("deliverables")
    .select("ordem")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("status", "planejar")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("deliverables")
    .insert({
      ...values,
      workspace_id: workspaceId,
      client_id: clientId,
      ordem: (last?.ordem ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !created) return fromDbError(error);

  if (extra === "sim") {
    await supabase.from("scope_requests").insert({
      workspace_id: workspaceId,
      client_id: clientId,
      descricao: `Post além do pacote: ${values.titulo ?? "sem título"}`,
      deliverable_id: created.id,
      origem: "limite_pacote",
    });
  }

  revalidate();
  return { message: extra === "sim" ? "Post criado e registrado como escopo extra." : "Post criado." };
}

export async function updateDeliverable(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = updateDeliverableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update(values)
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) return fromDbError(error);

  revalidate();
  return { message: "Entrega salva." };
}

// Chamada pelo kanban ao soltar um card.
export async function moveDeliverable(input: z.infer<typeof moveDeliverableSchema>) {
  await requireUser();
  const parsed = moveDeliverableSchema.safeParse(input);
  if (!parsed.success) return { error: "Movimento inválido." };

  const { workspaceId, id, status, ordem } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update({ status, ordem })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) return { error: "Não foi possível mover a entrega." };

  revalidate();
  return { ok: true };
}

export async function deleteDeliverable(input: { workspaceId: string; id: string }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const id = z.uuid().parse(input.id);
  const supabase = await createClient();

  const { data } = await supabase
    .from("deliverables")
    .select("midia_urls")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "Entrega não encontrada." };

  if (data.midia_urls.length) await supabase.storage.from("midia").remove(data.midia_urls);
  const { error } = await supabase.from("deliverables").delete().eq("workspace_id", workspaceId).eq("id", id);
  if (error) return { error: "Não foi possível excluir a entrega." };

  revalidate();
  return { ok: true };
}

const mediaSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  paths: z.array(z.string().min(1)).min(1).max(20),
});

// Registra na entrega os arquivos já enviados ao Storage pelo navegador.
export async function attachMedia(input: z.infer<typeof mediaSchema>) {
  await requireUser();
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return { error: "Arquivos inválidos." };
  const { workspaceId, id, paths } = parsed.data;

  const supabase = await createClient();
  const { data } = await supabase
    .from("deliverables")
    .select("client_id, midia_urls")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "Entrega não encontrada." };

  const prefix = mediaPrefix(workspaceId, data.client_id, id);
  if (!paths.every((p) => p.startsWith(prefix) && !p.includes(".."))) return { error: "Caminho inválido." };

  const { error } = await supabase
    .from("deliverables")
    .update({ midia_urls: [...new Set([...data.midia_urls, ...paths])] })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) return { error: "Não foi possível anexar os arquivos." };

  revalidate();
  return { ok: true };
}

export async function removeMedia(input: { workspaceId: string; id: string; path: string }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const id = z.uuid().parse(input.id);
  const supabase = await createClient();

  const { data } = await supabase
    .from("deliverables")
    .select("midia_urls")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (!data || !data.midia_urls.includes(input.path)) return { error: "Arquivo não encontrado." };

  await supabase.storage.from("midia").remove([input.path]);
  await supabase
    .from("deliverables")
    .update({ midia_urls: data.midia_urls.filter((p) => p !== input.path) })
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  revalidate();
  return { ok: true };
}

// Muda a data de publicação (Hoje: "adiar para amanhã"; quadro: mudar data no cartão).
export async function setDeliverableDate(input: { workspaceId: string; id: string; date: string | null }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const id = z.uuid().parse(input.id);
  const date = z.iso.date().nullable().parse(input.date);
  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update({ data_publicacao: date })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidate();
  return error ? { error: "Não foi possível mudar a data." } : { ok: true };
}

// "Planejar o mês": cria os posts do pacote de cada cliente ativo (idempotente).
export async function planMonth(input: { workspaceId: string; month: string }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(input.month);
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("generate_month", { p_workspace_id: workspaceId, p_competencia: `${month}-01` })
    .maybeSingle();
  revalidate();
  if (error) return { error: "Não foi possível planejar o mês." };
  return { ok: true, criados: data?.entregas_criadas ?? 0 };
}
