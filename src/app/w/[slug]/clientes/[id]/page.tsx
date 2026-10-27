import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { deleteClient } from "@/features/clients/actions";
import { ClientForm } from "@/features/clients/components/client-form";
import { ClientStatusBadge } from "@/features/clients/components/status-badge";
import { TaskList } from "@/features/tasks/components/task-list";
import { getClient, getClientMonthTasks, getClientTimeline, getNextDuePayment } from "@/features/clients/queries";
import { contactSchema, linkSchema } from "@/features/clients/schemas";
import { KanbanBoard } from "@/features/deliverables/components/kanban-board";
import { countPendingApprovals, getClientDeliverables } from "@/features/deliverables/queries";
import { PaymentRow } from "@/features/finance/components/payment-row";
import { getClientPaymentViews } from "@/features/finance/queries";
import { deleteScopeRequest, setScopeStatus } from "@/features/scope/actions";
import { ScopeForm } from "@/features/scope/components/scope-form";
import { getClientScopeRequests } from "@/features/scope/queries";
import { scopeStatusLabels } from "@/features/scope/schemas";
import { NewMeetingForm } from "@/features/meetings/components/new-meeting-form";
import { getClientMeetings } from "@/features/meetings/queries";
import { toLocalInput } from "@/features/meetings/schemas";
import { PortalShare } from "@/features/portal/components/portal-share";
import { publicEnv } from "@/lib/env";
import { describeItems } from "@/features/packages/schemas";
import { getPackages } from "@/features/packages/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { NewDeliverableButton } from "@/components/shell/shell-actions";
import { ClientAvatar } from "@/components/ui/avatar";
import {
  currentMonthISO,
  formatBRL,
  formatDate,
  formatMonth,
  formatRelativeDay,
  todayISO,
} from "@/lib/format";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

export const metadata: Metadata = { title: "Cliente" };

const tabs = [
  { id: "visao", label: "Visão geral" },
  { id: "entregas", label: "Entregas" },
  { id: "reunioes", label: "Reuniões" },
  { id: "financeiro", label: "Financeiro" },
  { id: "escopo", label: "Escopo" },
  { id: "timeline", label: "Linha do tempo" },
] as const;

type Tab = (typeof tabs)[number]["id"] | "editar";

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

  return (
    <div className="space-y-6">
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
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                <span className="truncate">{client.nome}</span>
                <ClientStatusBadge status={client.status} />
              </h1>
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {client.segmento ? <Meta label="Segmento" value={client.segmento} /> : null}
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
                        : formatRelativeDay(nextDue.vencimento)
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

      <nav aria-label="Seções do cliente" className="-mx-4 overflow-x-auto px-4">
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
      ) : aba === "financeiro" ? (
        <FinanceTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "timeline" ? (
        <TimelineTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "entregas" ? (
        <DeliverablesTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "reunioes" ? (
        <MeetingsTab workspaceId={workspace.id} clientId={id} slug={slug} />
      ) : aba === "escopo" ? (
        <ScopeTab workspaceId={workspace.id} clientId={id} />
      ) : (
        <OverviewTab workspaceId={workspace.id} client={client} />
      )}
    </div>
  );
}

type ClientRow = NonNullable<Awaited<ReturnType<typeof getClient>>>;

