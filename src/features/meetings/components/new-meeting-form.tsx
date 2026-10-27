"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { createMeeting } from "../actions";

export function NewMeetingForm({
  workspaceId,
  clientId,
  slug,
  now,
}: {
  workspaceId: string;
  clientId: string;
  slug: string;
  now: string;
}) {
  const [state, action] = useActionState(createMeeting, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state?.error ? state : null} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field
          label="Título"
          name="titulo"
          defaultValue="Reunião de alinhamento"
          required
          errors={state?.fieldErrors?.titulo}
        />
        <Field
          label="Data e hora"
          name="data"
          type="datetime-local"
          defaultValue={now}
          required
          errors={state?.fieldErrors?.data}
        />
      </div>
      <TextareaField
        label="Anotações"
        name="notas_brutas"
        rows={6}
        placeholder="Cole aqui as anotações da reunião, do jeito que estiverem."
      />
      <SubmitButton>Criar reunião</SubmitButton>
    </form>
  );
}
