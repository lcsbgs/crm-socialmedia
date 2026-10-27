"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTask } from "../actions";

const control = "h-10 rounded-md border border-border bg-surface px-3 text-sm";

export function QuickTaskForm({
  workspaceId,
  clients,
  today,
}: {
  workspaceId: string;
  clients: { id: string; nome: string }[];
  today: string;
}) {
  const [state, action] = useActionState(createTask, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="grid gap-2 sm:grid-cols-[1fr_200px_160px_auto]">
        <input
          name="titulo"
          aria-label="Nova tarefa"
          placeholder="Nova tarefa avulsa"
          required
          className={control}
        />
        <select name="client_id" aria-label="Cliente" className={control}>
          <option value="">Sem cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <input name="due_date" type="date" aria-label="Data" defaultValue={today} className={control} />
        <SubmitButton pendingText="Criando...">Adicionar</SubmitButton>
      </div>
      <FormAlert state={state?.error ? state : null} />
    </form>
  );
}
