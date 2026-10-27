import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewDeliverableButton } from "@/components/shell/shell-actions";
import { BoardFilters, PeriodNav } from "@/features/deliverables/components/board-filters";
import { MonthCalendar } from "@/features/deliverables/components/month-calendar";
import { getBoardDeliverables } from "@/features/deliverables/queries";
import { getCalendarMeetings } from "@/features/meetings/calendar-queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { monthGrid, monthLabel, shiftMonth } from "@/lib/dates";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage({ params, searchParams }: PageProps<"/w/[slug]/calendario">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  const thisMonth = todayISO().slice(0, 7);
  const month = typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes) ? query.mes : thisMonth;
  const clientId = typeof query.cliente === "string" && query.cliente ? query.cliente : undefined;
  const formato = typeof query.formato === "string" && query.formato ? query.formato : undefined;
  const { start, end } = monthGrid(month);

  const [items, meetings] = await Promise.all([
    getBoardDeliverables(workspace.id, { clientId, formato, from: start, to: end }),
    getCalendarMeetings(workspace.id, start, end, clientId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendário"
        description="Publicações e reuniões do mês."
        action={<NewDeliverableButton />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav
          param="mes"
          prev={shiftMonth(month, -1)}
          next={shiftMonth(month, 1)}
          todayValue={thisMonth}
          label={monthLabel(month)}
        />
        <BoardFilters members={[]} showMember={false} />
      </div>
      <MonthCalendar month={month} items={items} meetings={meetings} />
    </div>
  );
}
