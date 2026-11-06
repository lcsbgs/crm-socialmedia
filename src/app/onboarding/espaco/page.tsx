import type { Metadata } from "next";
import { OnboardingFrame } from "@/features/onboarding/components/onboarding-frame";
import { StudioForm } from "@/features/onboarding/components/studio-form";
import { getOnboardingContext } from "@/features/onboarding/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seu espaço e equipe" };

export default async function OnboardingStudioPage() {
  const { profile, workspace } = await getOnboardingContext();
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("modo_trabalho").eq("id", workspace.id).single();
  const primeiroNome = (profile.nome || "").split(" ")[0];
  return (
    <OnboardingFrame step={1}>
      <div className="space-y-1">
        <p className="text-md text-muted">{primeiroNome ? `Que bom te ver, ${primeiroNome}.` : "Que bom te ver."}</p>
        <h1 className="font-display text-3xl">Como se chama o seu estúdio?</h1>
      </div>
      <StudioForm
        workspaceId={workspace.id}
        nome={profile.nome ?? ""}
        estudio={workspace.nome}
        modo={ws?.modo_trabalho ?? "solo"}
      />
    </OnboardingFrame>
  );
}
