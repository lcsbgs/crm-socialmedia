"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { generateMonth } from "../actions";

export function GenerateMonthForm({
  workspaceId,
  defaultMonth,
}: {
  workspaceId: string;
  defaultMonth: string;
}) {
  const [state, action] = useActionState(generateMonth, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label htmlFor="mes" className="block text-sm font-medium">
            Mês
          </label>
          <input
            id="mes"
            name="mes"
            type="month"
            defaultValue={defaultMonth}
            required
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          />
        </div>
        <SubmitButton pendingText="Gerando...">Gerar mês</SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
