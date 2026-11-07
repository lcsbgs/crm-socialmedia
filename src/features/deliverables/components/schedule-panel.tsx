"use client";

import { AlertTriangle, CalendarClock, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useShell } from "@/components/shell/shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cancelSchedule, retryPublish, schedulePost } from "@/features/integrations/actions";
import { spDate, spTime } from "@/lib/dates";
import type { DeliverableDetail } from "../detail-actions";

const statusText: Record<string, string> = {
  pendente: "na fila",
  processando: "publicando",
  publicado: "no ar",
  erro: "falhou",
};

// Agendar a publicação na Meta e acompanhar a fila.
export function SchedulePanel({ detail, reload }: { detail: DeliverableDetail; reload: () => Promise<void> }) {
  const { workspace } = useShell();
  const [selected, setSelected] = useState<string[]>(detail.accounts.map((a) => a.id));
  const defaultWhen = `${detail.data_publicacao ?? new Date().toISOString().slice(0, 10)}T${detail.hora_publicacao?.slice(0, 5) ?? "09:00"}`;
  const [when, setWhen] = useState(defaultWhen);
  const [pending, start] = useTransition();
  const canSchedule = ["aprovado", "agendado"].includes(detail.status);

  if (!detail.accounts.length) {
    return (
      <p className="rounded-inner bg-background p-4 text-sm text-ink-2">
        Este cliente ainda não tem conta da Meta ligada.{" "}
        <Link href={`/w/${workspace.slug}/clientes/${detail.client.id}?aba=arquivos`} className="font-semibold text-accent-tonal-ink underline">
          Escolher contas
        </Link>
      </p>
    );
  }

  return (
    <section aria-labelledby="h-pub" className="flex flex-col gap-3 rounded-inner bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="h-pub" className="font-display text-lg">
          Publicação
        </h3>
        {detail.accounts.some((a) => a.simulated) ? <DemoBadge /> : null}
      </div>

      {detail.jobs.length ? (
        <ul className="flex flex-col gap-2">
          {detail.jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-2 text-base">
              <CalendarClock className="size-4 text-muted" aria-hidden />
              <b>{j.account}</b>
              <span className="text-sm text-muted">
                {spDate(j.agendado_para).split("-").reverse().slice(0, 2).join("/")} às {spTime(j.agendado_para)}
              </span>
              <Badge tone={j.status === "publicado" ? "success" : j.status === "erro" ? "danger" : "warning"}>{statusText[j.status] ?? j.status}</Badge>
              {j.erro ? (
                <p className="flex w-full items-start gap-1.5 text-sm text-late-ink">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {j.erro}
                  {j.status === "pendente" && j.tentativas ? ` (tentativa ${j.tentativas + 1})` : ""}
                </p>
              ) : null}
              {j.status === "erro" ? (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    start(async () => {
                      const r = await retryPublish({ jobId: j.id });
                      if ("error" in r) toast.error(r.error);
                      else toast.success("Vai tentar de novo em até 1 minuto.");
                      await reload();
                    })
                  }
                >
                  <RotateCcw aria-hidden />
                  Tentar de novo
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {detail.published.map((p, i) =>
        p.permalink ? (
          <a key={i} href={p.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-tonal-ink underline">
            <ExternalLink className="size-4" aria-hidden />
            Ver no ar
          </a>
        ) : null,
      )}

      {canSchedule ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Onde publicar</legend>
            {detail.accounts.map((a) => (
              <Checkbox
                key={a.id}
                checked={selected.includes(a.id)}
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  setSelected((s) => (on ? [...s, a.id] : s.filter((x) => x !== a.id)));
                }}
                label={<span className="text-base font-semibold">{a.nome}</span>}
                description={a.plataforma === "instagram" ? "Instagram" : "Página do Facebook"}
              />
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="quando">Quando (horário de Brasília)</Label>
            <Input id="quando" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending || !selected.length}
              onClick={() =>
                start(async () => {
                  const r = await schedulePost({ deliverableId: detail.id, accountIds: selected, quando: when });
                  if ("error" in r) return void toast.error(r.error);
                  toast.success("Agendado. O Pauta publica sozinho no horário.");
                  await reload();
                })
              }
            >
              {detail.status === "agendado" ? "Reagendar" : "Agendar publicação"}
            </Button>
            {detail.status === "agendado" ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await cancelSchedule({ deliverableId: detail.id });
                    await reload();
                  })
                }
              >
                Cancelar agendamento
              </Button>
            ) : null}
          </div>
        </>
      ) : !detail.jobs.length ? (
        <p className="text-sm text-muted">O agendamento libera quando o cliente aprovar.</p>
      ) : null}
    </section>
  );
}
