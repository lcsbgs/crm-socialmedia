"use client";

import { Check, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ClientPicker } from "@/components/shell/client-picker";
import type { ShellClient } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Sheet } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { deleteTask, setTaskDone, updateTask } from "../actions";

export type SheetTask = { id: string; titulo: string; date: string | null; clientId: string | null };

// Painel lateral de uma tarefa: editar, concluir e excluir sem sair da tela.
export function TaskSheet({
  task,
  onClose,
  workspaceId,
  clients,
}: {
  task: SheetTask | null;
  onClose: () => void;
  workspaceId: string;
  clients: ShellClient[];
}) {
  return (
    <Sheet open={!!task} onClose={onClose} title="Tarefa">
      {task ? (
        <TaskEditor key={task.id} task={task} onClose={onClose} workspaceId={workspaceId} clients={clients} />
      ) : null}
    </Sheet>
  );
}

function TaskEditor({
  task,
  onClose,
  workspaceId,
  clients,
}: {
  task: SheetTask;
  onClose: () => void;
  workspaceId: string;
  clients: ShellClient[];
}) {
  const [titulo, setTitulo] = useState(task.titulo);
  const [clientId, setClientId] = useState(task.clientId ?? "");
  const [date, setDate] = useState<string | null>(task.date);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success(success);
        onClose();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-titulo">Título</Label>
        <Input id="task-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <ClientPicker clients={clients} value={clientId} onChange={setClientId} allowNone />
        </div>
        <div className="space-y-1.5">
          <Label>Data</Label>
          <DatePicker value={date} onChange={setDate} showRelative aria-label="Data" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            run(
              () =>
                updateTask({ workspaceId, id: task.id, titulo, client_id: clientId || null, due_date: date }),
              "Tarefa salva",
            )
          }
        >
          Salvar
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => setTaskDone({ workspaceId, id: task.id, done: true }), "Tarefa concluída")}
        >
          <Check aria-hidden />
          Concluir
        </Button>
      </div>
      <div className="border-t border-border pt-4">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Excluir esta tarefa?</span>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => run(() => deleteTask({ workspaceId, id: task.id }), "Tarefa excluída")}
            >
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden />
            Excluir tarefa
          </Button>
        )}
      </div>
    </div>
  );
}
