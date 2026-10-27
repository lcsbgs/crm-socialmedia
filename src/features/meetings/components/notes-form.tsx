"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { generateMeetingMinutes, saveMeetingNotes } from "../actions";

export function NotesForm({
  workspaceId,
  meeting,
  locked,
}: {
  workspaceId: string;
  meeting: { id: string; titulo: string; data: string; notas_brutas: string };
  locked: boolean;
}) {
  const [saveState, saveAction] = useActionState(saveMeetingNotes, null);
  const [aiState, aiAction, generating] = useActionState(generateMeetingMinutes, null);

  return (
    <div className="space-y-4">
      <form action={saveAction} className="space-y-4">
        <FormAlert state={saveState} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="id" value={meeting.id} />
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Field
            label="Título"
            name="titulo"
            defaultValue={meeting.titulo}
            required
            errors={saveState?.fieldErrors?.titulo}
          />
          <Field label="Data e hora" name="data" type="datetime-local" defaultValue={meeting.data} required />
        </div>
        <TextareaField label="Anotações" name="notas_brutas" rows={12} defaultValue={meeting.notas_brutas} />
        <SubmitButton variant="secondary">Salvar anotações</SubmitButton>
      </form>

      {locked ? null : (
        <form action={aiAction} className="space-y-3 rounded-md border border-border p-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="id" value={meeting.id} />
          <p className="text-sm text-muted">
            A IA lê as anotações salvas e sugere resumo, decisões e próximos passos. Você revisa antes de
            confirmar.
          </p>
          <FormAlert state={aiState} />
          <SubmitButton pendingText="Gerando ata...">Gerar ata com IA</SubmitButton>
          {generating ? <p className="text-xs text-muted">Isso pode levar alguns segundos.</p> : null}
        </form>
      )}
    </div>
  );
}
