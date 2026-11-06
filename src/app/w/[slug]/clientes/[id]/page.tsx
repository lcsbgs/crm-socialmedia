import {
  Banknote,
  CalendarClock,
  CircleCheck,
  FileText,
  Hourglass,
  KanbanSquare,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Scale,
  ThumbsUp,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import { NewDeliverableButton, NewTaskButton } from "@/components/shell/shell-actions";
import { ClientAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientForm } from "@/features/clients/components/client-form";
import { DeleteClientForm } from "@/features/clients/components/record/delete-client";
import { ClientStatusBadge } from "@/features/clients/components/status-badge";
import {
  getClient,
  getClientMonthSummary,
  getClientTimeline,
  getNextDuePayment,
} from "@/features/clients/queries";
import { contactSchema, linkSchema } from "@/features/clients/schemas";
import { PeriodNav } from "@/features/deliverables/components/board-filters";
import { DeliverableBoard } from "@/features/deliverables/components/deliverable-board";
import { DeliverableList } from "@/features/deliverables/components/deliverable-list";
import { MonthCalendar } from "@/features/deliverables/components/month-calendar";
import { countPendingApprovals, getBoardDeliverables } from "@/features/deliverables/queries";
import { PaymentRow } from "@/features/finance/components/payment-row";
import { getClientPaymentViews } from "@/features/finance/queries";
import { getCalendarMeetings } from "@/features/meetings/calendar-queries";
import { NewMeetingForm } from "@/features/meetings/components/new-meeting-form";
import { getClientMeetings } from "@/features/meetings/queries";
import { toLocalInput } from "@/features/meetings/schemas";
import { getPackages } from "@/features/packages/queries";
import { describeItems } from "@/features/packages/schemas";
import { PortalShare } from "@/features/portal/components/portal-share";
import { deleteScopeRequest, setScopeStatus } from "@/features/scope/actions";
import { ScopeForm } from "@/features/scope/components/scope-form";
import { getClientScopeRequests } from "@/features/scope/queries";
import { scopeStatusLabels } from "@/features/scope/schemas";
import { TaskList } from "@/features/tasks/components/task-list";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { monthEndISO, monthGrid, monthLabel, shiftMonth, spDate, spTime } from "@/lib/dates";
import { publicEnv } from "@/lib/env";
import { formatBRL, formatDate, formatRelativeDay, formatRelativeTime, plural, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Cliente" };

const tabs = [
  { id: "visao", label: "Visão geral" },
  { id: "entregas", label: "Entregas" },
  { id: "calendario", label: "Calendário" },
  { id: "reunioes", label: "Reuniões" },
  { id: "financeiro", label: "Financeiro" },
  { id: "escopo", label: "Escopo" },
  { id: "timeline", label: "Linha do tempo" },
] as const;

type Tab = (typeof tabs)[number]["id"] | "editar";
type ClientRow = NonNullable<Awaited<ReturnType<typeof getClient>>>;

export default async function ClientPage({ params, searchParams }: PageProps<"/w/[slug]/clientes/[id]">) {
  const [{ slug, id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const workspace = await getWorkspaceBySlug(slug);
  const client = await getClient(workspace.id, id);
  if (!client) notFound();

  const aba = (typeof query.aba === "string" ? query.aba : "visao") as Tab;
  const contatos = z.array(contactSchema).catch([]).parse(client.contatos);
  const [pendingApprovals, nextDue] = await Promise.all([
    countPendingApprovals(workspace.id, id),
    getNextDuePayment(workspace.id, id),
  ]);
  const today = todayISO();
  const base = `/w/${slug}/clientes/${id}`;
  const month =
    typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes) ? query.mes : today.slice(0, 7);

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <nav aria-label="Trilha" className="text-sm text-muted">
          <Link href={`/w/${slug}/clientes`} className="hover:text-ink">
            Clientes
          </Link>
          <span aria-hidden> / </span>
          <span className="text-ink">{client.nome}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ClientAvatar name={client.nome} color={client.cor ?? 0} size="lg" />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-xl">
                <span className="truncate">{client.nome}</span>
                <ClientStatusBadge status={client.status} />
              </h1>
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <Meta label="Pacote" value={client.package?.nome ?? "Sem pacote"} />
                {client.valor_mensal ? (
                  <Meta label="Valor" value={`${formatBRL(client.valor_mensal)}/mês`} numeric />
                ) : null}
                {nextDue ? (
                  <Meta
                    label="Próximo vencimento"
                    value={
                      nextDue.vencimento < today
                        ? `atrasado desde ${formatDate(nextDue.vencimento)}`
                        : `vence ${formatRelativeDay(nextDue.vencimento)}`
                    }
                    tone={nextDue.vencimento < today ? "late" : undefined}
                    numeric
                  />
                ) : null}
              </dl>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PortalShare
              workspaceId={workspace.id}
              clientId={client.id}
              url={`${publicEnv.NEXT_PUBLIC_APP_URL}/p/${client.portal_token}`}
              contactName={contatos[0]?.nome ?? ""}
              contactPhone={contatos[0]?.telefone || null}
              pending={pendingApprovals}
            />
            <NewDeliverableButton clientId={client.id} />
            <Link href={`${base}?aba=reunioes`} className={buttonClasses("secondary", "sm")}>
              <Plus aria-hidden />
              Nova reunião
            </Link>
            <Link
              href={`${base}?aba=editar`}
              aria-label="Editar dados"
              className={buttonClasses("ghost", "icon")}
            >
              <Pencil aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <nav
        aria-label="Seções do cliente"
        className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        <ul className="flex gap-1 border-b border-border text-base">
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id === "visao" ? base : `${base}?aba=${t.id}`}
                aria-current={aba === t.id ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-2.5 py-2 whitespace-nowrap",
                  aba === t.id
                    ? "border-accent font-medium text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {aba === "editar" ? (
        <EditTab workspaceId={workspace.id} slug={slug} client={client} />
      ) : aba === "entregas" ? (
        <DeliverablesTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "calendario" ? (
        <CalendarTab workspaceId={workspace.id} clientId={id} month={month} />
      ) : aba === "reunioes" ? (
        <MeetingsTab workspaceId={workspace.id} clientId={id} slug={slug} />
      ) : aba === "financeiro" ? (
        <FinanceTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "escopo" ? (
        <ScopeTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "timeline" ? (
        <TimelineTab workspaceId={workspace.id} clientId={id} />
      ) : (
        <OverviewTab workspaceId={workspace.id} client={client} slug={slug} />
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  tone,
  numeric,
}: {
  label: string;
  value: string;
  tone?: "late";
  numeric?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <dt className="sr-only">{label}</dt>
      <dd className={cn(numeric && "tabular", tone === "late" && "text-late")}>{value}</dd>
    </div>
  );
}

// ------------------------------------------------------------
// Visão geral: resumo do mês + atributos (estilo registro)
// ------------------------------------------------------------

async function OverviewTab({
  workspaceId,
  client,
  slug,
}: {
  workspaceId: string;
  client: ClientRow;
  slug: string;
}) {
  const today = todayISO();
  const month = today.slice(0, 7);
  const [monthItems, upcomingAll, summary] = await Promise.all([
    getBoardDeliverables(workspaceId, { clientId: client.id, from: `${month}-01`, to: monthEndISO(month) }),
    getBoardDeliverables(workspaceId, { clientId: client.id, from: today }),
    getClientMonthSummary(workspaceId, client.id, month),
  ]);
  const contatos = z.array(contactSchema).catch([]).parse(client.contatos);
  const links = z.array(linkSchema).catch([]).parse(client.links);

  const inMonth = monthItems.filter((i) => i.data_publicacao?.startsWith(month));
  const published = inMonth.filter((i) => i.status === "publicado").length;
  const waiting = inMonth.filter((i) => i.status === "em_aprovacao").length;
  const late = inMonth.filter(
    (i) => i.data_publicacao && i.data_publicacao < today && !["publicado", "aprovado"].includes(i.status),
  ).length;
  const pct = inMonth.length ? Math.round((published / inMonth.length) * 100) : 0;
  const upcoming = upcomingAll
    .filter((i) => i.status !== "publicado")
    .sort((a, b) => (a.data_publicacao ?? "9").localeCompare(b.data_publicacao ?? "9"))
    .slice(0, 8);
  const payment = summary.payment;
  const paymentLate = payment && payment.status !== "pago" && payment.vencimento < today;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <Card>
          <CardHeader title={`Resumo de ${monthLabel(month).toLowerCase()}`} />
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  <span className="tabular font-medium">
                    {published} de {inMonth.length}
                  </span>{" "}
                  <span className="text-muted">entregas publicadas</span>
                </span>
                <span className="text-muted">
                  {[
                    waiting ? plural(waiting, "em aprovação", "em aprovação") : null,
                    late ? plural(late, "atrasada", "atrasadas") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Nada atrasado"}
                </span>
              </div>
              <div
                role="meter"
                aria-label="Entregas publicadas no mês"
                aria-valuemin={0}
                aria-valuemax={inMonth.length}
                aria-valuenow={published}
                className="h-1.5 overflow-hidden rounded-full bg-hover"
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <SummaryItem icon={Banknote} label="Mensalidade">
                {payment ? (
                  payment.status === "pago" ? (
                    <span>paga {payment.pago_em ? formatRelativeDay(payment.pago_em) : ""}</span>
                  ) : (
                    <span className={cn(paymentLate && "text-late")}>
                      <span className="tabular">{formatBRL(payment.valor)}</span>,{" "}
                      {paymentLate
                        ? `venceu ${formatRelativeDay(payment.vencimento)}`
                        : `vence ${formatRelativeDay(payment.vencimento)}`}
                    </span>
                  )
                ) : (
                  <span className="text-muted">não gerada</span>
                )}
              </SummaryItem>
              <SummaryItem icon={CalendarClock} label="Próxima reunião">
                {summary.nextMeeting ? (
                  <Link
                    href={`/w/${slug}/clientes/${client.id}/reunioes/${summary.nextMeeting.id}`}
                    className="hover:underline"
                  >
                    {formatRelativeDay(spDate(summary.nextMeeting.data))} às{" "}
                    {spTime(summary.nextMeeting.data)}
                  </Link>
                ) : (
                  <span className="text-muted">nenhuma marcada</span>
                )}
              </SummaryItem>
              <SummaryItem icon={Scale} label="Escopo extra">
                {summary.pendingScope ? (
                  <Link
                    href={`/w/${slug}/clientes/${client.id}?aba=escopo`}
                    className="text-waiting hover:underline"
                  >
                    {plural(summary.pendingScope, "pedido pendente", "pedidos pendentes")}
                  </Link>
                ) : (
                  <span className="text-muted">nada pendente</span>
                )}
              </SummaryItem>
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Próximas entregas"
            action={
              <Link
                href={`/w/${slug}/clientes/${client.id}?aba=entregas`}
                className="text-sm text-accent hover:underline"
              >
                Ver quadro
              </Link>
            }
          />
          <DeliverableList
            items={upcoming}
            empty="Nada planejado daqui para frente. Use Gerar mês em Clientes ou crie uma entrega."
          />
        </Card>

        <Card>
          <CardHeader title="Tarefas" action={<NewTaskButton clientId={client.id} />} />
          <TaskList
            workspaceId={workspaceId}
            tasks={summary.tasks}
            empty="Nenhuma tarefa aberta para este cliente."
          />
        </Card>
      </div>

      {/* Atributos do registro */}
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2.5 text-sm">
            <Attr label="Status">
              <ClientStatusBadge status={client.status} />
            </Attr>
            <Attr label="Segmento">{client.segmento || <span className="text-muted">Vazio</span>}</Attr>
            <Attr label="Pacote">
              {client.package ? (
                <span>
                  {client.package.nome}
                  <span className="block text-xs text-muted">{describeItems(client.package.itens)}</span>
                </span>
              ) : (
                <span className="text-muted">Sem pacote</span>
              )}
            </Attr>
            <Attr label="Valor mensal">
              <span className="tabular">
                {client.valor_mensal ? formatBRL(client.valor_mensal) : "Vazio"}
              </span>
            </Attr>
            <Attr label="Vencimento">
              {client.dia_vencimento ? (
                `Todo dia ${client.dia_vencimento}`
              ) : (
                <span className="text-muted">Vazio</span>
              )}
            </Attr>
            <Attr label="Início">
              <span className="tabular">
                {client.inicio_contrato ? formatDate(client.inicio_contrato, "long") : "Vazio"}
              </span>
            </Attr>
          </dl>
          <Link
            href={`/w/${slug}/clientes/${client.id}?aba=editar`}
            className="mt-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <Pencil className="size-3.5" aria-hidden />
            Editar dados
          </Link>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold">Contatos</h2>
          {contatos.length ? (
            <ul className="space-y-3 text-sm">
              {contatos.map((c, i) => (
                <li key={i} className="space-y-1">
                  <p>
                    <span className="font-medium">{c.nome || "Sem nome"}</span>
                    {c.cargo ? <span className="text-muted"> · {c.cargo}</span> : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {c.telefone ? (
                      <a
                        href={whatsappLink(c.telefone, "")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-muted hover:text-ink"
                      >
                        <MessageCircle className="size-3.5" aria-hidden />
                        <span className="tabular">{c.telefone}</span>
                      </a>
                    ) : null}
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex min-w-0 items-center gap-1 text-muted hover:text-ink"
                      >
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{c.email}</span>
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum contato.</p>
          )}
          {links.length ? (
            <>
              <h2 className="mt-4 mb-2 text-sm font-semibold">Links</h2>
              <ul className="space-y-1 text-sm">
                {links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      {l.label || l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold">Briefing</h2>
          <p className="text-sm whitespace-pre-line">
            {client.briefing || <span className="text-muted">Sem briefing ainda.</span>}
          </p>
          <h2 className="mt-4 mb-2 text-sm font-semibold">Tom de voz</h2>
          <p className="text-sm whitespace-pre-line">
            {client.tom_de_voz || <span className="text-muted">Não definido.</span>}
          </p>
        </Card>
      </aside>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Banknote;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

function Attr({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

// ------------------------------------------------------------
// Demais abas
// ------------------------------------------------------------

async function DeliverablesTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const items = await getBoardDeliverables(workspaceId, { clientId });
  return <DeliverableBoard items={items} showClient={false} clientId={clientId} />;
}

async function CalendarTab({
  workspaceId,
  clientId,
  month,
}: {
  workspaceId: string;
  clientId: string;
  month: string;
}) {
  const { start, end } = monthGrid(month);
  const [items, meetings] = await Promise.all([
    getBoardDeliverables(workspaceId, { clientId, from: start, to: end }),
    getCalendarMeetings(workspaceId, start, end, clientId),
  ]);
  const thisMonth = todayISO().slice(0, 7);
  return (
    <div className="space-y-3">
      <PeriodNav
        param="mes"
        prev={shiftMonth(month, -1)}
        next={shiftMonth(month, 1)}
        todayValue={thisMonth}
        label={monthLabel(month)}
      />
      <MonthCalendar month={month} items={items} meetings={meetings} />
    </div>
  );
}

async function EditTab({
  workspaceId,
  slug,
  client,
}: {
  workspaceId: string;
  slug: string;
  client: ClientRow;
}) {
  const packages = await getPackages(workspaceId);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card>
        <ClientForm
          workspaceId={workspaceId}
          slug={slug}
          packages={packages}
          client={{
            ...client,
            contatos: z.array(contactSchema).catch([]).parse(client.contatos),
            links: z.array(linkSchema).catch([]).parse(client.links),
          }}
        />
      </Card>
      <Card>
        <CardHeader
          title="Excluir cliente"
          description="Apaga o cliente com entregas, tarefas, cobranças e histórico. Para manter o histórico, mude o status para Encerrado."
        />
        <DeleteClientForm workspaceId={workspaceId} clientId={client.id} slug={slug} nome={client.nome} />
      </Card>
    </div>
  );
}

async function FinanceTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const payments = await getClientPaymentViews(workspaceId, clientId);
  const paid = payments.filter((p) => p.status === "pago").reduce((n, p) => n + Number(p.valor), 0);
  const open = payments.filter((p) => p.status !== "pago").reduce((n, p) => n + Number(p.valor), 0);
  return (
    <Card>
      <CardHeader
        title="Histórico de cobranças"
        description={
          payments.length ? (
            <span className="tabular">
              Recebido {formatBRL(paid)} · Em aberto {formatBRL(open)}
            </span>
          ) : undefined
        }
      />
      {payments.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Nenhuma cobrança ainda"
          description="As cobranças aparecem quando você gera o mês em Clientes."
        />
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((p) => (
            <PaymentRow key={p.id} workspaceId={workspaceId} payment={p} />
          ))}
        </ul>
      )}
    </Card>
  );
}

const scopeTone = { pendente: "warning", cobrado: "success", absorvido: "neutral" } as const;

async function ScopeTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const requests = await getClientScopeRequests(workspaceId, clientId);
  const total = (status: string) =>
    requests.filter((r) => r.status === status).reduce((acc, r) => acc + Number(r.valor_sugerido ?? 0), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader title="Novo pedido extra" description="Registre o que o cliente pediu fora do pacote." />
        <ScopeForm workspaceId={workspaceId} clientId={clientId} />
      </Card>
      <Card>
        <CardHeader
          title="Pedidos fora do escopo"
          description={
            requests.length ? (
              <span className="tabular">
                Cobrado {formatBRL(total("cobrado"))} · Absorvido {formatBRL(total("absorvido"))} · Pendente{" "}
                {formatBRL(total("pendente"))}
              </span>
            ) : undefined
          }
        />
        {requests.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Nenhum pedido extra"
            description="Quando o cliente pedir algo fora do pacote, registre aqui para não esquecer de cobrar."
          />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-base whitespace-pre-line">{r.descricao}</p>
                  <div className="flex items-center gap-2">
                    {r.valor_sugerido !== null ? (
                      <span className="tabular font-medium">{formatBRL(r.valor_sugerido)}</span>
                    ) : null}
                    <Badge tone={scopeTone[r.status]}>{scopeStatusLabels[r.status]}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">{formatRelativeTime(r.created_at)}</span>
                  {(["cobrado", "absorvido", "pendente"] as const)
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <form key={s} action={setScopeStatus}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <Button type="submit" variant="secondary" size="xs">
                          {s === "cobrado"
                            ? "Marcar como cobrado"
                            : s === "absorvido"
                              ? "Absorver"
                              : "Reabrir"}
                        </Button>
                      </form>
                    ))}
                  <form action={deleteScopeRequest}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="xs">
                      Excluir
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

const timelineIcons: Record<string, typeof CircleCheck> = {
  cliente_criado: UserPlus,
  contrato_inicio: FileText,
  tarefa_feita: CircleCheck,
  cobranca_gerada: Banknote,
  pagamento_recebido: Banknote,
  entrega_criada: KanbanSquare,
  entrega_em_aprovacao: Hourglass,
  entrega_aprovado: ThumbsUp,
  entrega_publicado: KanbanSquare,
  aprovacao_aprovado: ThumbsUp,
  aprovacao_ajuste: Wrench,
  reuniao: CalendarClock,
  escopo_pedido: Scale,
  escopo_cobrado: Scale,
  escopo_absorvido: Scale,
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

async function TimelineTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const events = await getClientTimeline(workspaceId, clientId);
  return (
    <Card className="max-w-3xl">
      {events.length === 0 ? (
        <EmptyState title="Nada por aqui ainda" />
      ) : (
        <ol className="space-y-0">
          {events.map((e, i) => {
            const Icon = timelineIcons[e.tipo ?? ""] ?? CircleCheck;
            const tone =
              e.tipo === "aprovacao_ajuste"
                ? "text-waiting"
                : e.tipo === "pagamento_recebido" || e.tipo === "aprovacao_aprovado"
                  ? "text-ok"
                  : "text-muted";
            return (
              <li key={`${e.tipo}-${e.ref_id}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                {i < events.length - 1 ? (
                  <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />
                ) : null}
                <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
                  <Icon className={cn("size-3.5", tone)} aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-base">{e.titulo}</p>
                  <p className="tabular text-xs text-muted">
                    {e.ocorreu_em ? dateTime.format(new Date(e.ocorreu_em)) : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

const meetingDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

async function MeetingsTab({
  workspaceId,
  clientId,
  slug,
}: {
  workspaceId: string;
  clientId: string;
  slug: string;
}) {
  const meetings = await getClientMeetings(workspaceId, clientId);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Nova reunião" description="Cole as anotações e gere a ata com IA depois." />
        <NewMeetingForm
          workspaceId={workspaceId}
          clientId={clientId}
          slug={slug}
          now={toLocalInput(new Date().toISOString())}
        />
      </Card>
      <Card>
        <CardHeader title="Reuniões" />
        {meetings.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhuma reunião registrada" />
        ) : (
          <ul className="divide-y divide-border">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/w/${slug}/clientes/${clientId}/reunioes/${m.id}`}
                  className="flex items-center justify-between gap-2 py-2.5 hover:bg-hover"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.titulo}</span>
                    <span className="tabular block text-sm text-muted">
                      {meetingDate.format(new Date(m.data))}
                    </span>
                  </span>
                  <Badge tone={m.ata_confirmada_em ? "success" : "neutral"}>
                    {m.ata_confirmada_em ? "Ata confirmada" : "Sem ata"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
