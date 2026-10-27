import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

const APPROVAL_STALE_DAYS = 2;
const PAYMENT_LOOKAHEAD_DAYS = 3;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type TodayGroup = {
  clientId: string | null;
  nome: string;
  tasks: { id: string; titulo: string; due_date: string | null; status: "pendente" | "feita" }[];
  approvals: { id: string; titulo: string; status_changed_at: string }[];
  payments: { id: string; valor: number; vencimento: string; competencia: string }[];
};

// Tudo que pede atenção hoje, agrupado por cliente.
export async function getToday(workspaceId: string) {
  const supabase = await createClient();
  const today = todayISO();
  const staleBefore = new Date(Date.now() - APPROVAL_STALE_DAYS * 86_400_000).toISOString();

  const [tasks, approvals, payments, clients] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titulo, due_date, status, client_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "pendente")
      .lte("due_date", today)
      .order("due_date")
      .limit(300),
    supabase
      .from("deliverables")
      .select("id, titulo, status_changed_at, client_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "em_aprovacao")
      .lt("status_changed_at", staleBefore)
      .order("status_changed_at"),
    supabase
      .from("payments")
      .select("id, valor, vencimento, competencia, client_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "pago")
      .lte("vencimento", addDays(today, PAYMENT_LOOKAHEAD_DAYS))
      .order("vencimento"),
    supabase.from("clients").select("id, nome").eq("workspace_id", workspaceId),
  ]);

  const names = new Map((clients.data ?? []).map((c) => [c.id, c.nome]));
  const groups = new Map<string, TodayGroup>();
  const group = (clientId: string | null) => {
    const key = clientId ?? "";
    let g = groups.get(key);
    if (!g) {
      g = {
        clientId,
        nome: clientId ? (names.get(clientId) ?? "Cliente") : "Sem cliente",
        tasks: [],
        approvals: [],
        payments: [],
      };
      groups.set(key, g);
    }
    return g;
  };

  for (const t of tasks.data ?? []) group(t.client_id).tasks.push(t);
  for (const d of approvals.data ?? []) group(d.client_id).approvals.push(d);
  for (const p of payments.data ?? []) group(p.client_id).payments.push(p);

  const list = [...groups.values()].sort((a, b) => {
    if (!a.clientId) return 1;
    if (!b.clientId) return -1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return {
    today,
    groups: list,
    totals: {
      tasks: tasks.data?.length ?? 0,
      lateTasks: (tasks.data ?? []).filter((t) => t.due_date && t.due_date < today).length,
      approvals: approvals.data?.length ?? 0,
      payments: payments.data?.length ?? 0,
    },
    clients: (clients.data ?? []).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}
