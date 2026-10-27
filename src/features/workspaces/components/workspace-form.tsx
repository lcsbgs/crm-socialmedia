"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeOnboarding, createWorkspace } from "../actions";

export function CreateWorkspaceForm() {
  const [state, action] = useActionState(createWorkspace, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <Field
        label="Nome do workspace"
        name="nome"
        placeholder="Ex.: Estúdio Ana Social"
        required
        errors={state?.fieldErrors?.nome}
      />
      <SubmitButton pendingText="Criando...">Criar workspace</SubmitButton>
    </form>
  );
}

export function OnboardingForm({ nome, workspaceNome }: { nome: string; workspaceNome: string }) {
  const [state, action] = useActionState(completeOnboarding, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <Field label="Seu nome" name="nome" defaultValue={nome} required errors={state?.fieldErrors?.nome} />
      <Field
        label="Nome do seu negócio"
        name="workspaceNome"
        defaultValue={workspaceNome}
        hint="Aparece para sua equipe. Dá para mudar depois."
        required
        errors={state?.fieldErrors?.workspaceNome}
      />
      <SubmitButton className="w-full" pendingText="Salvando...">
        Continuar
      </SubmitButton>
    </form>
  );
}
