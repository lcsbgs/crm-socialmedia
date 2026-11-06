import { AppShell } from "@/components/shell/app-shell";
import { getNotifications } from "@/features/notifications/queries";
import {
  getProfile,
  getUserWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceMembers,
} from "@/features/workspaces/queries";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const [user, workspace, workspaces, profile] = await Promise.all([
    requireUser(`/w/${slug}`),
    getWorkspaceBySlug(slug),
    getUserWorkspaces(),
    getProfile(),
  ]);

  const supabase = await createClient();
  const [{ data: clients }, { count: todayCount }, { count: approvals }, members, notifications] =
    await Promise.all([
      supabase.from("clients").select("id, nome, cor, status").eq("workspace_id", workspace.id).order("nome"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "pendente")
        .lte("due_date", todayISO()),
      supabase
        .from("deliverables")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "em_aprovacao"),
      getWorkspaceMembers(workspace.id),
      getNotifications(workspace.id, user.id),
    ]);

  if (profile && profile.last_workspace_id !== workspace.id) {
    await supabase.from("profiles").update({ last_workspace_id: workspace.id }).eq("id", profile.id);
  }

  return (
    <AppShell
      workspace={workspace}
      workspaces={workspaces}
      clients={(clients ?? []).map((c) => ({ ...c, cor: c.cor ?? 0 }))}
      counts={{ today: todayCount ?? 0, approvals: approvals ?? 0 }}
      team={members.map((m) => ({ name: m.profile.nome || "?" }))}
      canSeeFinance={workspace.canManage}
      notifications={notifications}
      user={{ nome: profile?.nome || user.email, email: user.email }}
    >
      {children}
    </AppShell>
  );
}
