"use client";

import { Check, Video } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition, type DragEvent } from "react";
import { useShell } from "@/components/shell/shell-context";
import { ClientDot } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { clientPalette } from "@/config/client-colors";
import { dayMonthLabel, monthGridSunday, weekdayLabel } from "@/lib/dates";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setDeliverableDate } from "../actions";
import type { BoardDeliverable } from "../queries";
import { deliverableLabel } from "../schemas";
import { useDeliverableSheet } from "./deliverable-sheet";
import type { CalendarMeeting } from "./month-calendar";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ChipState = "plan" | "prod" | "appr" | "sched" | "done";

function chipState(status: BoardDeliverable["status"]): ChipState {
  if (status === "planejar") return "plan";
  if (status === "em_aprovacao" || (status as string) === "ajuste") return "appr";
  if (status === "aprovado" || (status as string) === "agendado") return "sched";
  if (status === "publicado") return "done";
  return "prod";
}

function chipStyle(state: ChipState, cor: number) {
  const p = clientPalette(cor);
  switch (state) {
    case "plan":
      return { background: "#FFFFFF", color: "#3E4656", border: "1.5px dashed #B8BFCC" };
    case "appr":
      return { background: "#FFE9D6", color: "#8A3A06", border: "1.5px solid #C2410C" };
    default:
      return { background: p.tonal, color: "#1D2433", border: "1.5px solid transparent" };
  }
}

export function Legend() {
  const items = [
    { label: "Planejado", el: <span className="size-3 rounded-[4px] border-2 border-dashed border-[#8A93A3]" /> },
    { label: "Em aprovação ou ajuste", el: <span className="size-3 rounded-[4px] border-2 border-late bg-late-tonal" /> },
    { label: "Aprovado e agendado", el: <span className="size-3 rounded-[4px] bg-[#8A93A3]" /> },
    { label: "Publicado", el: <Check className="size-3.5 text-ok" aria-hidden /> },
  ];
  return (
    <ul className="flex flex-col gap-2 text-sm text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.el}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Chip({ item, onOpen, draggable = true }: { item: BoardDeliverable; onOpen: () => void; draggable?: boolean }) {
  const state = chipState(item.status);
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      title={`${item.client.nome}: ${deliverableLabel(item)}`}
      className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-xs leading-tight font-semibold hover:brightness-95"
      style={chipStyle(state, item.client.cor)}
    >
      <ClientDot color={item.client.cor} className="size-2" />
      <span className={cn("min-w-0 flex-1 truncate", !item.titulo && "italic")}>{deliverableLabel(item)}</span>
      {state === "done" ? <Check className="size-3 shrink-0 text-ok" aria-label="publicado" /> : null}
    </button>
  );
}

