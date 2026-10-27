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
import {
  getClient,
  getClientMonthTasks,
  getClientPayments,
  getClientTimeline,
} from "@/features/clients/queries";
import { contactSchema, linkSchema } from "@/features/clients/schemas";
import { KanbanBoard } from "@/features/deliverables/components/kanban-board";
import { countPendingApprovals, getClientDeliverables } from "@/features/deliverables/queries";
import { PortalShare } from "@/features/portal/components/portal-share";
import { publicEnv } from "@/lib/env";
import { describeItems } from "@/features/packages/schemas";
import { getPackages } from "@/features/packages/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { currentMonthISO, formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
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
  const pendingApprovals = await countPendingApprovals(workspace.id, id);
  const base = `/w/${slug}/clientes/${id}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href={`/w/${slug}/clientes`} className="text-sm text-muted hover:text-foreground">
          Clientes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {client.nome} <ClientStatusBadge status={client.status} />
            </h1>
            <p className="text-sm text-muted">
              {[
                client.segmento,
                client.package?.nome,
                client.valor_mensal ? `${formatBRL(client.valor_mensal)}/mês` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PortalShare
              workspaceId={workspace.id}
              clientId={client.id}
              url={`${publicEnv.NEXT_PUBLIC_APP_URL}/p/${client.portal_token}`}
              contactName={contatos[0]?.nome ?? ""}
              contactPhone={contatos[0]?.telefone || null}
              pending={pendingApprovals}
            />
            <Link href={`${base}?aba=editar`} className={buttonClasses("secondary", "sm")}>
              Editar dados
            </Link>
          </div>
        </div>
      </div>

      <nav aria-label="Seções do cliente" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-1 border-b border-border text-sm">
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id === "visao" ? base : `${base}?aba=${t.id}`}
                aria-current={aba === t.id ? "page" : undefined}
                className={cn(
                  "-mb-px block whitespace-nowrap border-b-2 px-3 py-2",
                  aba === t.id
                    ? "border-foreground font-medium"
                    : "border-transparent text-muted hover:text-foreground",
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
      ) : aba === "reunioes" || aba === "escopo" ? (
        <Card>
          <p className="text-sm text-muted">Esta seção chega nas próximas etapas.</p>
        </Card>
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

const paymentTone = { pago: "success", pendente: "neutral", atrasado: "danger" } as const;
const paymentLabel = { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado" } as const;

async function FinanceTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const payments = await getClientPayments(workspaceId, clientId);
  const today = todayISO();
  return (
    <Card>
      <CardHeader title="Cobranças" />
      {payments.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma cobrança gerada ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((p) => {
            const status = p.status === "pendente" && p.vencimento < today ? "atrasado" : p.status;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{formatMonth(p.competencia)}</p>
                  <p className="text-muted">
                    Vence {formatDate(p.vencimento)}
                    {p.pago_em ? ` · pago em ${formatDate(p.pago_em)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatBRL(p.valor)}</span>
                  <Badge tone={paymentTone[status]}>{paymentLabel[status]}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
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
