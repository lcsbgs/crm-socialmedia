"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import { plural } from "@/lib/format";
import { confirmMeetingMinutes } from "../actions";
import type { Minutes } from "../schemas";

const input = "h-8 w-full rounded-xl border border-border bg-surface px-2.5 text-base";

type Step = Minutes["proximos_passos"][number] & { incluir: boolean };

// Revisão da ata sugerida pela IA. Só os próximos passos marcados viram tarefas.
export function MinutesReview({
  workspaceId,
  meetingId,
  draft,
}: {
  workspaceId: string;
  meetingId: string;
  draft: Minutes;
}) {
  const [state, action] = useActionState(confirmMeetingMinutes, null);
  const [resumo, setResumo] = useState(draft.resumo);
  const [decisoes, setDecisoes] = useState(draft.decisoes);
  const [passos, setPassos] = useState<Step[]>(draft.proximos_passos.map((p) => ({ ...p, incluir: true })));

  const ata: Minutes = {
    resumo,
    decisoes: decisoes.map((d) => d.trim()).filter(Boolean),
    proximos_passos: passos
      .filter((p) => p.incluir && p.titulo.trim())
      .map(({ titulo, due_date }) => ({ titulo: titulo.trim(), due_date: due_date || null })),
  };

  if (state?.message) {
    return <FormAlert state={state} />;
  }

  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="id" value={meetingId} />
      <input type="hidden" name="ata" value={JSON.stringify(ata)} />

      <div className="space-y-1.5">
        <label htmlFor="resumo" className="block text-sm font-medium">
          Resumo
        </label>
        <textarea
          id="resumo"
          rows={4}
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">Decisões</legend>
        {decisoes.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input
              aria-label={`Decisão ${i + 1}`}
              className={input}
              value={d}
              onChange={(e) => setDecisoes((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-10"
              onClick={() => setDecisoes((prev) => prev.filter((_, j) => j !== i))}
            >
              Remover
            </Button>
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setDecisoes((prev) => [...prev, ""])}>
          Adicionar decisão
        </Button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">Próximos passos (viram tarefas)</legend>
        {passos.map((p, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] items-center gap-2 sm:grid-cols-[auto_1fr_170px]">
            <input
              type="checkbox"
              aria-label={`Criar tarefa para o passo ${i + 1}`}
              checked={p.incluir}
              onChange={(e) =>
                setPassos((prev) => prev.map((x, j) => (j === i ? { ...x, incluir: e.target.checked } : x)))
              }
              className="size-4"
            />
            <input
              aria-label={`Próximo passo ${i + 1}`}
              className={input}
              value={p.titulo}
              onChange={(e) =>
                setPassos((prev) => prev.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))
              }
            />
            <div className="col-start-2 sm:col-start-auto">
              <DatePicker
                aria-label={`Prazo do passo ${i + 1}`}
                value={p.due_date}
                placeholder="Sem prazo"
                onChange={(v) =>
                  setPassos((prev) => prev.map((x, j) => (j === i ? { ...x, due_date: v } : x)))
                }
              />
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPassos((prev) => [...prev, { titulo: "", due_date: null, incluir: true }])}
        >
          Adicionar passo
        </Button>
      </fieldset>

      <SubmitButton pendingText="Confirmando...">
        {ata.proximos_passos.length
          ? `Confirmar ata e criar ${plural(ata.proximos_passos.length, "tarefa", "tarefas")}`
          : "Confirmar ata"}
      </SubmitButton>
    </form>
  );
}
