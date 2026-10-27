"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { sendMagicLink, signIn } from "../actions";

type Mode = "senha" | "link";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("senha");
  const [passwordState, passwordAction] = useActionState(signIn, null);
  const [linkState, linkAction] = useActionState(sendMagicLink, null);
  const state = mode === "senha" ? passwordState : linkState;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Forma de entrar"
        className="grid grid-cols-2 rounded-md border border-border p-1 text-sm"
      >
        {(["senha", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded px-3 py-1.5",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted",
            )}
          >
            {m === "senha" ? "E-mail e senha" : "Link por e-mail"}
          </button>
        ))}
      </div>

      <FormAlert state={state} />

      {mode === "senha" ? (
        <form action={passwordAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={passwordState?.data?.email}
            errors={passwordState?.fieldErrors?.email}
          />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            errors={passwordState?.fieldErrors?.password}
          />
          <SubmitButton className="w-full" pendingText="Entrando...">
            Entrar
          </SubmitButton>
        </form>
      ) : (
        <form action={linkAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            hint="Enviamos um link de acesso. Não precisa de senha."
            errors={linkState?.fieldErrors?.email}
          />
          <SubmitButton className="w-full" pendingText="Enviando...">
            Enviar link de acesso
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
