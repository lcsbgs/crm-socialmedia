"use client";

import { useActionState, useEffect, useState } from "react";
import { ClientPicker } from "@/components/shell/client-picker";
import type { ShellClient } from "@/components/shell/shell-context";
import { FormAlert } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "@/components/ui/toast";
import { todayISO } from "@/lib/format";
import { createTask } from "../actions";

export function NewTaskDialog({
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
    <Dialog open={open} onClose={onClose} title="Nova tarefa">
      {open ? (
        <NewTaskForm workspaceId={workspaceId} clients={clients} defaults={defaults} onDone={onClose} />
      ) : null}
    </Dialog>
  );
}

function NewTaskForm({
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
  const [state, action] = useActionState(createTask, null);
  const [clientId, setClientId] = useState(defaults?.clientId ?? "");
  const [date, setDate] = useState<string | null>(defaults?.date ?? todayISO());

  useEffect(() => {
    if (state?.message) {
      toast.success("Tarefa criada");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state?.error ? state : null} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Input
        name="titulo"
        aria-label="Título da tarefa"
        placeholder="O que precisa ser feito?"
        required
        autoFocus
        className="h-9 text-md"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <ClientPicker clients={clients} name="client_id" value={clientId} onChange={setClientId} allowNone />
        <input type="hidden" name="due_date" value={date ?? ""} />
        <DatePicker value={date} onChange={setDate} showRelative aria-label="Data" />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Criando">Criar tarefa</SubmitButton>
      </div>
    </form>
  );
}
