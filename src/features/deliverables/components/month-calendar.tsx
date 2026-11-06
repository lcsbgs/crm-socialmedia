"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useShell } from "@/components/shell/shell-context";
import { clientColor } from "@/config/client-colors";
import { monthGrid } from "@/lib/dates";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardDeliverable } from "../queries";
import { deliverableLabel } from "../schemas";
import { useDeliverableSheet } from "./deliverable-sheet";

export type CalendarMeeting = {
  id: string;
  titulo: string;
  date: string;
  time: string;
  client: { id: string; nome: string; cor: number };
};

const weekdays = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

// Calendário do mês: entregas por data de publicação e reuniões.
export function MonthCalendar({
  month,
  items,
  meetings = [],
}: {
  month: string;
  items: BoardDeliverable[];
  meetings?: CalendarMeeting[];
}) {
  const { workspace } = useShell();
  const sheet = useDeliverableSheet();
  const { days } = monthGrid(month);
  const today = todayISO();

  return (
    <div className="overflow-hidden rounded-card bg-surface">
      <div className="hidden grid-cols-7 border-b border-border md:grid">
        {weekdays.map((w) => (
          <div key={w} className="px-2 py-1.5 text-xs text-muted">
            {w}
          </div>
        ))}
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-7">
        {days.map((day) => {
          const inMonth = day.startsWith(month);
          const dayItems = items.filter((i) => i.data_publicacao === day);
          const dayMeetings = meetings.filter((m) => m.date === day);
          // No celular, só os dias do mês que têm algo.
          const empty = !dayItems.length && !dayMeetings.length;
          return (
            <li
              key={day}
              className={cn(
                "min-h-28 border-b border-border p-1.5 md:border-r md:[&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-[color-mix(in_srgb,var(--border)_25%,transparent)] max-md:hidden",
                empty && "max-md:hidden",
              )}
            >
              <p
                className={cn(
                  "tabular mb-1 flex size-6 items-center justify-center rounded-full text-xs",
                  day === today
                    ? "bg-accent font-semibold text-accent-ink"
                    : inMonth
                      ? "text-ink"
                      : "text-muted",
                )}
              >
                {Number(day.slice(8))}
                <span className="sr-only"> de {day.slice(5, 7)}</span>
              </p>
              <ul className="space-y-0.5">
                {dayMeetings.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/w/${workspace.slug}/clientes/${m.client.id}/reunioes/${m.id}`}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-hover"
                    >
                      <CalendarClock className="size-3 shrink-0 text-muted" aria-hidden />
                      <span className="tabular text-muted">{m.time}</span>
                      <span className="truncate">{m.titulo}</span>
                    </Link>
                  </li>
                ))}
                {dayItems.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => sheet.open(i.id)}
                      className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-hover"
                    >
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: clientColor(i.client.cor) }}
                      />
                      <span
                        className={cn(
                          "truncate",
                          !i.titulo && "text-muted italic",
                          i.status === "publicado" && "text-muted line-through",
                        )}
                      >
                        {deliverableLabel(i)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
