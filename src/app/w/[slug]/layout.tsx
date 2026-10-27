import { cookies } from "next/headers";
import { AppShell, SIDEBAR_COOKIE } from "@/components/shell/app-shell";
import { getNotifications } from "@/features/notifications/queries";
import { getProfile, getUserWorkspaces, getWorkspaceBySlug } from "@/features/workspaces/queries";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const [user, workspace, workspaces, profile, cookieStore] = await Promise.all([
    requireUser(`/w/${slug}`),
    getWorkspaceBySlug(slug),
    getUserWorkspaces(),
    getProfile(),
    cookies(),
  ]);

  const supabase = await createClient();
  const [{ data: clients }, { count: todayCount }, notifications] = await Promise.all([
    supabase.from("clients").select("id, nome, cor, status").eq("workspace_id", workspace.id).order("nome"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "pendente")
      .lte("due_date", todayISO()),
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
      todayCount={todayCount ?? 0}
      notifications={notifications}
      user={{ nome: profile?.nome || user.email, email: user.email }}
      initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
