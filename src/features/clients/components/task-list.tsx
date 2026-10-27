import { toggleTask } from "../actions";
import { formatDate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

type Task = { id: string; titulo: string; due_date: string | null; status: "pendente" | "feita" };

export function TaskList({
  workspaceId,
  tasks,
  empty,
}: {
  workspaceId: string;
  tasks: Task[];
  empty: string;
}) {
  if (!tasks.length) return <p className="text-sm text-muted">{empty}</p>;
  const today = todayISO();

  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => {
        const done = t.status === "feita";
        const late = !done && t.due_date !== null && t.due_date < today;
        return (
          <li key={t.id} className="flex items-center gap-3 py-2">
            <form action={toggleTask}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="done" value={String(!done)} />
              <button
                type="submit"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Reabrir ${t.titulo}` : `Concluir ${t.titulo}`}
                className={cn(
                  "flex size-5 items-center justify-center rounded border",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface",
                )}
              >
                {done ? (
                  <svg aria-hidden viewBox="0 0 20 20" className="size-3.5">
                    <path fill="currentColor" d="M8 13.6 4.4 10l-1.4 1.4L8 16.4l9-9L15.6 6z" />
                  </svg>
                ) : null}
              </button>
            </form>
            <span className={cn("flex-1 text-sm", done && "text-muted line-through")}>{t.titulo}</span>
            <span className={cn("text-xs", late ? "font-medium text-danger" : "text-muted")}>
              {formatDate(t.due_date)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
