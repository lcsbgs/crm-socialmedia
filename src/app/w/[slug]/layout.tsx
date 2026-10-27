import { AppHeader } from "@/features/workspaces/components/app-header";
import { getProfile, getUserWorkspaces, getWorkspaceBySlug } from "@/features/workspaces/queries";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const [workspace, workspaces, profile] = await Promise.all([
    getWorkspaceBySlug(slug),
    getUserWorkspaces(),
    getProfile(),
  ]);

  if (profile && profile.last_workspace_id !== workspace.id) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ last_workspace_id: workspace.id }).eq("id", profile.id);
  }

  return (
    <>
      <AppHeader current={workspace} workspaces={workspaces} userName={profile?.nome ?? ""} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
