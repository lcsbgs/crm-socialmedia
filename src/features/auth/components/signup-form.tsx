"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUp } from "../actions";

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, null);

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Seu nome" name="nome" autoComplete="name" required errors={state?.fieldErrors?.nome} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state?.fieldErrors?.email}
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Mínimo de 8 caracteres."
        errors={state?.fieldErrors?.password}
      />
      <SubmitButton className="w-full" pendingText="Criando conta...">
        Criar conta
      </SubmitButton>
    </form>
  );
}