export function EditorialCalendar({
  month,
  view,
  weekStart,
  items,
  meetings,
}: {
  month: string;
  view: "mes" | "semana" | "lista";
  weekStart: string;
  items: BoardDeliverable[];
  meetings: CalendarMeeting[];
}) {
  const { workspace, clients } = useShell();
  const sheet = useDeliverableSheet();
  const today = todayISO();
  const [hiddenClients, setHiddenClients] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [overDay, setOverDay] = useState<string | null>(null);
  const [, start] = useTransition();

  const visible = useMemo(
    () =>
      items
        .map((i) => (moved[i.id] ? { ...i, data_publicacao: moved[i.id] } : i))
        .filter((i) => !hiddenClients.has(i.client.id)),
    [items, moved, hiddenClients],
  );
  const shownClients = clients.filter((c) => c.status !== "encerrado" && items.some((i) => i.client.id === c.id));

  function drop(e: DragEvent, day: string) {
    e.preventDefault();
    setOverDay(null);
    const id = e.dataTransfer.getData("text/plain");
    const item = items.find((i) => i.id === id);
    if (!item || (moved[id] ?? item.data_publicacao) === day) return;
    const previous = moved[id] ?? item.data_publicacao;
    setMoved((m) => ({ ...m, [id]: day }));
    start(async () => {
      const r = await setDeliverableDate({ workspaceId: workspace.id, id, date: day });
      if ("error" in r && r.error) {
        toast.error(r.error);
        setMoved((m) => ({ ...m, [id]: previous ?? "" }));
      } else toast.success(`Movido para ${dayMonthLabel(day)}.`);
    });
  }

  const days =
    view === "semana"
      ? Array.from({ length: 7 }, (_, i) => {
          const d = new Date(`${weekStart}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + i);
          return d.toISOString().slice(0, 10);
        })
      : monthGridSunday(month).days;

  const filters = (
    <aside className="flex flex-col gap-5 lg:w-56 lg:shrink-0">
      {shownClients.length ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-sm font-semibold text-muted">Mostrar clientes</legend>
          {shownClients.map((c) => (
            <Checkbox
              key={c.id}
              checked={!hiddenClients.has(c.id)}
              onChange={(e) => {
                const on = e.currentTarget.checked;
                setHiddenClients((h) => {
                  const n = new Set(h);
                  if (on) n.delete(c.id);
                  else n.add(c.id);
                  return n;
                });
              }}
              label={
                <span className="inline-flex items-center gap-2 text-base font-medium">
                  <ClientDot color={c.cor} />
                  {c.nome}
                </span>
              }
            />
          ))}
        </fieldset>
      ) : null}
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Status</p>
        <Legend />
      </div>
    </aside>
  );

  if (view === "lista") {
    const inMonth = visible
      .filter((i) => i.data_publicacao?.startsWith(month))
      .sort((a, b) => (a.data_publicacao ?? "").localeCompare(b.data_publicacao ?? ""));
    const byDay = new Map<string, BoardDeliverable[]>();
    for (const i of inMonth) byDay.set(i.data_publicacao as string, [...(byDay.get(i.data_publicacao as string) ?? []), i]);
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        {filters}
        <div className="min-w-0 flex-1 rounded-card bg-surface p-[22px]">
          {byDay.size === 0 ? (
            <EmptyState title="Nenhum post neste mês" description="Use Planejar o mês para criar os posts do pacote de cada cliente." />
          ) : (
            <ol className="flex flex-col gap-5">
              {[...byDay.entries()].map(([day, list]) => (
                <li key={day}>
                  <h3 className={cn("mb-2 font-display text-lg", day === today && "text-today-ink")}>
                    {weekdayLabel(day)}, {dayMonthLabel(day)}
                    {day === today ? " (hoje)" : ""}
                  </h3>
                  <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                    {list.map((i) => (
                      <li key={i.id}>
                        <Chip item={i} onOpen={() => sheet.open(i.id)} draggable={false} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {filters}
      <div className="min-w-0 flex-1 overflow-x-auto rounded-card bg-surface p-3">
        <div className={cn("grid min-w-[760px] grid-cols-7 gap-1.5", view === "semana" && "min-w-[640px]")}>
          {weekdays.map((w) => (
            <div key={w} className="px-2.5 py-1.5 text-sm font-semibold text-muted">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = view === "semana" || day.startsWith(month);
            const dayItems = visible.filter((i) => i.data_publicacao === day);
            const dayMeetings = meetings.filter((m) => m.date === day && !hiddenClients.has(m.client.id));
            const limit = view === "semana" || expanded === day ? 99 : 3;
            const extra = dayItems.length - limit;
            const isToday = day === today;
            return (
              <div
                key={day}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverDay(day);
                }}
                onDragLeave={() => setOverDay((d) => (d === day ? null : d))}
                onDrop={(e) => drop(e, day)}
                className={cn(
                  "flex flex-col gap-[5px] rounded-input p-2",
                  view === "semana" ? "min-h-96" : "min-h-[132px]",
                  !inMonth ? "bg-surface-2" : isToday ? "bg-today-tonal outline-2 -outline-offset-2 outline-today-strong" : "bg-background",
                  overDay === day && "outline-2 -outline-offset-2 outline-accent",
                )}
              >
                <span
                  className={cn(
                    "px-0.5 font-display text-md",
                    !inMonth ? "text-faint" : isToday ? "text-today-ink" : "text-ink",
                  )}
                >
                  {Number(day.slice(8))}
                  <span className="sr-only"> de {dayMonthLabel(day)}</span>
                </span>
                {dayMeetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/w/${workspace.slug}/clientes/${m.client.id}/reunioes/${m.id}`}
                    className="flex items-center gap-1 rounded-lg bg-accent-tonal px-1.5 py-1 text-xs font-semibold text-accent-tonal-ink"
                  >
                    <Video className="size-3 shrink-0" aria-hidden />
                    <span className="tabular">{m.time}</span>
                    <span className="truncate">{m.titulo}</span>
                  </Link>
                ))}
                {dayItems.slice(0, limit).map((i) => (
                  <Chip key={i.id} item={i} onOpen={() => sheet.open(i.id)} />
                ))}
                {extra > 0 ? (
                  <button type="button" onClick={() => setExpanded(day)} className="px-1.5 text-left text-xs font-semibold text-muted hover:text-ink">
                    +{extra} {extra === 1 ? "post" : "posts"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-xs text-muted">Arraste um post para outro dia para mudar a data de publicação.</p>
      </div>
    </div>
  );
}
