import { CalendarClock, Hourglass, Sun, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NewTaskButton } from "@/components/shell/shell-actions";
import { ClientAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskList } from "@/features/tasks/components/task-list";
import { getToday } from "@/features/today/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { formatBRL, formatRelativeDay, formatRelativeTime, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export default async function TodayPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const { today, groups, totals } = await getToday(workspace.id);

  const summary = [
    totals.lateTasks ? plural(totals.lateTasks, "tarefa atrasada", "tarefas atrasadas") : null,
    totals.tasks - totals.lateTasks
      ? plural(totals.tasks - totals.lateTasks, "para hoje", "para hoje")
      : null,
    totals.approvals ? plural(totals.approvals, "aprovação parada", "aprovações paradas") : null,
    totals.payments ? plural(totals.payments, "cobrança", "cobranças") : null,
    totals.meetings ? plural(totals.meetings, "reunião", "reuniões") : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Hoje"
        description={
          <span className="first-letter:uppercase">
            {longToday.format(new Date())}
            {summary.length ? ` · ${summary.join(", ")}` : ""}
          </span>
        }
        action={<NewTaskButton />}
      />

      {groups.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Sun}
            title="Dia limpo"
            description={
              <>
                Nada atrasado nem pendente para hoje. Se a rotina do mês ainda não foi gerada, faça isso em{" "}
                <Link href={`/w/${slug}/clientes`} className="text-accent hover:underline">
                  Clientes
                </Link>
                .
              </>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.clientId ?? "sem-cliente"} aria-label={g.nome}>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {g.clientId ? (
                  <>
                    <ClientAvatar name={g.nome} color={g.cor} size="sm" />
                    <Link href={`/w/${slug}/clientes/${g.clientId}`} className="hover:underline">
                      {g.nome}
                    </Link>
                  </>
                ) : (
                  <span className="text-muted">{g.nome}</span>
                )}
              </h2>

              <ul className="text-base">
                {g.meetings.map((m) => (
                  <Row key={m.id} icon={CalendarClock} tone="text-muted">
                    <Link
                      href={`/w/${slug}/clientes/${g.clientId}/reunioes/${m.id}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {m.titulo}
                    </Link>
                    <time className="tabular text-sm text-muted">{timeFormat.format(new Date(m.data))}</time>
                  </Row>
                ))}
                {g.payments.map((p) => {
                  const late = p.vencimento < today;
                  return (
                    <Row key={p.id} icon={Wallet} tone={late ? "text-late" : "text-waiting"}>
                      <Link
                        href={`/w/${slug}/financeiro`}
                        className="min-w-0 flex-1 truncate hover:underline"
                      >
                        Mensalidade <span className="tabular">{formatBRL(p.valor)}</span>
                      </Link>
                      <time className={cn("tabular text-sm", late ? "text-late" : "text-muted")}>
                        {late
                          ? `venceu ${formatRelativeDay(p.vencimento)}`
                          : `vence ${formatRelativeDay(p.vencimento)}`}
                      </time>
                    </Row>
                  );
                })}
                {g.approvals.map((d) => (
                  <Row key={d.id} icon={Hourglass} tone="text-waiting">
                    <Link
                      href={`/w/${slug}/clientes/${g.clientId}?aba=entregas`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {d.titulo}
                    </Link>
                    <span className="text-sm text-muted">
                      aguardando {formatRelativeTime(d.status_changed_at)}
                    </span>
                  </Row>
                ))}
              </ul>
              {g.tasks.length ? <TaskList workspaceId={workspace.id} tasks={g.tasks} empty="" /> : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Wallet;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex min-h-9 items-center gap-3 border-b border-border py-1.5">
      <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
      {children}
    </li>
  );
}
