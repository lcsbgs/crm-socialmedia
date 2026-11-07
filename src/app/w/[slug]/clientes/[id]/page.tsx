import {
  Banknote,
  CalendarClock,
  CircleCheck,
  FileText,
  FolderOpen,
  Hourglass,
  AtSign,
  KanbanSquare,
  MessageCircle,
  NotebookPen,
  Pencil,
  Scale,
  ThumbsUp,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { NewDeliverableButton } from "@/components/shell/shell-actions";
import { AvatarStack, ClientAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedBar } from "@/components/ui/progress-bar";
import { Tabs } from "@/components/ui/tabs";
import { ClientForm } from "@/features/clients/components/client-form";
import { BrandKitEditor } from "@/features/clients/components/hub/brand-kit-editor";
import { SendPlanButton, TacitApprovalSelect } from "@/features/clients/components/hub/approval-settings";
import { BriefingLink } from "@/features/clients/components/hub/briefing-link";
import { ClientChannelsForm } from "@/features/clients/components/hub/client-channels-form";
import { ClientFileList } from "@/features/clients/components/hub/file-list";
import { ClientFileUploader } from "@/features/clients/components/hub/file-uploader";
import { OnboardingChecklist } from "@/features/clients/components/hub/onboarding-checklist";
import { pillarColors, StrategyEditor } from "@/features/clients/components/hub/strategy-editor";
import { TimelineNoteForm } from "@/features/clients/components/hub/timeline-note-form";
import { DeleteClientForm } from "@/features/clients/components/record/delete-client";
import { ClientStatusBadge } from "@/features/clients/components/status-badge";
import {
  getBrandKit,
  getChecklist,
  getClientAssigneeNames,
  getClientFiles,
  getClientStrategy,
} from "@/features/clients/hub-queries";
import { briefingQuestions } from "@/features/clients/hub-schemas";
import { getClient, getClientMonthSummary, getClientTimeline } from "@/features/clients/queries";
import { contactSchema, linkSchema } from "@/features/clients/schemas";
import { PeriodNav } from "@/features/deliverables/components/board-filters";
import { DeliverableBoard } from "@/features/deliverables/components/deliverable-board";
import { MonthCalendar } from "@/features/deliverables/components/month-calendar";
import { countPendingApprovals, getBoardDeliverables } from "@/features/deliverables/queries";
import { PaymentRow } from "@/features/finance/components/payment-row";
import { getClientPaymentViews } from "@/features/finance/queries";
import { getCalendarMeetings } from "@/features/meetings/calendar-queries";
import { NewMeetingForm } from "@/features/meetings/components/new-meeting-form";
import { getClientMeetings } from "@/features/meetings/queries";
import { toLocalInput } from "@/features/meetings/schemas";
import { getPackages } from "@/features/packages/queries";
import { PortalShare } from "@/features/portal/components/portal-share";
import { deleteScopeRequest, setScopeStatus } from "@/features/scope/actions";
import { ScopeForm } from "@/features/scope/components/scope-form";
import { getClientScopeRequests } from "@/features/scope/queries";
import { scopeStatusLabels } from "@/features/scope/schemas";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { monthEndISO, monthGrid, monthLabel, shiftMonth, spDate, spTime } from "@/lib/dates";
import { publicEnv } from "@/lib/env";
import { formatBRL, formatDate, formatRelativeDay, formatRelativeTime, plural, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { firstName, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Cliente" };

type Tab =
  | "visao"
  | "estrategia"
  | "calendario"
  | "producao"
  | "reunioes"
  | "arquivos"
  | "financeiro"
  | "escopo"
  | "relatorios"
  | "timeline"
  | "editar";
type ClientRow = NonNullable<Awaited<ReturnType<typeof getClient>>>;

export default async function ClientPage({ params, searchParams }: PageProps<"/w/[slug]/clientes/[id]">) {
  const [{ slug, id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const workspace = await getWorkspaceBySlug(slug);
  const client = await getClient(workspace.id, id);
  if (!client) notFound();

  const rawTab = typeof query.aba === "string" ? query.aba : "visao";
  const aba = (rawTab === "entregas" ? "producao" : rawTab) as Tab;
  const contatos = z.array(contactSchema).catch([]).parse(client.contatos);
  const [pendingApprovals, assignees] = await Promise.all([
    countPendingApprovals(workspace.id, id),
    getClientAssigneeNames(workspace.id, id),
  ]);
  const today = todayISO();
  const base = `/w/${slug}/clientes/${id}`;
  const month = typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes) ? query.mes : today.slice(0, 7);
  const canFinance = workspace.canManage;

  const tabs = [
    { value: "visao", label: "Visão geral" },
    { value: "estrategia", label: "Estratégia" },
    { value: "calendario", label: "Calendário" },
    { value: "producao", label: "Produção" },
    { value: "reunioes", label: "Reuniões" },
    { value: "arquivos", label: "Arquivos" },
    ...(canFinance ? [{ value: "financeiro", label: "Financeiro" }] : []),
    { value: "escopo", label: "Escopo" },
    { value: "relatorios", label: "Relatórios" },
    { value: "timeline", label: "Linha do tempo" },
  ].map((t) => ({ ...t, href: t.value === "visao" ? base : `${base}?aba=${t.value}` }));

  const nomes = assignees.map((a) => firstName(a.nome));
  const cuidam =
    nomes.length === 0
      ? "Sem responsável"
      : nomes.length === 1
        ? `${nomes[0]} cuida`
        : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)} cuidam`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <ClientAvatar name={client.nome} color={client.cor ?? 0} size="xl" />
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl">
                <span className="min-w-0 break-words">{client.nome}</span>
                <ClientStatusBadge status={client.status} />
              </h1>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-md text-ink-2">
                <li>
                  Pacote {client.package?.nome ?? "não definido"}
                  {canFinance && client.valor_mensal ? `, ${formatBRL(client.valor_mensal)}/mês` : ""}
                </li>
                {canFinance && client.dia_vencimento ? <li>Vence todo dia {client.dia_vencimento}</li> : null}
                {client.instagram_handle ? (
                  <li className="inline-flex items-center gap-1.5">
                    <AtSign className="size-4 text-muted" aria-hidden />@{client.instagram_handle}
                  </li>
                ) : null}
                {client.drive_folder_url ? (
                  <li>
                    <a href={client.drive_folder_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-accent-tonal-ink underline">
                      <FolderOpen className="size-4" aria-hidden />
                      Pasta no Drive
                    </a>
                  </li>
                ) : null}
                <li className="inline-flex items-center gap-2">
                  {assignees.length ? <AvatarStack people={assignees.map((a) => ({ name: a.nome }))} size="sm" /> : null}
                  {cuidam}
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`${base}?aba=reunioes`} className={buttonClasses("outline", "md")}>
              Nova reunião
            </Link>
            <NewDeliverableButton clientId={client.id} />
            <PortalShare
              workspaceId={workspace.id}
              clientId={client.id}
              url={`${publicEnv.NEXT_PUBLIC_APP_URL}/p/${client.portal_token}`}
              contactName={contatos[0]?.nome ?? ""}
              contactPhone={contatos[0]?.telefone || null}
              pending={pendingApprovals}
            />
            <Link href={`${base}?aba=editar`} aria-label="Editar dados do cliente" title="Editar dados do cliente" className={buttonClasses("ghost", "icon")}>
              <Pencil aria-hidden />
            </Link>
          </div>
        </div>
        <Tabs label="Seções do cliente" value={aba === "editar" ? "" : aba} items={tabs} />
      </header>

      {aba === "editar" ? (
        <EditTab workspaceId={workspace.id} slug={slug} client={client} />
      ) : aba === "estrategia" ? (
        <StrategyTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "producao" ? (
        <DeliverablesTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "calendario" ? (
        <div className="flex flex-col gap-4">
          <SendPlanButton
            clientId={id}
            month={month}
            monthName={monthLabel(month).split(" ")[0].toLowerCase()}
            status={await monthPlanStatus(id, month)}
            portalUrl={`${publicEnv.NEXT_PUBLIC_APP_URL}/p/${client.portal_token}`}
            phone={contatos[0]?.telefone || null}
            contato={contatos[0]?.nome ? firstName(contatos[0].nome) : ""}
          />
          <CalendarTab workspaceId={workspace.id} clientId={id} month={month} />
        </div>
      ) : aba === "reunioes" ? (
        <MeetingsTab workspaceId={workspace.id} clientId={id} slug={slug} />
      ) : aba === "arquivos" ? (
        <FilesTab workspaceId={workspace.id} client={client} />
      ) : aba === "financeiro" && canFinance ? (
        <FinanceTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "escopo" ? (
        <ScopeTab workspaceId={workspace.id} clientId={id} />
      ) : aba === "relatorios" ? (
        <EmptyState title="Relatórios mensais" description="O relatório do mês com métricas e leitura da IA aparece aqui quando as métricas forem coletadas." />
      ) : aba === "timeline" ? (
        <TimelineTab workspaceId={workspace.id} clientId={id} />
      ) : (
        <OverviewTab workspaceId={workspace.id} client={client} slug={slug} canFinance={canFinance} />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Visão geral
// ------------------------------------------------------------

async function OverviewTab({
  workspaceId,
  client,
  slug,
  canFinance,
}: {
  workspaceId: string;
  client: ClientRow;
  slug: string;
  canFinance: boolean;
}) {
  const today = todayISO();
  const month = today.slice(0, 7);
  const [monthItems, summary, strategy, kit, checklist, events, adjustments] = await Promise.all([
    getBoardDeliverables(workspaceId, { clientId: client.id, from: `${month}-01`, to: monthEndISO(month) }),
    getClientMonthSummary(workspaceId, client.id, month),
    getClientStrategy(workspaceId, client.id),
    getBrandKit(workspaceId, client.id),
    getChecklist(workspaceId, client),
    getClientTimeline(workspaceId, client.id),
    countAdjustments(workspaceId, client.id, month),
  ]);
  const contatos = z.array(contactSchema).catch([]).parse(client.contatos);
  const inMonth = monthItems.filter((i) => i.data_publicacao?.startsWith(month));
  const entregues = inMonth.filter((i) => i.status === "publicado" || i.status === "aprovado").length;
  const meeting = summary.nextMeeting && spDate(summary.nextMeeting.data) === today ? summary.nextMeeting : null;
  const pilares = strategy.strategy.pilares;
  const kitData = kit.kit;
  const onboardingDone = checklist.every((c) => c.done);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card aria-labelledby="h-mes">
          <CardHeader id="h-mes" title={`${monthLabel(month).split(" ")[0]} até agora`} />
          <dl className="grid gap-4 sm:grid-cols-3">
            <Stat label="Posts entregues" value={`${entregues} de ${inMonth.length}`} />
            <Stat label="Rodadas de ajuste" value={String(adjustments)} hint={adjustments ? "pedidas pelo cliente no mês" : "nenhuma no mês"} />
            <Stat
              label="Escopo extra"
              value={summary.pendingScope ? plural(summary.pendingScope, "pedido", "pedidos") : "nada"}
              hint={summary.pendingScope ? "a cobrar ou absorver" : undefined}
              href={summary.pendingScope ? `/w/${slug}/clientes/${client.id}?aba=escopo` : undefined}
            />
          </dl>
        </Card>

        {!onboardingDone ? (
          <Card aria-labelledby="h-onb">
            <CardHeader id="h-onb" title="Começo do trabalho" description="O que falta para o cliente rodar redondo." />
            <OnboardingChecklist workspaceId={workspaceId} clientId={client.id} items={checklist} />
          </Card>
        ) : null}

        <Card aria-labelledby="h-estr">
          <CardHeader
            id="h-estr"
            title="Estratégia"
            action={
              <Link href={`/w/${slug}/clientes/${client.id}?aba=estrategia`} className="text-base font-semibold text-accent-tonal-ink underline">
                {strategy.exists ? "Abrir estratégia completa" : "Montar estratégia"}
              </Link>
            }
          />
          {strategy.exists ? (
            <div className="flex flex-col gap-4">
              {strategy.strategy.objetivo ? (
                <div>
                  <p className="text-sm text-muted">Objetivo do trimestre</p>
                  <p className="text-lg font-bold">{strategy.strategy.objetivo}</p>
                </div>
              ) : null}
              {pilares.length ? (
                <div>
                  <p className="mb-2 text-sm text-muted">Pilares de conteúdo</p>
                  <SegmentedBar
                    label="Pilares de conteúdo"
                    segments={pilares.map((p, i) => ({ label: p.nome, value: p.pct, color: pillarColors[i % pillarColors.length] }))}
                  />
                </div>
              ) : null}
              {strategy.strategy.decisoes[0] ? (
                <p className="rounded-inner bg-accent-tonal px-4 py-3 text-md text-accent-tonal-ink">
                  Última decisão{strategy.strategy.decisoes[0].data ? ` em ${formatDate(strategy.strategy.decisoes[0].data)}` : ""}:{" "}
                  {strategy.strategy.decisoes[0].texto}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-md text-muted">Ainda sem estratégia. Defina objetivo, pilares e formatos para orientar o mês.</p>
          )}
        </Card>

        <Card aria-labelledby="h-kit">
          <CardHeader
            id="h-kit"
            title="Kit da marca"
            action={
              <Link href={`/w/${slug}/clientes/${client.id}?aba=arquivos`} className={buttonClasses("outline", "sm")}>
                {kit.shared ? "Ver link do kit" : "Compartilhar com designer"}
              </Link>
            }
          />
          {kit.exists ? (
            <dl className="grid gap-4 sm:grid-cols-[auto_1fr]">
              {kitData.cores.length ? (
                <>
                  <dt className="text-sm text-muted">Cores</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {kitData.cores.map((c) => (
                      <span key={c.hex + c.nome} title={c.nome || c.hex} className="size-8 rounded-lg border border-border" style={{ backgroundColor: c.hex }} />
                    ))}
                  </dd>
                </>
              ) : null}
              {kitData.tom.length ? (
                <>
                  <dt className="text-sm text-muted">Tom de voz</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {kitData.tom.map((t) => (
                      <Badge key={t} tone="accent">
                        {t}
                      </Badge>
                    ))}
                  </dd>
                </>
              ) : null}
              {kitData.evitar.length ? (
                <>
                  <dt className="text-sm text-muted">Nunca dizer</dt>
                  <dd className="text-md text-late-ink">{kitData.evitar.map((e) => `"${e}"`).join(", ")}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="text-md text-muted">Sem kit ainda. Cadastre cores, tom de voz e o que evitar em Arquivos.</p>
          )}
        </Card>
      </div>

      <aside className="flex flex-col gap-5">
        {meeting ? (
          <Card aria-labelledby="h-reuniao" className="bg-accent-tonal">
            <CardHeader id="h-reuniao" title={`Reunião de hoje, ${spTime(meeting.data)}`} />
            <p className="mb-3 text-md">{meeting.titulo}</p>
            <Link href={`/w/${slug}/clientes/${client.id}/reunioes/${meeting.id}`} className={buttonClasses("primary", "sm")}>
              Ver brief
            </Link>
          </Card>
        ) : null}

        <Card aria-labelledby="h-tempo">
          <CardHeader
            id="h-tempo"
            title="Linha do tempo"
            action={
              <Link href={`/w/${slug}/clientes/${client.id}?aba=timeline`} className="text-sm font-semibold text-accent-tonal-ink underline">
                Ver tudo
              </Link>
            }
          />
          {events.length ? (
            <ol className="flex flex-col gap-3">
              {events.slice(0, 5).map((e, i) => (
                <li key={`${e.tipo}-${e.ref_id}-${i}`} className="border-l-2 border-border pl-3">
                  <p className="text-base">{e.titulo}</p>
                  <p className="text-xs text-muted">{e.ocorreu_em ? formatRelativeTime(e.ocorreu_em) : ""}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Nada registrado ainda.</p>
          )}
        </Card>

        <Card aria-labelledby="h-contatos">
          <CardHeader id="h-contatos" title="Contatos" />
          {contatos.length ? (
            <ul className="flex flex-col gap-3">
              {contatos.map((c, i) => (
                <li key={i} className="flex items-center gap-3">
                  <ClientAvatar name={c.nome || "?"} color={client.cor ?? 0} size="md" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{c.nome}</b>
                    <span className="text-sm text-muted">{c.cargo || "contato"}</span>
                  </span>
                  {c.telefone ? (
                    <a href={whatsappLink(c.telefone, `Oi, ${firstName(c.nome)}!`)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${c.nome}`} className={buttonClasses("outline", "xs")}>
                      <MessageCircle aria-hidden />
                      WhatsApp
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum contato. Adicione em Editar dados.</p>
          )}
        </Card>

        {canFinance && summary.payment ? (
          <Card aria-labelledby="h-mensal">
            <CardHeader id="h-mensal" title="Mensalidade" />
            <p className="text-md">
              <span className="tabular font-bold">{formatBRL(summary.payment.valor)}</span>,{" "}
              {summary.payment.status === "pago"
                ? `paga ${summary.payment.pago_em ? formatRelativeDay(summary.payment.pago_em) : ""}`
                : summary.payment.vencimento < today
                  ? `venceu ${formatRelativeDay(summary.payment.vencimento)}`
                  : `vence ${formatRelativeDay(summary.payment.vencimento)}`}
            </p>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}

async function monthPlanStatus(clientId: string, month: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("month_plans").select("status").eq("client_id", clientId).eq("competencia", `${month}-01`).maybeSingle();
  return data?.status ?? null;
}

async function countAdjustments(workspaceId: string, clientId: string, month: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { count } = await supabase
    .from("approvals")
    .select("id, deliverable:deliverables!inner (client_id)", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("decisao", "ajuste")
    .eq("deliverable.client_id", clientId)
    .gte("created_at", new Date(`${month}-01T00:00:00-03:00`).toISOString());
  return count ?? 0;
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular font-display text-2xl">{value}</dd>
      {hint ? <dd className="text-sm text-muted">{hint}</dd> : null}
    </>
  );
  return href ? (
    <Link href={href} className="flex flex-col gap-0.5 rounded-inner bg-background p-4 hover:bg-hover">
      {body}
    </Link>
  ) : (
    <div className="flex flex-col gap-0.5 rounded-inner bg-background p-4">{body}</div>
  );
}

// ------------------------------------------------------------
// Estratégia
// ------------------------------------------------------------

async function StrategyTab({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const { strategy, updatedAt } = await getClientStrategy(workspaceId, clientId);
  return (
    <div className="max-w-4xl">
      {updatedAt ? <p className="mb-3 text-sm text-muted">Atualizada {formatRelativeTime(updatedAt)}.</p> : null}
      <StrategyEditor workspaceId={workspaceId} clientId={clientId} initial={strategy} />
    </div>
  );
}

// ------------------------------------------------------------
// Arquivos: kit da marca, briefing, canais e arquivos gerais
// ------------------------------------------------------------

async function FilesTab({ workspaceId, client }: { workspaceId: string; client: ClientRow }) {
  const [kit, marca, geral] = await Promise.all([
    getBrandKit(workspaceId, client.id),
    getClientFiles(workspaceId, client.id, "marca"),
    getClientFiles(workspaceId, client.id, "geral"),
  ]);
  const contatos = z.array(contactSchema).catch([]).parse(client.contatos);
  const briefingUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/b/${client.briefing_token}`;
  const respostas = z.record(z.string(), z.string()).catch({}).parse(client.briefing_respostas ?? {});

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        <BrandKitEditor
          workspaceId={workspaceId}
          clientId={client.id}
          initial={kit.kit}
          shared={kit.shared}
          shareUrl={kit.shareToken ? `${publicEnv.NEXT_PUBLIC_APP_URL}/k/${kit.shareToken}` : null}
        />
        <Card>
          <CardHeader
            title="Arquivos da marca"
            description="Logo, fotos e manual. Entram no link do kit."
            action={<ClientFileUploader workspaceId={workspaceId} clientId={client.id} categoria="marca" />}
          />
          <ClientFileList workspaceId={workspaceId} files={marca} />
        </Card>
        <Card>
          <CardHeader
            title="Outros arquivos"
            action={<ClientFileUploader workspaceId={workspaceId} clientId={client.id} categoria="geral" />}
          />
          <ClientFileList workspaceId={workspaceId} files={geral} />
        </Card>
      </div>
      <aside className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title="Briefing"
            description={
              client.briefing_respondido_em
                ? `Respondido ${formatRelativeTime(client.briefing_respondido_em)}.`
                : "Mande o link para o cliente responder pelo celular."
            }
          />
          <BriefingLink clientId={client.id} url={briefingUrl} phone={contatos[0]?.telefone || null} nome={contatos[0]?.nome ? firstName(contatos[0].nome) : ""} />
          {client.briefing_respondido_em ? (
            <dl className="mt-4 flex flex-col gap-3">
              {briefingQuestions
                .filter((q) => respostas[q.key])
                .map((q) => (
                  <div key={q.key}>
                    <dt className="text-sm text-muted">{q.label}</dt>
                    <dd className="text-md whitespace-pre-wrap">{respostas[q.key]}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </Card>
        <Card>
          <CardHeader title="Aprovação tácita" />
          <TacitApprovalSelect workspaceId={workspaceId} clientId={client.id} horas={client.aprovacao_tacita_horas} />
        </Card>
        <Card>
          <CardHeader title="Onde publica e pasta" />
          <ClientChannelsForm
            workspaceId={workspaceId}
            clientId={client.id}
            instagram={client.instagram_handle ?? ""}
            drive={client.drive_folder_url ?? ""}
          />
        </Card>
      </aside>
    </div>
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
  nota: NotebookPen,
  briefing: FileText,
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
      <div className="mb-5">
        <TimelineNoteForm workspaceId={workspaceId} clientId={clientId} />
      </div>
      {events.length === 0 ? (
        <EmptyState title="Nada por aqui ainda" />
      ) : (
        <ol className="space-y-0">
          {events.map((e, i) => {
            const Icon = timelineIcons[e.tipo ?? ""] ?? CircleCheck;
            const tone =
              e.tipo === "aprovacao_ajuste"
                ? "text-late"
                : e.tipo === "pagamento_recebido" || e.tipo === "aprovacao_aprovado"
                  ? "text-ok"
                  : "text-muted";
            return (
              <li key={`${e.tipo}-${e.ref_id}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                {i < events.length - 1 ? (
                  <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-border" />
                ) : null}
                <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background">
                  <Icon className={cn("size-4", tone)} aria-hidden />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-md">{e.titulo}</p>
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
