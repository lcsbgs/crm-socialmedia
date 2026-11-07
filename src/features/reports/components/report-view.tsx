import { DemoBadge } from "@/components/ui/demo-badge";
import { formatLabels } from "@/features/deliverables/schemas";
import type { ReportSummary } from "../build";

const n = (v: number | null) => (v === null ? "sem dado" : v.toLocaleString("pt-BR"));

// Relatório mensal (usado na aba do cliente e na página pública).
export function ReportView({ resumo, leitura }: { resumo: ReportSummary; leitura: string | null }) {
  const stat = (label: string, value: string, hint?: string) => (
    <div className="flex flex-col gap-0.5 rounded-inner bg-background p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="tabular font-display text-2xl">{value}</span>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </div>
  );
  const seg = resumo.seguidoresInicio !== null && resumo.seguidoresFim !== null ? resumo.seguidoresFim - resumo.seguidoresInicio : null;
  return (
    <div className="flex flex-col gap-5">
      {resumo.simulado ? <DemoBadge className="self-start" /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Alcance", n(resumo.alcance), resumo.variacaoAlcance === null ? undefined : `${resumo.variacaoAlcance >= 0 ? "+" : ""}${resumo.variacaoAlcance}% contra o mês anterior`)}
        {stat("Interações", n(resumo.interacoes))}
        {stat("Seguidores", n(resumo.seguidoresFim), seg === null ? undefined : `${seg >= 0 ? "+" : ""}${seg} no mês`)}
        {stat("Posts publicados", String(resumo.postsPublicados), Object.entries(resumo.porFormato).map(([k, v]) => `${v} ${formatLabels[k as keyof typeof formatLabels] ?? k}`).join(", ") || undefined)}
      </div>
      <p className="text-md text-ink-2">
        {resumo.aprovadosDePrimeira} posts aprovados de primeira, {resumo.ajustesPedidos} pedidos de ajuste.
        {resumo.diasComDados === 0 ? " Ainda não há métricas coletadas da conta: conecte o Instagram do cliente." : ""}
      </p>
      {leitura ? (
        <section className="rounded-inner bg-accent-tonal p-4">
          <h3 className="mb-2 font-display text-lg text-accent-tonal-ink">Leitura do mês</h3>
          <p className="text-md whitespace-pre-wrap">{leitura}</p>
        </section>
      ) : null}
    </div>
  );
}
