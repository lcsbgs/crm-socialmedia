import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { buildReportSummary, type MetricRow } from "./build";

type Db = SupabaseClient<Database>;

// Gera (ou atualiza) o resumo do relatório do mês. Funciona com a sessão da pessoa ou com o
// cliente do servidor (job do dia 1).
export async function upsertReport(db: Db, input: { workspaceId: string; clientId: string; month: string }) {
  const start = `${input.month}-01`;
  const end = new Date(Date.UTC(+input.month.slice(0, 4), +input.month.slice(5, 7), 0)).toISOString().slice(0, 10);
  const prevStart = new Date(Date.UTC(+input.month.slice(0, 4), +input.month.slice(5, 7) - 2, 1)).toISOString().slice(0, 10);
  const [metrics, prev, published, approvals] = await Promise.all([
    db.from("metrics_daily").select("data, seguidores, alcance, impressoes, interacoes, simulated").eq("client_id", input.clientId).gte("data", start).lte("data", end),
    db.from("metrics_daily").select("data, seguidores, alcance, impressoes, interacoes, simulated").eq("client_id", input.clientId).gte("data", prevStart).lt("data", start),
    db.from("deliverables").select("id, titulo, slot_label, formato, data_publicacao").eq("client_id", input.clientId).eq("status", "publicado").gte("data_publicacao", start).lte("data_publicacao", end),
    db
      .from("approvals")
      .select("decisao, deliverable_id, deliverable:deliverables!inner (client_id)")
      .eq("deliverable.client_id", input.clientId)
      .gte("created_at", new Date(`${start}T00:00:00-03:00`).toISOString())
      .lte("created_at", new Date(`${end}T23:59:59-03:00`).toISOString()),
  ]);
  const resumo = buildReportSummary({
    metrics: (metrics.data ?? []) as MetricRow[],
    prevMetrics: (prev.data ?? []) as MetricRow[],
    published: (published.data ?? []).map((p) => ({ titulo: p.titulo ?? p.slot_label ?? "", formato: p.formato, data_publicacao: p.data_publicacao })),
    approvals: (approvals.data ?? []).map((a) => ({ decisao: a.decisao, deliverable_id: a.deliverable_id })),
  });
  const { data, error } = await db
    .from("reports")
    .upsert({ workspace_id: input.workspaceId, client_id: input.clientId, competencia: start, resumo: resumo as never, gerado_em: new Date().toISOString() }, { onConflict: "client_id,competencia" })
    .select("id")
    .single();
  return error ? null : { id: data.id, resumo };
}
