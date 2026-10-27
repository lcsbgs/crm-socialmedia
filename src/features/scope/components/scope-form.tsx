"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { createScopeRequest } from "../actions";

export function ScopeForm({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const [state, action] = useActionState(createScopeRequest, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="clientId" value={clientId} />
      <TextareaField
        label="O que foi pedido"
        name="descricao"
        rows={3}
        placeholder="Ex.: vídeo extra para o aniversário da loja"
        required
        errors={state?.fieldErrors?.descricao}
      />
      <Field
        label="Valor sugerido (R$)"
        name="valor_sugerido"
        inputMode="decimal"
        placeholder="300,00"
        errors={state?.fieldErrors?.valor_sugerido}
      />
      <SubmitButton>Registrar pedido</SubmitButton>
    </form>
  );
}
