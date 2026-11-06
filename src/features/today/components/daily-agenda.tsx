"use client";

import { CalendarCheck, Check, MessageCircle, Send, SunMedium, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useShell } from "@/components/shell/shell-context";
import { ClientDot, UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { markPaid } from "@/features/finance/actions";
import { setTaskDone } from "@/features/tasks/actions";
import { formatBRL, formatRelativeTime, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { firstName, whatsappLink } from "@/lib/whatsapp";
import type { DailyAgenda, FazerItem, FeitoItem } from "../agenda";

function Section({
  id,
  title,
  meta,
  children,
  empty,
  isEmpty,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  empty: string;
  isEmpty: boolean;
}) {
  return (
    <Card aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 id={id} className="font-display text-xl">
          {title}
        </h2>
        {meta ? <span className="text-sm text-muted">{meta}</span> : null}
      </div>
      {isEmpty ? (
        <p className="rounded-inner border border-dashed border-border-dashed px-3.5 py-4 text-sm text-muted">{empty}</p>
      ) : (
        children
      )}
    </Card>
  );
}

function Sub({ children, tone }: { children: ReactNode; tone?: "late" }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-sm", tone === "late" ? "text-late-ink" : "text-muted")}>
      {children}
    </span>
  );
}

export function DailyAgendaView({ agenda, canSeeFinance }: { agenda: DailyAgenda; canSeeFinance: boolean }) {
  const { workspace } = useShell();
  const base = `/w/${workspace.slug}`;
  const [done, setDone] = useState<FeitoItem[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  const visible = <T extends { key: string }>(list: T[]) => list.filter((i) => !hidden.has(i.key));
  const fazer = visible(agenda.fazer);
  const falar = visible(agenda.falar);
  const dinheiro = visible(agenda.dinheiro);
  const feito = useMemo(() => [...done, ...agenda.feitoHoje.filter((f) => !done.some((d) => d.id === f.id))], [done, agenda.feitoHoje]);

  function hide(key: string) {
    setHidden((h) => new Set(h).add(key));
  }
  function unhide(key: string) {
    setHidden((h) => {
      const n = new Set(h);
      n.delete(key);
      return n;
    });
  }

  function completeTask(key: string, id: string, titulo: string, item: { client: FazerItem["client"]; responsavel: FazerItem["responsavel"] }) {
    hide(key);
    setDone((d) => [{ key: `feito:${id}`, kind: "feito", id, titulo, doneAt: new Date().toISOString(), ...item }, ...d]);
    start(async () => {
      const r = await setTaskDone({ workspaceId: workspace.id, id, done: true });
      if (r?.error) {
        toast.error(r.error);
        unhide(key);
        setDone((d) => d.filter((x) => x.id !== id));
      } else {
        toast.success("Feito. Foi para Feito hoje.", {
          action: {
            label: "Desfazer",
            onClick: () => {
              unhide(key);
              setDone((d) => d.filter((x) => x.id !== id));
              void setTaskDone({ workspaceId: workspace.id, id, done: false });
            },
          },
        });
      }
    });
  }

  function pay(key: string, id: string) {
    hide(key);
    start(async () => {
      const r = await markPaid({ workspaceId: workspace.id, id });
      if (r?.error) {
        toast.error(r.error);
        unhide(key);
      } else toast.success("Pagamento registrado.");
    });
  }

  const atrasados = fazer.filter((i) => i.atrasoDias > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
        <Section id="h-falar" title="Com quem falar" meta={plural(falar.length, "item", "itens")} isEmpty={!falar.length} empty="Nenhuma reunião nem resposta de cliente pedindo você hoje.">
          <ul className="flex flex-col gap-1.5">
            {falar.map((i) => {
              if (i.kind === "reuniao") {
                const href = `${base}/clientes/${i.client?.id}/reunioes/${i.id}`;
                return (
                  <li key={i.key} className={cn("flex items-center gap-3.5 rounded-inner", i.destaque ? "bg-accent-tonal p-3.5" : "px-3.5 py-1.5")}>
                    <span className={cn("min-w-14 text-center font-display", i.destaque ? "text-xl text-accent-tonal-ink" : "text-lg")}>{i.hora}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-md", i.destaque ? "font-bold" : "font-semibold")}>{i.titulo}</span>
                      {i.client ? (
                        <Sub>
                          <ClientDot color={i.client.cor} />
                          <span className="truncate">{i.client.nome}</span>
                        </Sub>
                      ) : null}
                    </span>
                    <Link href={href} className={buttonClasses(i.destaque ? "primary" : "outline", "sm")}>
                      Ver brief
                    </Link>
                  </li>
                );
              }
              if (i.kind === "ajuste") {
                return (
                  <li key={i.key} className="flex items-center gap-3 px-1 py-2">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-late-tonal text-late-ink">
                      <MessageCircle className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-md">
                      <b>{i.client?.nome}</b> pediu ajuste em {plural(i.quantos, "post", "posts")} {formatRelativeTime(i.desde)}
                    </span>
                    <Link href={`${base}/producao?entrega=${i.deliverableId}`} className={buttonClasses("outline", "sm")}>
                      Ver ajustes
                    </Link>
                  </li>
                );
              }
              return (
                <li key={i.key} className="flex items-center gap-3 px-1 py-2">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-tonal text-accent-tonal-ink">
                    <CalendarCheck className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-md">
                    Próximo passo da ata: <b>{i.titulo}</b> vence hoje
                  </span>
                  <button
                    type="button"
                    onClick={() => completeTask(i.key, i.taskId, i.titulo, { client: i.client, responsavel: i.responsavel })}
                    className="inline-flex h-9 items-center rounded-full bg-ok-tonal px-3.5 text-sm font-bold text-ok-ink hover:brightness-95"
                  >
                    Concluir
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          id="h-fazer"
          title="O que fazer"
          meta={`${plural(fazer.length, "item", "itens")}${atrasados ? `, ${plural(atrasados, "atrasado", "atrasados")}` : ""}`}
          isEmpty={!fazer.length}
          empty="Nada para fazer hoje. Bom momento para planejar o próximo mês."
        >
          <ul className="flex flex-col gap-1">
            {fazer.map((i) => {
              const late = i.atrasoDias > 0;
              const info = [
                i.client?.nome,
                late ? `atrasado ${plural(i.atrasoDias, "dia", "dias")}` : i.kind === "post" ? "publica hoje" : "para hoje",
              ]
                .filter(Boolean)
                .join(", ");
              const body = (
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-md font-semibold">{i.titulo}</span>
                  <Sub tone={late ? "late" : undefined}>
                    {i.client ? <ClientDot color={i.client.cor} /> : null}
                    <span className="truncate">{info}</span>
                  </Sub>
                </span>
              );
              const who = i.responsavel ? <UserAvatar name={i.responsavel.nome} size="sm" /> : null;
              if (i.kind === "tarefa") {
                return (
                  <li key={i.key}>
                    <label className={cn("flex cursor-pointer items-center gap-3 rounded-inner px-3.5 py-2.5", late && "bg-late-tonal-2")}>
                      <input
                        type="checkbox"
                        className="size-[22px] shrink-0 cursor-pointer rounded-[7px] accent-[var(--accent)]"
                        onChange={() => completeTask(i.key, i.id, i.titulo, { client: i.client, responsavel: i.responsavel })}
                        aria-label={`Concluir ${i.titulo}`}
                      />
                      {body}
                      {who}
                    </label>
                  </li>
                );
              }
              return (
                <li key={i.key} className={cn("flex items-center gap-3 rounded-inner px-3.5 py-2.5", late && "bg-late-tonal-2")}>
                  <span aria-hidden className="size-[22px] shrink-0 rounded-[7px] border-2 border-dashed border-border-dashed" />
                  {body}
                  {who}
                  <Link href={`${base}/producao?entrega=${i.id}`} className={buttonClasses("tonal", "xs")}>
                    {i.status === "planejar" ? "Planejar" : "Abrir post"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="h-cliente" title="Com o cliente" meta="esperando resposta deles" isEmpty={!agenda.cliente.length} empty="Nenhum cliente com post esperando aprovação.">
          <ul className="flex flex-col gap-1">
            {agenda.cliente.map((i) => {
              const nome = i.contato?.nome ? firstName(i.contato.nome) : "";
              const msg = `${nome ? `Oi, ${nome}!` : "Oi!"} ${i.quantos === 1 ? "Tem 1 post" : `Tem ${i.quantos} posts`} esperando seu ok.${i.portalUrl ? ` É só abrir: ${i.portalUrl}` : ""}`;
              return (
                <li key={i.key} className="flex flex-wrap items-center gap-3 px-1 py-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-md font-semibold">{plural(i.quantos, "post em aprovação", "posts em aprovação")}</span>
                    <Sub tone={i.diasEsperando >= 2 ? "late" : undefined}>
                      {i.client ? <ClientDot color={i.client.cor} /> : null}
                      <span className="truncate">
                        {i.client?.nome}, enviado {i.diasEsperando ? `há ${plural(i.diasEsperando, "dia", "dias")}` : "hoje"}
                      </span>
                    </Sub>
                  </span>
                  <a href={whatsappLink(i.contato?.telefone, msg)} target="_blank" rel="noreferrer" className={buttonClasses("outline", "sm")}>
                    <Send aria-hidden />
                    Reenviar no WhatsApp
                  </a>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          id="h-ar"
          title={canSeeFinance ? "Publicações e dinheiro" : "Publicações"}
          isEmpty={!agenda.publicacoes.length && !dinheiro.length}
          empty={canSeeFinance ? "Nenhum post marcado para hoje e nenhuma cobrança vencendo." : "Nenhum post marcado para hoje."}
        >
          {agenda.publicacoes.length ? (
            <ul className="flex flex-col gap-1">
              {agenda.publicacoes.map((p) => (
                <li key={p.key} className="flex items-center gap-3 px-1 py-1.5">
                  <span className="min-w-12 font-display text-md">{p.hora ?? "hoje"}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{p.titulo}</span>
                    {p.client ? (
                      <Sub>
                        <ClientDot color={p.client.cor} />
                        <span className="truncate">{p.client.nome}</span>
                      </Sub>
                    ) : null}
                  </span>
                  {p.noAr ? <Badge tone="success">no ar</Badge> : <Badge tone="neutral">agendado</Badge>}
                </li>
              ))}
            </ul>
          ) : null}
          {dinheiro.length ? (
            <ul className={cn("flex flex-col gap-1", agenda.publicacoes.length > 0 && "border-t border-border pt-3")}>
              {dinheiro.map((d) => {
                const nome = d.contato?.nome ? firstName(d.contato.nome) : "";
                const msg = d.venceHoje
                  ? `${nome ? `Oi, ${nome}!` : "Oi!"} Passando para lembrar da mensalidade de ${formatBRL(d.valor)}, que vence hoje. Obrigado!`
                  : `${nome ? `Oi, ${nome}!` : "Oi!"} Tudo bem? A mensalidade de ${formatBRL(d.valor)} venceu há ${plural(d.atrasoDias, "dia", "dias")} e ainda não identifiquei o pagamento. Consegue verificar? Obrigado!`;
                return (
                  <li key={d.key} className="flex flex-wrap items-center gap-3 px-1 py-2">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-today-tonal text-today-ink">
                      <Wallet className="size-5" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-md font-semibold">
                        {d.client?.nome}, <span className="tabular">{formatBRL(d.valor)}</span>
                      </span>
                      <Sub tone={d.venceHoje ? undefined : "late"}>{d.venceHoje ? "Vence hoje" : `Atrasada ${plural(d.atrasoDias, "dia", "dias")}`}</Sub>
                    </span>
                    {!d.venceHoje ? (
                      <a href={whatsappLink(d.contato?.telefone, msg)} target="_blank" rel="noreferrer" className={buttonClasses("outline", "sm")}>
                        Cobrar no WhatsApp
                      </a>
                    ) : null}
                    <button type="button" onClick={() => pay(d.key, d.id)} className="inline-flex h-9 items-center rounded-full bg-ok-tonal px-3.5 text-sm font-bold text-ok-ink hover:brightness-95">
                      Marcar paga
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Section>
      </div>

      {feito.length ? (
        <details className="rounded-card bg-surface p-[22px]">
          <summary className="cursor-pointer font-display text-lg">Feito hoje ({feito.length})</summary>
          <ul className="mt-3 flex flex-col gap-1.5">
            {feito.map((f) => (
              <li key={f.key} className="flex items-center gap-3 text-md text-ink-2">
                <Check className="size-4 text-ok" aria-hidden />
                <span className="line-through decoration-faint">{f.titulo}</span>
                {f.client ? <span className="text-sm text-muted">{f.client.nome}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {agenda.counts.total === 0 && !feito.length ? (
        <div className="flex items-center gap-3 rounded-card bg-surface p-[22px] text-md text-ink-2">
          <SunMedium className="size-5 text-today-strong" aria-hidden />
          Pauta limpa por hoje. Que tal planejar o próximo mês no calendário?
          <Link href={`${base}/calendario`} className={buttonClasses("tonal", "sm") + " ml-auto"}>
            Abrir calendário
          </Link>
        </div>
      ) : null}
    </div>
  );
}
