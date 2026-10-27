import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { brand } from "@/config/brand";
import { OnboardingForm } from "@/features/workspaces/components/workspace-form";
import { getProfile, getUserWorkspaces } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function OnboardingPage() {
  const [profile, workspaces] = await Promise.all([getProfile(), getUserWorkspaces()]);
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/w");

  const workspace = workspaces.find((w) => w.id === profile.last_workspace_id);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-1">
        <p className="text-sm text-muted">Boas-vindas ao {brand.name}</p>
        <h1 className="text-lg font-semibold">Vamos configurar seu espaço</h1>
      </div>
      <OnboardingForm nome={profile.nome} workspaceNome={workspace?.nome ?? ""} />
    </main>
  );
}
