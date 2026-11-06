"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { confirmMockLogin } from "../actions";

export function MockConsentForm({
  provider,
  next,
  defaultEmail,
  defaultName,
}: {
  provider: string;
  next: string;
  defaultEmail: string;
  defaultName: string;
}) {
  const [state, action] = useActionState(confirmMockLogin, null);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <Field label="Nome na conta" name="nome" defaultValue={defaultName} required errors={state?.fieldErrors?.nome} />
      <Field
        label="E-mail da conta"
        name="email"
        type="email"
        defaultValue={state?.data?.email ?? defaultEmail}
        hint="Use o e-mail do convite para cair direto no espaço da equipe."
        required
        errors={state?.fieldErrors?.email}
      />
      <SubmitButton size="lg" className="w-full" pendingText="Entrando...">
        Permitir e continuar
      </SubmitButton>
    </form>
  );
}
