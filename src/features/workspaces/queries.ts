import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { WorkspaceRole } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const getProfile = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, last_workspace_id, onboarded_at")
    .eq("id", user.id)
    .single();
  return data;
});

export const getUserWorkspaces = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces!inner (id, nome, slug, plano)")
    .eq("user_id", user.id)
    .order("created_at");
  return (data ?? []).map((m) => ({ ...m.workspace, role: m.role }));
});

export type CurrentWorkspace = Awaited<ReturnType<typeof getWorkspaceBySlug>>;

// Workspace da rota atual com o papel do usuário. 404 se não for membro.
export const getWorkspaceBySlug = cache(async (slug: string) => {
  const user = await requireUser(`/w/${slug}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, nome, slug, plano, owner_id, workspace_members!inner (role)")
    .eq("slug", slug)
    .eq("workspace_members.user_id", user.id)
    .maybeSingle();
  if (!data) notFound();

  const { workspace_members, ...workspace } = data;
  const role: WorkspaceRole = workspace_members[0].role;
  return { ...workspace, role, canManage: role === "owner" || role === "admin" };
});

export async function getWorkspaceUsage(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("workspace_usage", { p_workspace_id: workspaceId }).single();
  return data;
}

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at, profile:profiles!inner (nome, avatar_url, email, auth_provider)")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  return data ?? [];
}

export async function getPendingInvitations(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("id, email, role, token, expires_at, client_ids, created_at")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getClientAssignments(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("client_assignees").select("client_id, user_id").eq("workspace_id", workspaceId);
  return data ?? [];
}

export async function getWorkspaceLogoUrl(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("logo_path").eq("id", workspaceId).single();
  if (!data?.logo_path) return null;
  const { data: signed } = await supabase.storage.from("midia").createSignedUrl(data.logo_path, 60 * 60);
  return signed?.signedUrl ?? null;
}
