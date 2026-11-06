"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { briefingQuestions } from "@/features/clients/hub-schemas";
import { submitBriefing } from "./briefing-actions";

export function BriefingForm({ token, initial }: { token: string; initial: Record<string, string> }) {
  const [state, action] = useActionState(submitBriefing, null);
  if (state?.message) return <FormAlert state={state} />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <FormAlert state={state} />
      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" name="nome" autoComplete="name" />
      </div>
      {briefingQuestions.map((q) => (
        <div key={q.key} className="space-y-1.5">
          <Label htmlFor={q.key}>{q.label}</Label>
          {q.long ? (
            <Textarea id={q.key} name={q.key} rows={4} defaultValue={initial[q.key] ?? ""} />
          ) : (
            <Input id={q.key} name={q.key} defaultValue={initial[q.key] ?? ""} />
          )}
        </div>
      ))}
      <SubmitButton size="lg" pendingText="Enviando...">
        Enviar briefing
      </SubmitButton>
    </form>
  );
}
