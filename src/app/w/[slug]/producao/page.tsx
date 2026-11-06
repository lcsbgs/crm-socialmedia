import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewDeliverableButton } from "@/components/shell/shell-actions";
import { BoardFilters, PeriodNav, ViewSwitch } from "@/features/deliverables/components/board-filters";
import { DeliverableBoard } from "@/features/deliverables/components/deliverable-board";
import { WeekBoard } from "@/features/deliverables/components/week-board";
import { getBoardDeliverables, getMemberOptions } from "@/features/deliverables/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { addDaysISO, dayMonthLabel, startOfWeekISO } from "@/lib/dates";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Produção" };

const param = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function DeliverablesPage({ params, searchParams }: PageProps<"/w/[slug]/producao">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  const visao = param(query.visao) === "semana" ? "semana" : "quadro";
  const today = todayISO();
  const semanaParam = param(query.semana);
  const weekStart = startOfWeekISO(
    semanaParam && /^\d{4}-\d{2}-\d{2}$/.test(semanaParam) ? semanaParam : today,
  );
  const weekEnd = addDaysISO(weekStart, 6);

  const filters = {
    clientId: param(query.cliente),
    formato: param(query.formato),
    responsavelId: param(query.responsavel),
  };
  const [items, members] = await Promise.all([
    getBoardDeliverables(
      workspace.id,
      visao === "semana"
        ? { ...filters, from: weekStart, to: weekEnd }
        : // Quadro: do mês passado em diante, para a coluna Publicado não crescer sem fim.
          { ...filters, from: addDaysISO(today, -35) },
    ),
    getMemberOptions(workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Produção"
        description="Todos os clientes. Arraste para mudar a etapa ou, na semana, o dia de publicação."
        action={<NewDeliverableButton />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BoardFilters members={members} />
        <ViewSwitch
          current={visao}
          views={[
            { id: "quadro", label: "Quadro" },
            { id: "semana", label: "Semana" },
          ]}
        />
      </div>
      {visao === "semana" ? (
        <>
          <PeriodNav
            param="semana"
            prev={addDaysISO(weekStart, -7)}
            next={addDaysISO(weekStart, 7)}
            todayValue={startOfWeekISO(today)}
            label={`${dayMonthLabel(weekStart)} a ${dayMonthLabel(weekEnd)}`}
          />
          <WeekBoard items={items} weekStart={weekStart} />
        </>
      ) : (
        <DeliverableBoard items={items} />
      )}
    </div>
  );
}
