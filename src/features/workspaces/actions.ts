"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkspaceSchema,
  inviteSchema,
  onboardingSchema,
  renameWorkspaceSchema,
  tokenSchema,
} from "./schemas";

export async function createWorkspace(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = createWorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", { p_nome: parsed.data.nome });
  if (error || !data) return fromDbError(error);
  redirect(`/w/${data.slug}`);
}

export async function renameWorkspace(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = renameWorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ nome: parsed.data.nome })
    .eq("id", parsed.data.workspaceId)
    .select("id");
  if (error) return fromDbError(error);
  if (!data.length) return { error: "Você não tem permissão para renomear este workspace." };

  revalidatePath("/w", "layout");
  return { message: "Nome atualizado." };
}

export async function deleteWorkspace(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const confirmacao = String(formData.get("confirmacao") ?? "").trim();

  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("nome").eq("id", workspaceId).single();
  if (!ws || confirmacao !== ws.nome) {
    return { error: "Digite o nome exato do workspace para confirmar." };
  }

  const { data, error } = await supabase.from("workspaces").delete().eq("id", workspaceId).select("id");
  if (error) return fromDbError(error);
  if (!data.length) return { error: "Somente o proprietário pode excluir o workspace." };

  redirect("/w");
}

export async function inviteMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      workspace_id: parsed.data.workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error?.code === "23505") return { error: "Já existe um convite pendente para este e-mail." };
  if (error || !data) return fromDbError(error);

  revalidatePath("/w", "layout");
  return {
    message: "Convite criado. Copie o link e envie para a pessoa.",
    data: { link: `${publicEnv.NEXT_PUBLIC_APP_URL}/convite/${data.token}` },
  };
}

export async function revokeInvitation(formData: FormData) {
  await requireUser();
  const id = z.uuid().parse(formData.get("invitationId"));
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/w", "layout");
}

export async function removeMember(formData: FormData) {
  const user = await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const userId = z.uuid().parse(formData.get("userId"));

  const supabase = await createClient();
  await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);

  if (userId === user.id) redirect("/w");
  revalidatePath("/w", "layout");
}

export async function acceptInvitation(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!token.success) return { error: "Convite inválido." };

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("accept_invitation", { p_token: token.data });
  if (error || !slug) return fromDbError(error);

  // Quem entra por convite não precisa do onboarding do workspace pessoal.
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("onboarded_at", null);

  redirect(`/w/${slug}`);
}

export async function completeOnboarding(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("complete_onboarding", {
    p_nome: parsed.data.nome,
    p_workspace_nome: parsed.data.workspaceNome,
  });
  if (error || !slug) return fromDbError(error);

  redirect(`/w/${slug}/comecar`);
}