async function OverviewTab({ workspaceId, client }: { workspaceId: string; client: ClientRow }) {
  const competencia = currentMonthISO();
  const tasks = await getClientMonthTasks(workspaceId, client.id, competencia);
  const contatos = z.array(contactSchema).catch([]).parse(client.contatos);
  const links = z.array(linkSchema).catch([]).parse(client.links);
  const feitas = tasks.filter((t) => t.status === "feita").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader
          title={`Tarefas de ${formatMonth(competencia).toLowerCase()}`}
          description={tasks.length ? `${feitas} de ${tasks.length} concluídas.` : undefined}
        />
        <TaskList
          workspaceId={workspaceId}
          tasks={tasks}
          empty="Nenhuma tarefa neste mês. Use Gerar mês na lista de clientes."
        />
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Contrato" />
          <dl className="space-y-2 text-sm">
            <Row label="Pacote" value={client.package ? client.package.nome : "Sem pacote"} />
            {client.package ? (
              <p className="text-xs text-muted">{describeItems(client.package.itens)}</p>
            ) : null}
            <Row label="Valor mensal" value={formatBRL(client.valor_mensal)} />
            <Row label="Vencimento" value={client.dia_vencimento ? `Dia ${client.dia_vencimento}` : "-"} />
            <Row label="Início" value={formatDate(client.inicio_contrato, "long")} />
          </dl>
        </Card>
        {client.briefing || client.tom_de_voz ? (
          <Card>
            <CardHeader title="Briefing" />
            {client.briefing ? <p className="whitespace-pre-line text-sm">{client.briefing}</p> : null}
            {client.tom_de_voz ? (
              <p className="mt-3 text-sm">
                <span className="font-medium">Tom de voz: </span>
                {client.tom_de_voz}
              </p>
            ) : null}
          </Card>
        ) : null}
        {contatos.length || links.length ? (
          <Card>
            <CardHeader title="Contatos e links" />
            <ul className="space-y-2 text-sm">
              {contatos.map((c, i) => (
                <li key={i}>
                  <p className="font-medium">
                    {c.nome} {c.cargo ? <span className="font-normal text-muted">· {c.cargo}</span> : null}
                  </p>
                  <p className="text-muted">{[c.telefone, c.email].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
              {links.map((l, i) => (
                <li key={`l${i}`}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="underline">
                    {l.label || l.url}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
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
    <div className="mx-auto max-w-3xl space-y-6">
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
      <Card className="border-danger/40">
        <CardHeader
          title="Excluir cliente"
          description="Apaga o cliente com tarefas, cobranças e histórico. Para manter o histórico, mude o status para Encerrado."
        />
        <form action={deleteClient}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit" variant="danger">
            Excluir cliente
          </Button>
        </form>
      </Card>
    </div>
  );
}

async function FinanceTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const payments = await getClientPaymentViews(workspaceId, clientId);
  return (
    <Card>
      <CardHeader title="Cobranças" />
      {payments.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma cobrança gerada ainda.</p>
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
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader title="Novo pedido extra" description="Registre o que o cliente pediu fora do pacote." />
        <ScopeForm workspaceId={workspaceId} clientId={clientId} />
      </Card>
      <Card>
        <CardHeader
          title="Pedidos fora do escopo"
          description={
            requests.length
              ? `Cobrado: ${formatBRL(total("cobrado"))} · Absorvido: ${formatBRL(total("absorvido"))} · Pendente: ${formatBRL(total("pendente"))}`
              : undefined
          }
        />
        {requests.length === 0 ? (
          <p className="text-sm text-muted">Nenhum pedido extra registrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="whitespace-pre-line">{r.descricao}</p>
                  <div className="flex items-center gap-2">
                    {r.valor_sugerido !== null ? (
                      <span className="font-medium">{formatBRL(r.valor_sugerido)}</span>
                    ) : null}
                    <Badge tone={scopeTone[r.status]}>{scopeStatusLabels[r.status]}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["cobrado", "absorvido", "pendente"] as const)
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <form key={s} action={setScopeStatus}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <Button type="submit" variant="secondary" size="sm">
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
                    <Button type="submit" variant="ghost" size="sm">
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

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

async function TimelineTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const events = await getClientTimeline(workspaceId, clientId);
  return (
    <Card>
      <CardHeader title="Linha do tempo" />
      {events.length === 0 ? (
        <p className="text-sm text-muted">Nada por aqui ainda.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-4">
          {events.map((e, i) => (
            <li key={`${e.tipo}-${e.ref_id}-${i}`} className="relative">
              <span aria-hidden className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-border" />
              <p className="text-sm">{e.titulo}</p>
              <p className="text-xs text-muted">
                {e.ocorreu_em ? dateTime.format(new Date(e.ocorreu_em)) : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

async function DeliverablesTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const deliverables = await getClientDeliverables(workspaceId, clientId);
  return <KanbanBoard workspaceId={workspaceId} clientId={clientId} deliverables={deliverables} />;
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
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader title="Nova reunião" />
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
          <p className="text-sm text-muted">Nenhuma reunião registrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/w/${slug}/clientes/${clientId}/reunioes/${m.id}`}
                  className="flex items-center justify-between gap-2 py-3 text-sm hover:underline"
                >
                  <span>
                    <span className="font-medium">{m.titulo}</span>
                    <span className="block text-muted">{meetingDate.format(new Date(m.data))}</span>
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
