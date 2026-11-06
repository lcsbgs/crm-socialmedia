import "server-only";
import { redirect } from "next/navigation";
import { getProfile, getUserWorkspaces } from "@/features/workspaces/queries";

// Espaço do onboarding: o último usado, onde a pessoa é dona.
export async function getOnboardingContext() {
  const [profile, workspaces] = await Promise.all([getProfile(), getUserWorkspaces()]);
  if (!profile) redirect("/login");
  const owned = workspaces.filter((w) => w.role === "owner");
  const workspace = owned.find((w) => w.id === profile.last_workspace_id) ?? owned[0];
  if (!workspace) redirect("/w");
  return { profile, workspace };
}
