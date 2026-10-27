"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { ClientPicker } from "@/components/shell/client-picker";
import { useShell } from "@/components/shell/shell-context";
import { DatePicker } from "@/components/ui/date-picker";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "@/components/ui/toast";
import { createTask } from "@/features/tasks/actions";
import { todayISO } from "@/lib/format";

// Campo de criação rápida no topo da Hoje: título + cliente + data em popovers.
export function QuickAdd() {
  const { workspace, clients } = useShell();
  const [state, action, pending] = useActionState(createTask, null);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<string | null>(todayISO());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) toast.error(state.fieldErrors?.titulo?.[0] ?? state.error);
    if (state?.message) toast.success("Tarefa criada");
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-1.5 focus-within:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] sm:flex-row sm:items-center"
    >
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <input type="hidden" name="due_date" value={date ?? ""} />
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
        <Plus className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          name="titulo"
          aria-label="Nova tarefa"
          placeholder="Nova tarefa"
          autoComplete="off"
          required
          className="h-8 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted focus-visible:outline-none"
        />
        <span className="hidden sm:inline-flex">
          <Kbd>C</Kbd>
        </span>
      </div>
      <div className="flex gap-1.5">
        <ClientPicker
          clients={clients}
          name="client_id"
          value={clientId}
          onChange={setClientId}
          allowNone
          size="sm"
          className="w-40"
        />
        <DatePicker
          value={date}
          onChange={setDate}
          size="sm"
          showRelative
          className="w-32"
          aria-label="Data"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-7 shrink-0 rounded-md bg-accent px-2.5 text-sm font-medium text-accent-ink disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
    </form>
  );
}
