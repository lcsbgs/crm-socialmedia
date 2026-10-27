"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteWorkspace } from "../actions";

export function DeleteWorkspaceForm({ workspaceId, nome }: { workspaceId: string; nome: string }) {
  const [state, action] = useActionState(deleteWorkspace, null);
  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Field label={`Para confirmar, digite "${nome}"`} name="confirmacao" autoComplete="off" required />
      <SubmitButton variant="danger" pendingText="Excluindo...">
        Excluir workspace e todos os dados
      </SubmitButton>
    </form>
  );
}
