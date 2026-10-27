"use client";

import { useActionState, useEffect, useState } from "react";
import { ClientPicker } from "@/components/shell/client-picker";
import type { ShellClient } from "@/components/shell/shell-context";
import { FormAlert } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "@/components/ui/toast";
import { createDeliverable } from "../actions";
import { formatLabels } from "../schemas";

const formatOptions = Object.entries(formatLabels).map(([value, label]) => ({ value, label }));

export function NewDeliverableDialog({
  open,
  onClose,
  workspaceId,
  clients,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  clients: ShellClient[];
  defaults?: { clientId?: string; date?: string };
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Nova entrega">
      {open ? (
        <NewDeliverableForm
          workspaceId={workspaceId}
          clients={clients}
          defaults={defaults}
          onDone={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function NewDeliverableForm({
  workspaceId,
  clients,
  defaults,
  onDone,
}: {
  workspaceId: string;
  clients: ShellClient[];
  defaults?: { clientId?: string; date?: string };
  onDone: () => void;
}) {
  const [state, action] = useActionState(createDeliverable, null);
  const [clientId, setClientId] = useState(
    defaults?.clientId ?? clients.find((c) => c.status === "ativo")?.id ?? "",
  );
  const [date, setDate] = useState<string | null>(defaults?.date ?? null);

  useEffect(() => {
    if (state?.message) {
      toast.success("Entrega criada");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state?.error ? state : null} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Input
        name="titulo"
        aria-label="Título da entrega"
        placeholder="Título da entrega"
        required
        autoFocus
        className="h-9 text-md"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <ClientPicker clients={clients} name="clientId" value={clientId} onChange={setClientId} />
        <Select name="formato" defaultValue="post" options={formatOptions} aria-label="Formato" />
        <input type="hidden" name="data_publicacao" value={date ?? ""} />
        <DatePicker
          value={date}
          onChange={setDate}
          placeholder="Publicação"
          aria-label="Data de publicação"
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Criando" disabled={!clientId}>
          Criar entrega
        </SubmitButton>
      </div>
    </form>
  );
}
