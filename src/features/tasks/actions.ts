"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createTaskSchema } from "./schemas";

export async function createTask(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = createTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .insert({ ...values, workspace_id: workspaceId, tipo: "avulsa", origem: "manual" });
  if (error) return fromDbError(error);

  revalidatePath("/w", "layout");
  return { message: "Tarefa criada." };
}

export async function toggleTask(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));
  const done = formData.get("done") === "true";

  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: done ? "feita" : "pendente" })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidatePath("/w", "layout");
}

const idsSchema = z.object({ workspaceId: z.uuid(), id: z.uuid() });

function tomorrowISO() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Ações chamadas direto pela lista (sem formulário).
export async function setTaskDone(input: { workspaceId: string; id: string; done: boolean }) {
  await requireUser();
  const { workspaceId, id } = idsSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: input.done ? "feita" : "pendente" })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível atualizar a tarefa." } : { ok: true };
}

export async function postponeTask(input: { workspaceId: string; id: string }) {
  await requireUser();
  const { workspaceId, id } = idsSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ due_date: tomorrowISO() })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível adiar." } : { ok: true };
}

const updateTaskSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  titulo: z.string().trim().min(1, "Informe a tarefa").max(200),
  client_id: z.uuid().nullable(),
  due_date: z.iso.date().nullable(),
});

export async function updateTask(input: z.input<typeof updateTaskSchema>) {
  await requireUser();
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { workspaceId, id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(values).eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível salvar." } : { ok: true };
}

export async function deleteTask(input: { workspaceId: string; id: string }) {
  await requireUser();
  const { workspaceId, id } = idsSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível excluir." } : { ok: true };
}
