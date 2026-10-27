"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { scopeRequestSchema, scopeStatusSchema } from "./schemas";

export async function createScopeRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = scopeRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, clientId, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("scope_requests")
    .insert({ ...values, workspace_id: workspaceId, client_id: clientId });
  if (error) return fromDbError(error);

  revalidatePath("/w", "layout");
  return { message: "Pedido registrado." };
}

export async function setScopeStatus(formData: FormData) {
  await requireUser();
  const { workspaceId, id, status } = scopeStatusSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  await supabase.from("scope_requests").update({ status }).eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath("/w", "layout");
}

export async function deleteScopeRequest(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("scope_requests").delete().eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath("/w", "layout");
}
