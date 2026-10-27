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
