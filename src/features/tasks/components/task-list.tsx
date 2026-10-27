import { Check } from "lucide-react";
import { ClientTag } from "@/components/ui/avatar";
import { daysOverdue, formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toggleTask } from "../actions";

type Task = {
  id: string;
  titulo: string;
  due_date: string | null;
  status: "pendente" | "feita";
  client?: { nome: string; cor: number } | null;
};

export function TaskCheck({
  workspaceId,
  task,
}: {
  workspaceId: string;
  task: Pick<Task, "id" | "titulo" | "status">;
}) {
  const done = task.status === "feita";
  return (
    <form action={toggleTask} className="flex">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="done" value={String(!done)} />
      <button
        type="submit"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reabrir ${task.titulo}` : `Concluir ${task.titulo}`}
        className={cn(
          "flex size-4 items-center justify-center rounded-full border transition-colors",
          done
            ? "border-accent bg-accent text-accent-ink"
            : "border-[color-mix(in_srgb,var(--muted)_60%,transparent)] hover:border-accent",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
      </button>
    </form>
  );
}

export function TaskList({
  workspaceId,
  tasks,
  empty,
}: {
  workspaceId: string;
  tasks: Task[];
  empty: string;
}) {
  if (!tasks.length) return empty ? <p className="py-2 text-sm text-muted">{empty}</p> : null;
  const today = todayISO();

  return (
    <ul>
      {tasks.map((t) => {
        const done = t.status === "feita";
        const late = !done && t.due_date !== null && t.due_date < today;
        return (
          <li
            key={t.id}
            className="flex min-h-9 items-center gap-3 border-b border-border py-1.5 last:border-0"
          >
            <TaskCheck workspaceId={workspaceId} task={t} />
            <span className={cn("min-w-0 flex-1 truncate", done && "text-muted line-through")}>
              {t.titulo}
            </span>
            {t.client ? (
              <ClientTag name={t.client.nome} color={t.client.cor} className="hidden sm:inline-flex" />
            ) : null}
            {t.due_date ? (
              <time
                dateTime={t.due_date}
                title={late ? `${daysOverdue(t.due_date)} dias de atraso` : undefined}
                className={cn("w-20 shrink-0 text-right text-sm", late ? "text-late" : "text-muted")}
              >
                {formatRelativeDay(t.due_date)}
              </time>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
