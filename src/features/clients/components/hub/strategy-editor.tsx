"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SegmentedBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { todayISO } from "@/lib/format";
import { saveStrategy } from "../../hub-actions";
import type { StrategyInput } from "../../hub-schemas";

export const pillarColors = ["#6B4EFF", "#F28C28", "#1C8C86", "#D9468F", "#3D6FE0", "#C99A06", "#3E9B4F", "#5B6470"];

export function StrategyEditor({
  workspaceId,
  clientId,
  initial,
}: {
  workspaceId: string;
  clientId: string;
  initial: StrategyInput;
}) {
  const [s, setS] = useState<StrategyInput>(initial);
  const [pending, start] = useTransition();
  const total = s.pilares.reduce((n, p) => n + (Number.isFinite(p.pct) ? p.pct : 0), 0);
  const set = <K extends keyof StrategyInput>(k: K, v: StrategyInput[K]) => setS((cur) => ({ ...cur, [k]: v }));

  function save() {
    start(async () => {
      const r = await saveStrategy({ ...s, workspaceId, clientId });
      if ("error" in r) toast.error(r.error);
      else toast.success("Estratégia salva.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Objetivo e público" />
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="objetivo">Objetivo do trimestre</Label>
            <Input id="objetivo" value={s.objetivo ?? ""} onChange={(e) => set("objetivo", e.target.value)} placeholder="Vender mais encomendas de Natal pelo direct" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publico">Para quem falamos</Label>
            <Textarea id="publico" value={s.publico ?? ""} onChange={(e) => set("publico", e.target.value)} rows={3} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Metas</legend>
            {s.objetivos.map((o, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                <Input aria-label={`Meta ${i + 1}`} value={o.texto} onChange={(e) => set("objetivos", s.objetivos.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
                <Input aria-label={`Prazo da meta ${i + 1}`} placeholder="até dezembro" value={o.prazo} onChange={(e) => set("objetivos", s.objetivos.map((x, j) => (j === i ? { ...x, prazo: e.target.value } : x)))} />
                <IconButton label="Remover meta" variant="ghost" onClick={() => set("objetivos", s.objetivos.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </IconButton>
              </div>
            ))}
            <Button variant="tonal" size="sm" onClick={() => set("objetivos", [...s.objetivos, { texto: "", prazo: "" }])}>
              <Plus aria-hidden />
              Adicionar meta
            </Button>
          </fieldset>
        </div>
      </Card>

      <Card>
        <CardHeader title="Pilares de conteúdo" description={total === 100 || !s.pilares.length ? "A soma dá 100%." : `A soma está em ${total}%. Ajuste para 100%.`} />
        {s.pilares.length ? (
          <div className="mb-4">
            <SegmentedBar label="Distribuição dos pilares" segments={s.pilares.map((p, i) => ({ label: p.nome || `Pilar ${i + 1}`, value: p.pct || 0, color: pillarColors[i % pillarColors.length] }))} />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          {s.pilares.map((p, i) => (
            <div key={i} className="grid grid-cols-[14px_1fr_96px_auto] items-center gap-2">
              <span aria-hidden className="size-3.5 rounded-[4px]" style={{ backgroundColor: pillarColors[i % pillarColors.length] }} />
              <Input aria-label={`Nome do pilar ${i + 1}`} value={p.nome} onChange={(e) => set("pilares", s.pilares.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
              <Input aria-label={`Percentual do pilar ${i + 1}`} type="number" min={0} max={100} value={p.pct} onChange={(e) => set("pilares", s.pilares.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />
              <IconButton label="Remover pilar" variant="ghost" onClick={() => set("pilares", s.pilares.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </IconButton>
            </div>
          ))}
          <Button variant="tonal" size="sm" className="self-start" onClick={() => set("pilares", [...s.pilares, { nome: "", pct: Math.max(0, 100 - total) }])}>
            <Plus aria-hidden />
            Adicionar pilar
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Formatos" description="O que entra no feed e com que frequência." />
        <div className="flex flex-col gap-2">
          {s.formatos.map((f, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input aria-label={`Formato ${i + 1}`} placeholder="Carrossel" value={f.formato} onChange={(e) => set("formatos", s.formatos.map((x, j) => (j === i ? { ...x, formato: e.target.value } : x)))} />
              <Input aria-label={`Frequência do formato ${i + 1}`} placeholder="2 por semana" value={f.frequencia} onChange={(e) => set("formatos", s.formatos.map((x, j) => (j === i ? { ...x, frequencia: e.target.value } : x)))} />
              <IconButton label="Remover formato" variant="ghost" onClick={() => set("formatos", s.formatos.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </IconButton>
            </div>
          ))}
          <Button variant="tonal" size="sm" className="self-start" onClick={() => set("formatos", [...s.formatos, { formato: "", frequencia: "" }])}>
            <Plus aria-hidden />
            Adicionar formato
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Decisões" description="O que foi combinado com o cliente, com data." />
        <ol className="flex flex-col gap-2">
          {s.decisoes.map((d, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
              <Input aria-label={`Data da decisão ${i + 1}`} type="date" value={d.data} onChange={(e) => set("decisoes", s.decisoes.map((x, j) => (j === i ? { ...x, data: e.target.value } : x)))} />
              <Input aria-label={`Decisão ${i + 1}`} value={d.texto} onChange={(e) => set("decisoes", s.decisoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
              <IconButton label="Remover decisão" variant="ghost" onClick={() => set("decisoes", s.decisoes.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </IconButton>
            </li>
          ))}
        </ol>
        <Button variant="tonal" size="sm" className="mt-2" onClick={() => set("decisoes", [{ data: todayISO(), texto: "", origem: "manual" }, ...s.decisoes])}>
          <Plus aria-hidden />
          Registrar decisão
        </Button>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar estratégia"}
        </Button>
      </div>
    </div>
  );
}
