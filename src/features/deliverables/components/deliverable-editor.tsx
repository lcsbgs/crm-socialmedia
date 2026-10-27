"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { deleteDeliverable, updateDeliverable } from "../actions";
import type { Deliverable } from "../queries";
import { formatLabels, statusColumns } from "../schemas";
import { MediaUploader } from "./media-uploader";

export function DeliverableEditor({
  workspaceId,
  deliverable,
  onDone,
}: {
  workspaceId: string;
  deliverable: Deliverable;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(updateDeliverable, null);
  const [deleting, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <FormAlert state={state} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="id" value={deliverable.id} />
        <Field
          label="Título"
          name="titulo"
          defaultValue={deliverable.titulo}
          required
          errors={state?.fieldErrors?.titulo}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Formato" name="formato" defaultValue={deliverable.formato}>
            {Object.entries(formatLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Etapa" name="status" defaultValue={deliverable.status}>
            {statusColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </SelectField>
          <Field
            label="Publicação"
            name="data_publicacao"
            type="date"
            defaultValue={deliverable.data_publicacao ?? ""}
          />
        </div>
        <TextareaField label="Legenda" name="legenda" rows={6} defaultValue={deliverable.legenda ?? ""} />
        <SubmitButton>Salvar</SubmitButton>
      </form>

      <MediaUploader
        workspaceId={workspaceId}
        clientId={deliverable.client_id}
        deliverableId={deliverable.id}
        media={deliverable.midia}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {confirming ? (
          <>
            <span className="text-sm">Excluir a entrega e os arquivos dela?</span>
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={() =>
                startDelete(async () => {
                  await deleteDeliverable({ workspaceId, id: deliverable.id });
                  onDone();
                  router.refresh();
                })
              }
            >
              {deleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirming(true)}>
            Excluir entrega
          </Button>
        )}
      </div>
    </div>
  );
}
