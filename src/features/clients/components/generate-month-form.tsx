"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { MonthPicker } from "@/components/ui/date-picker";
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
        <MonthPicker name="mes" defaultValue={defaultMonth} aria-label="Mês" />
        <SubmitButton pendingText="Gerando...">Gerar mês</SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
