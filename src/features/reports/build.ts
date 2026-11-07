// Monta o resumo do relatório mensal a partir dos dados do mês. Função pura.
export type MetricRow = { data: string; seguidores: number | null; alcance: number; impressoes: number; interacoes: number; simulated: boolean };
export type PublishedRow = { titulo: string; formato: string; data_publicacao: string | null };

export type ReportSummary = {
  alcance: number;
  impressoes: number;
  interacoes: number;
  seguidoresInicio: number | null;
  seguidoresFim: number | null;
  variacaoAlcance: number | null; // % contra o mês anterior
  postsPublicados: number;
  porFormato: Record<string, number>;
  aprovadosDePrimeira: number;
  ajustesPedidos: number;
  diasComDados: number;
  simulado: boolean;
};

export function buildReportSummary(input: {
  metrics: MetricRow[];
  prevMetrics: MetricRow[];
  published: PublishedRow[];
  approvals: { decisao: "aprovado" | "ajuste"; deliverable_id: string }[];
}): ReportSummary {
  const sum = (rows: MetricRow[], k: "alcance" | "impressoes" | "interacoes") => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const sorted = [...input.metrics].sort((a, b) => a.data.localeCompare(b.data));
  const withFollowers = sorted.filter((r) => r.seguidores !== null);
  const alcance = sum(input.metrics, "alcance");
  const prevAlcance = sum(input.prevMetrics, "alcance");
  const porFormato: Record<string, number> = {};
  for (const p of input.published) porFormato[p.formato] = (porFormato[p.formato] ?? 0) + 1;
  const ajustesPorPost = new Set(input.approvals.filter((a) => a.decisao === "ajuste").map((a) => a.deliverable_id));
  const aprovados = new Set(input.approvals.filter((a) => a.decisao === "aprovado").map((a) => a.deliverable_id));
  return {
    alcance,
    impressoes: sum(input.metrics, "impressoes"),
    interacoes: sum(input.metrics, "interacoes"),
    seguidoresInicio: withFollowers[0]?.seguidores ?? null,
    seguidoresFim: withFollowers.at(-1)?.seguidores ?? null,
    variacaoAlcance: prevAlcance > 0 ? Math.round(((alcance - prevAlcance) / prevAlcance) * 100) : null,
    postsPublicados: input.published.length,
    porFormato,
    aprovadosDePrimeira: [...aprovados].filter((id) => !ajustesPorPost.has(id)).length,
    ajustesPedidos: input.approvals.filter((a) => a.decisao === "ajuste").length,
    diasComDados: new Set(input.metrics.map((m) => m.data)).size,
    simulado: input.metrics.some((m) => m.simulated),
  };
}
