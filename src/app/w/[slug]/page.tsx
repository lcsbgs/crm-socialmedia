import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { TaskList } from "@/features/tasks/components/task-list";
import { getToday } from "@/features/today/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { formatBRL, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Hoje" };

const longToday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function TodayPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const { today, groups, totals, clients } = await getToday(workspace.id);

  const summary = [
    totals.meetings ? `${totals.meetings} reunião(ões)` : null,
    totals.tasks
      ? `${totals.tasks} tarefa(s)${totals.lateTasks ? `, ${totals.lateTasks} atrasada(s)` : ""}`
      : null,
    totals.approvals ? `${totals.approvals} entrega(s) esperando aprovação` : null,
    totals.payments ? `${totals.payments} cobrança(s) vencendo ou atrasada(s)` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted first-letter:uppercase">{longToday.format(new Date())}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
        <p className="text-sm text-muted">
          {summary.length ? summary.join(" · ") : "Tudo em dia. Bom trabalho."}
        </p>
      </div>

      <Card>
        <QuickTaskForm workspaceId={workspace.id} clients={clients} today={today} />
      </Card>

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Nada pendente para hoje. Se ainda não gerou a rotina do mês, faça isso em{" "}
            <Link href={`/w/${slug}/clientes`} className="underline">
              Clientes
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.clientId ?? "sem-cliente"}>
              <h2 className="mb-3 font-semibold">
                {g.clientId ? (
                  <Link href={`/w/${slug}/clientes/${g.clientId}`} className="hover:underline">
                    {g.nome}
                  </Link>
                ) : (
                  g.nome
                )}
              </h2>

              {g.meetings.length ? (
                <ul className="mb-3 space-y-1">
                  {g.meetings.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <Badge>Reunião {timeFormat.format(new Date(m.data))}</Badge>
                      <Link
                        href={`/w/${slug}/clientes/${g.clientId}/reunioes/${m.id}`}
                        className="truncate hover:underline"
                      >
                        {m.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {g.payments.length ? (
                <ul className="mb-3 space-y-1">
                  {g.payments.map((p) => {
                    const late = p.vencimento < today;
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Badge tone={late ? "danger" : "warning"}>
                            {late ? "Cobrança atrasada" : "Cobrança"}
                          </Badge>
                          {formatBRL(p.valor)}
                        </span>
                        <span className={late ? "text-danger" : "text-muted"}>
                          vence {formatDate(p.vencimento)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {g.approvals.length ? (
                <ul className="mb-3 space-y-1">
                  {g.approvals.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge tone="warning">Aprovação parada</Badge>
                        <Link
                          href={`/w/${slug}/clientes/${g.clientId}?aba=entregas`}
                          className="truncate hover:underline"
                        >
                          {d.titulo}
                        </Link>
                      </span>
                      <span className="shrink-0 text-muted">há {daysSince(d.status_changed_at)} dias</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {g.tasks.length ? <TaskList workspaceId={workspace.id} tasks={g.tasks} empty="" /> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
