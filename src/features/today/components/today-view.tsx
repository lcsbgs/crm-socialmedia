"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  ExternalLink,
  Hourglass,
  KanbanSquare,
  MessageCircle,
  Send,
  SunMedium,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useShell } from "@/components/shell/shell-context";
import { ClientTag } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { setDeliverableDate } from "@/features/deliverables/actions";
import { markPaid } from "@/features/finance/actions";
import { postponeTask, setTaskDone } from "@/features/tasks/actions";
import { TaskSheet, type SheetTask } from "@/features/tasks/components/task-sheet";
import { formatBRL, formatRelativeDay, formatRelativeTime, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TodayItem, TodaySections } from "../queries";

const sectionMeta: { key: keyof TodaySections; title: string; hint?: string }[] = [
  { key: "atrasadas", title: "Atrasadas" },
  { key: "hoje", title: "Para hoje" },
  { key: "esperando", title: "Esperando o cliente", hint: "Aprovações paradas há 2 dias ou mais" },
  { key: "receber", title: "Para receber" },
  { key: "reunioes", title: "Reuniões de hoje" },
];

const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function tomorrowISO() {
  const t = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function TodayView({ sections }: { sections: TodaySections }) {
  const { workspace, clients } = useShell();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [sheetTask, setSheetTask] = useState<SheetTask | null>(null);
  const [, start] = useTransition();
  const base = `/w/${workspace.slug}`;

  // Esconde a linha na hora e confirma com o servidor; em erro, devolve.
  function act(
    key: string,
    fn: () => Promise<{ error?: string }>,
    done: string,
    undo?: () => Promise<unknown>,
  ) {
    setHidden((h) => new Set(h).add(key));
    start(async () => {
      const r = await fn();
      if (r.error) {
        toast.error(r.error);
        setHidden((h) => {
          const next = new Set(h);
          next.delete(key);
          return next;
        });
      } else {
        toast.success(done, undo ? { action: { label: "Desfazer", onClick: () => void undo() } } : undefined);
      }
    });
  }

  const visible = (items: TodayItem[]) => items.filter((i) => !hidden.has(`${i.kind}:${i.id}`));
  const total = sectionMeta.reduce((n, s) => n + visible(sections[s.key]).length, 0);

  if (total === 0) {
    return (
      <div className="rounded-card bg-surface">
        <EmptyState
          icon={SunMedium}
          title="Dia limpo"
          description="Nada atrasado, nada esperando por você. Bom momento para planejar as próximas entregas."
          action={
            <Link
              href={`${base}/producao`}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Ver entregas da semana
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sectionMeta.map(({ key, title, hint }) => {
        const items = visible(sections[key]);
        if (!items.length) return null;
        return (
          <section key={key} aria-labelledby={`sec-${key}`}>
            <h2 id={`sec-${key}`} className="mb-1 flex items-baseline gap-2 px-1 text-sm font-semibold">
              <span className={cn(key === "atrasadas" && "text-late")}>{title}</span>
              <span className="tabular font-normal text-muted">{items.length}</span>
              {hint ? <span className="hidden font-normal text-muted sm:inline">· {hint}</span> : null}
            </h2>
            <ul className="overflow-hidden rounded-card bg-surface">
              {items.map((item) => (
                <Row
                  key={`${item.kind}:${item.id}`}
                  item={item}
                  base={base}
                  onOpenTask={setSheetTask}
                  act={(fn, done, undo) => act(`${item.kind}:${item.id}`, fn, done, undo)}
                  workspaceId={workspace.id}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <TaskSheet
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        workspaceId={workspace.id}
        clients={clients}
      />
    </div>
  );
}

type Act = (fn: () => Promise<{ error?: string }>, done: string, undo?: () => Promise<unknown>) => void;

function Row({
  item,
  base,
  onOpenTask,
  act,
  workspaceId,
}: {
  item: TodayItem;
  base: string;
  onOpenTask: (t: SheetTask) => void;
  act: Act;
  workspaceId: string;
}) {
  const clientHref = item.client ? `${base}/clientes/${item.client.id}` : null;

  if (item.kind === "task") {
    const late = !!item.date && item.date < todayString();
    const open = () =>
      onOpenTask({ id: item.id, titulo: item.titulo, date: item.date, clientId: item.client?.id ?? null });
    return (
      <Line
        lead={
          <button
            type="button"
            role="checkbox"
            aria-checked={false}
            aria-label={`Concluir ${item.titulo}`}
            onClick={() =>
              act(
                () => setTaskDone({ workspaceId, id: item.id, done: true }),
                "Tarefa concluída",
                () => setTaskDone({ workspaceId, id: item.id, done: false }),
              )
            }
            className="flex size-4 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--muted)_60%,transparent)] hover:border-accent hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
          />
        }
        title={
          <button type="button" onClick={open} className="min-w-0 truncate text-left hover:underline">
            {item.titulo}
          </button>
        }
        client={item.client}
        meta={item.date ? <DateLabel date={item.date} late={late} /> : null}
        actions={
          <>
            <IconAction
              label="Concluir"
              onClick={() =>
                act(
                  () => setTaskDone({ workspaceId, id: item.id, done: true }),
                  "Tarefa concluída",
                  () => setTaskDone({ workspaceId, id: item.id, done: false }),
                )
              }
            >
              <Check />
            </IconAction>
            <IconAction
              label="Adiar para amanhã"
              onClick={() => act(() => postponeTask({ workspaceId, id: item.id }), "Adiada para amanhã")}
            >
              <ArrowRight />
            </IconAction>
            <span className="max-sm:hidden">
              <IconAction label="Abrir" onClick={open}>
                <ExternalLink />
              </IconAction>
            </span>
          </>
        }
      />
    );
  }

  if (item.kind === "deliverable") {
    const href = `?entrega=${item.id}`;
    return (
      <Line
        lead={<KanbanSquare className="size-4 text-muted" aria-hidden />}
        title={
          <Link href={href} className="min-w-0 truncate hover:underline">
            {item.titulo}
          </Link>
        }
        client={item.client}
        meta={<DateLabel date={item.date} late={item.date < todayString()} prefix="publicar " />}
        actions={
          <>
            <IconAction
              label="Adiar para amanhã"
              onClick={() =>
                act(
                  () => setDeliverableDate({ workspaceId, id: item.id, date: tomorrowISO() }),
                  "Publicação adiada para amanhã",
                )
              }
            >
              <ArrowRight />
            </IconAction>
            <IconLink label="Abrir" href={href}>
              <ExternalLink />
            </IconLink>
          </>
        }
      />
    );
  }

  if (item.kind === "approval") {
    const href = `?entrega=${item.id}`;
    return (
      <Line
        lead={<Hourglass className="size-4 text-waiting" aria-hidden />}
        title={
          <Link href={href} className="min-w-0 truncate hover:underline">
            {item.titulo}
          </Link>
        }
        client={item.client}
        meta={<span className="text-sm text-muted">enviada {formatRelativeTime(item.since)}</span>}
        actions={
          <>
            <TextAction href={item.resendUrl} icon={<Send />}>
              Reenviar link
            </TextAction>
            <IconLink label="Abrir" href={href}>
              <ExternalLink />
            </IconLink>
          </>
        }
      />
    );
  }

  if (item.kind === "payment") {
    return (
      <Line
        lead={<Wallet className={cn("size-4", item.late ? "text-late" : "text-waiting")} aria-hidden />}
        title={
          <Link href={`${clientHref}?aba=financeiro`} className="min-w-0 truncate hover:underline">
            {item.titulo} <span className="tabular text-muted">· {formatBRL(item.valor)}</span>
          </Link>
        }
        client={item.client}
        meta={<DateLabel date={item.date} late={item.late} prefix={item.late ? "venceu " : "vence "} />}
        actions={
          <>
            <TextAction href={item.chargeUrl} icon={<MessageCircle />}>
              Cobrar no WhatsApp
            </TextAction>
            <TextButton
              icon={<Check />}
              onClick={() => act(() => markPaid({ workspaceId, id: item.id }), "Marcada como paga")}
            >
              Marcar como paga
            </TextButton>
          </>
        }
      />
    );
  }

  // Reunião
  return (
    <Line
      lead={<CalendarClock className="size-4 text-muted" aria-hidden />}
      title={
        <Link href={`${clientHref}/reunioes/${item.id}`} className="min-w-0 truncate hover:underline">
          {item.titulo}
        </Link>
      }
      client={item.client}
      meta={<time className="tabular text-sm text-muted">{time.format(new Date(item.at))}</time>}
      actions={
        <IconLink label="Abrir" href={`${clientHref}/reunioes/${item.id}`}>
          <ExternalLink />
        </IconLink>
      }
    />
  );
}

function todayString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function Line({
  lead,
  title,
  client,
  meta,
  actions,
}: {
  lead: ReactNode;
  title: ReactNode;
  client: { nome: string; cor: number } | null;
  meta: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="group relative flex min-h-10 items-center gap-3 border-b border-border px-3 py-1.5 last:border-0 hover:bg-hover">
      <span className="flex size-4 shrink-0 items-center justify-center">{lead}</span>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
        <div className="flex min-w-0 text-base sm:flex-1">{title}</div>
        {/* No celular, cliente e data ficam numa segunda linha. */}
        <div className="flex items-center gap-2 sm:contents">
          {client ? (
            <ClientTag name={client.nome} color={client.cor} className="shrink-0 max-sm:text-xs" />
          ) : null}
          <span className="shrink-0 sm:w-28 sm:text-right max-sm:[&_*]:text-xs">{meta}</span>
        </div>
      </div>
      {/* Ações: sempre visíveis no celular; no desktop aparecem no hover ou foco. */}
      <span className="flex shrink-0 items-center gap-0.5 sm:absolute sm:inset-y-0 sm:right-2 sm:bg-hover sm:pl-2 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {actions}
      </span>
    </li>
  );
}

function DateLabel({ date, late, prefix = "" }: { date: string; late: boolean; prefix?: string }) {
  return (
    <time dateTime={date} className={cn("tabular text-sm", late ? "text-late" : "text-muted")}>
      {prefix}
      {formatRelativeDay(date)}
    </time>
  );
}

const iconClass =
  "inline-flex size-7 items-center justify-center rounded-xl text-muted hover:bg-selected hover:text-ink [&_svg]:size-4";

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button type="button" aria-label={label} onClick={onClick} className={iconClass}>
        {children}
      </button>
    </Tooltip>
  );
}

function IconLink({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  return (
    <Tooltip content={label}>
      <Link href={href} aria-label={label} className={iconClass}>
        {children}
      </Link>
    </Tooltip>
  );
}

const textActionClass =
  "inline-flex h-7 items-center gap-1.5 rounded-xl border border-border bg-surface px-2 text-sm font-medium text-ink hover:bg-selected [&_svg]:size-3.5 [&_svg]:text-muted";

function TextAction({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={textActionClass}>
      {icon}
      <span className="max-sm:sr-only">{children}</span>
    </a>
  );
}

function TextButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={textActionClass}>
      {icon}
      <span className="max-sm:sr-only">{children}</span>
    </button>
  );
}

export function TodaySummary({ sections }: { sections: TodaySections }) {
  const parts = [
    sections.atrasadas.length ? plural(sections.atrasadas.length, "atrasada", "atrasadas") : null,
    sections.hoje.length ? `${sections.hoje.length} para hoje` : null,
    sections.esperando.length
      ? plural(sections.esperando.length, "esperando o cliente", "esperando o cliente")
      : null,
    sections.receber.length ? plural(sections.receber.length, "cobrança", "cobranças") : null,
    sections.reunioes.length ? plural(sections.reunioes.length, "reunião", "reuniões") : null,
  ].filter(Boolean);
  return parts.length ? <>{parts.join(" · ")}</> : <>Tudo em dia</>;
}
