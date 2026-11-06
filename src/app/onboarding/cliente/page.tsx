import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { FirstClientStep } from "@/features/onboarding/components/first-client-step";
import { OnboardingFrame } from "@/features/onboarding/components/onboarding-frame";
import { getOnboardingContext } from "@/features/onboarding/queries";
import { describeItems } from "@/features/packages/schemas";
import { getPendingInvitations, getWorkspaceMembers } from "@/features/workspaces/queries";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Primeiro cliente" };

export default async function OnboardingClientPage() {
  const { workspace } = await getOnboardingContext();
  const supabase = await createClient();
  const [{ data: packages }, members, invites] = await Promise.all([
    supabase.from("package_templates").select("id, nome, itens").eq("workspace_id", workspace.id).order("nome"),
    getWorkspaceMembers(workspace.id),
    getPendingInvitations(workspace.id),
  ]);
  const people = [
    ...members.map((m) => ({ id: m.user_id, nome: m.profile.nome || "Você" })),
    ...invites.map((i) => ({ id: i.id, nome: i.email.split("@")[0], convite: true })),
  ];
  return (
    <OnboardingFrame step={3}>
      <div className="space-y-1">
        <h1 className="font-display text-3xl">Agora, o seu primeiro cliente</h1>
        <p className="text-md text-muted">Com isso, o Pauta já monta o mês dele.</p>
      </div>
      <FirstClientStep
        workspaceId={workspace.id}
        packages={(packages ?? []).map((p) => ({ id: p.id, nome: p.nome, resumo: describeItems(p.itens) }))}
        people={people}
        mock={isMockMode()}
      />
      <Link href="/onboarding/ia" className={buttonClasses("ghost", "md") + " self-start"}>
        Voltar
      </Link>
    </OnboardingFrame>
  );
}
