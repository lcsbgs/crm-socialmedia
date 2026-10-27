"use client";

import { useActionState } from "react";
import { Alert, FormAlert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, SelectField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { inviteMember } from "../actions";

export function InviteForm({ workspaceId, atLimit }: { workspaceId: string; atLimit: boolean }) {
  const [state, action] = useActionState(inviteMember, null);
  const link = state?.data?.link;

  if (atLimit && !link) {
    return (
      <Alert tone="info">
        Você atingiu o limite de usuários do seu plano, contando convites pendentes. Revogue um convite ou
        faça upgrade para convidar mais pessoas.
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      {link ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center">
          <code className="flex-1 truncate text-xs">{link}</code>
          <CopyButton value={link} />
        </div>
      ) : null}
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <Field label="E-mail" name="email" type="email" required errors={state?.fieldErrors?.email} />
        <SelectField
          label="Papel"
          name="role"
          defaultValue="member"
          options={[
            { value: "member", label: "Membro" },
            { value: "admin", label: "Administrador" },
          ]}
        />
        <SubmitButton pendingText="Gerando...">Gerar convite</SubmitButton>
      </div>
    </form>
  );
}
