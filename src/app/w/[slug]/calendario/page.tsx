import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { BoardFilters } from "@/features/deliverables/components/board-filters";
import { EditorialCalendar } from "@/features/deliverables/components/editorial-calendar";
import { PlanMonthButton } from "@/features/deliverables/components/plan-month-button";
import { getBoardDeliverables, getMemberOptions } from "@/features/deliverables/queries";
import { getCalendarMeetings } from "@/features/meetings/calendar-queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { addDaysISO, dayMonthLabel, monthGridSunday, monthLabel, shiftMonth } from "@/lib/dates";
import { plural, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Calendário" };

const p = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

function sundayOf(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return addDaysISO(iso, -d.getUTCDay());
}

export default async function CalendarPage({ params, searchParams }: PageProps<"/w/[slug]/calendario">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const month = p(query.mes) && /^\d{4}-\d{2}$/.test(p(query.mes)!) ? p(query.mes)! : thisMonth;
  const view = p(query.visao) === "semana" ? "semana" : p(query.visao) === "lista" ? "lista" : "mes";
  const semana = p(query.semana);
  const weekStart = sundayOf(semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : month === thisMonth ? today : `${month}-01`);
  const range = view === "semana" ? { start: weekStart, end: addDaysISO(weekStart, 6) } : monthGridSunday(month);
  const filters = { formato: p(query.formato), responsavelId: p(query.responsavel), clientId: p(query.cliente) };

  const [items, meetings, members] = await Promise.all([
    getBoardDeliverables(workspace.id, { ...filters, from: range.start, to: range.end }),
    getCalendarMeetings(workspace.id, range.start, range.end, filters.clientId),
    getMemberOptions(workspace.id),
  ]);
  const inMonth = items.filter((i) => i.data_publicacao?.startsWith(month));
  const nClients = new Set(inMonth.map((i) => i.client.id)).size;
  const next = shiftMonth(month, 1);
  const base = `/w/${slug}/calendario`;
  const qs = (extra: Record<string, string>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ mes: month, visao: view, ...filters, ...extra })) if (v) s.set(k, v);
    return `${base}?${s}`;
  };
  const prevHref = view === "semana" ? qs({ semana: addDaysISO(weekStart, -7), mes: addDaysISO(weekStart, -7).slice(0, 7) }) : qs({ mes: shiftMonth(month, -1) });
  const nextHref = view === "semana" ? qs({ semana: addDaysISO(weekStart, 7), mes: addDaysISO(weekStart, 7).slice(0, 7) }) : qs({ mes: next });
  const title = view === "semana" ? `${dayMonthLabel(weekStart)} a ${dayMonthLabel(addDaysISO(weekStart, 6))}` : monthLabel(month);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={prevHref} aria-label="Período anterior" className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface hover:bg-hover">
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="font-display text-3xl">{title}</h1>
        <Link href={nextHref} aria-label="Próximo período" className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface hover:bg-hover">
          <ChevronRight className="size-5" aria-hidden />
        </Link>
        <span className="text-md text-muted">
          {plural(inMonth.length, "post", "posts")} em {plural(nClients, "cliente", "clientes")}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-border bg-surface p-[3px]">
            <SegmentedControl
              label="Visão do calendário"
              value={view}
              size="sm"
              tone="dark"
              options={[
                { value: "mes", label: "Mês", href: qs({ visao: "mes" }) },
                { value: "semana", label: "Semana", href: qs({ visao: "semana" }) },
                { value: "lista", label: "Lista", href: qs({ visao: "lista" }) },
              ]}
            />
          </div>
          <PlanMonthButton workspaceId={workspace.id} month={next} label={`Planejar ${monthLabel(next).split(" ")[0].toLowerCase()}`} href={`${base}?mes=${next}`} />
        </div>
      </div>
      <BoardFilters members={members} />
      <EditorialCalendar month={month} view={view} weekStart={weekStart} items={items} meetings={meetings} />
    </div>
  );
}
