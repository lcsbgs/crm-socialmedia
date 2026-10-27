import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

export async function getClients(workspaceId: string) {
  const supabase = await createClient();
  const [{ data: clients }, { data: payments }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome, segmento, status, valor_mensal, package:package_templates (nome)")
      .eq("workspace_id", workspaceId)
      .order("nome"),
    supabase
      .from("payments")
      .select("client_id, vencimento, valor, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "pago")
      .order("vencimento"),
  ]);

  // Próximo vencimento em aberto por cliente (o mais antigo primeiro: atrasados aparecem).
  const nextDue = new Map<string, { vencimento: string; valor: number; atrasado: boolean }>();
  const today = todayISO();
  for (const p of payments ?? []) {
    if (!nextDue.has(p.client_id)) {
      nextDue.set(p.client_id, { vencimento: p.vencimento, valor: p.valor, atrasado: p.vencimento < today });
    }
  }

  return (clients ?? []).map((c) => ({ ...c, proximoVencimento: nextDue.get(c.id) ?? null }));
}

export async function getClient(workspaceId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*, package:package_templates (id, nome, itens)")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getClientMonthTasks(workspaceId: string, clientId: string, competencia: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, titulo, due_date, status, origem")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .or(`competencia.eq.${competencia},and(competencia.is.null,status.eq.pendente)`)
    .order("due_date", { nullsFirst: false })
    .order("titulo");
  return data ?? [];
}

export async function getClientTimeline(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_timeline")
    .select("tipo, titulo, ocorreu_em, ref_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("ocorreu_em", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getNextDuePayment(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("vencimento, valor")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .neq("status", "pago")
    .order("vencimento")
    .limit(1)
    .maybeSingle();
  return data;
}

// Resumo do mês para a visão geral do cliente.
export async function getClientMonthSummary(workspaceId: string, clientId: string, month: string) {
  const supabase = await createClient();
  const competencia = `${month}-01`;
  const nowIso = new Date().toISOString();
  const [tasks, meeting, payment, scope] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titulo, due_date, status")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .eq("status", "pendente")
      .order("due_date", { nullsFirst: false })
      .limit(12),
    supabase
      .from("meetings")
      .select("id, titulo, data")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .gte("data", nowIso)
      .order("data")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, valor, vencimento, pago_em, status")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .eq("competencia", competencia)
      .maybeSingle(),
    supabase
      .from("scope_requests")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .eq("status", "pendente"),
  ]);
  return {
    tasks: tasks.data ?? [],
    nextMeeting: meeting.data,
    payment: payment.data,
    pendingScope: scope.count ?? 0,
  };
}
