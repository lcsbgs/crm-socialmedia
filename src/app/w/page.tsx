import { redirect } from "next/navigation";
import { getProfile, getUserWorkspaces } from "@/features/workspaces/queries";

// Decide para onde levar o usuário logado: onboarding, último workspace usado
// ou o primeiro disponível.
export default async function WorkspaceResolver() {
  const [profile, workspaces] = await Promise.all([getProfile(), getUserWorkspaces()]);

  if (!profile?.onboarded_at) redirect("/onboarding/espaco");
  if (workspaces.length === 0) redirect("/w/novo");

  const target = workspaces.find((w) => w.id === profile.last_workspace_id) ?? workspaces[0];
  redirect(`/w/${target.slug}`);
}
