"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { renameWorkspace } from "../actions";

export function RenameWorkspaceForm({
  workspaceId,
  nome,
  disabled,
}: {
  workspaceId: string;
  nome: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(renameWorkspace, null);
  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Nome do workspace"
          name="nome"
          defaultValue={nome}
          required
          disabled={disabled}
          errors={state?.fieldErrors?.nome}
          className="flex-1"
        />
        {disabled ? null : <SubmitButton variant="secondary">Salvar</SubmitButton>}
      </div>
    </form>
  );
}
