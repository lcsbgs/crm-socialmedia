"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendMagicLink, signIn, signUp } from "../actions";

// Acesso por e-mail: link mágico (padrão) e, em desenvolvimento, e-mail e senha.
export function EmailAccess({
  next,
  mode,
  allowPassword,
  defaultEmail,
}: {
  next: string;
  mode: "criar" | "entrar";
  allowPassword: boolean;
  defaultEmail?: string;
}) {
  const [withPassword, setWithPassword] = useState(false);
  const [linkState, linkAction] = useActionState(sendMagicLink, null);
  const [pwState, pwAction] = useActionState(mode === "criar" ? signUp : signIn, null);

  if (withPassword) {
    return (
      <form action={pwAction} className="flex flex-col gap-3.5">
        <input type="hidden" name="next" value={next} />
        <FormAlert state={pwState} />
        {mode === "criar" ? (
          <Field label="Seu nome" name="nome" autoComplete="name" required errors={pwState?.fieldErrors?.nome} />
        ) : null}
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={pwState?.data?.email ?? defaultEmail}
          errors={pwState?.fieldErrors?.email}
        />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete={mode === "criar" ? "new-password" : "current-password"}
          required
          errors={pwState?.fieldErrors?.password}
        />
        <SubmitButton size="lg" className="w-full" pendingText="Aguarde...">
          {mode === "criar" ? "Criar conta" : "Entrar"}
        </SubmitButton>
        <button type="button" onClick={() => setWithPassword(false)} className="text-sm font-semibold text-accent-tonal-ink underline">
          Usar link por e-mail
        </button>
      </form>
    );
  }

  return (
    <form action={linkAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="next" value={next} />
      <FormAlert state={linkState} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@seuestudio.com.br"
        required
        defaultValue={defaultEmail}
        errors={linkState?.fieldErrors?.email}
      />
      <SubmitButton size="lg" className="w-full" pendingText="Enviando...">
        Receber link de acesso
      </SubmitButton>
      {allowPassword ? (
        <button type="button" onClick={() => setWithPassword(true)} className="text-sm font-semibold text-muted underline hover:text-ink">
          Usar e-mail e senha (desenvolvimento)
        </button>
      ) : null}
    </form>
  );
}
