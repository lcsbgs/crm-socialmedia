import "server-only";
import { z } from "zod";
import { contactSchema } from "@/features/clients/schemas";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

export type PaymentView = {
  id: string;
  client_id: string;
  clienteNome: string;
  contatoNome: string;
  contatoTelefone: string | null;
  competencia: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  status: "pendente" | "pago" | "atrasado";
};

const select =
  "id, client_id, competencia, valor, vencimento, pago_em, status, client:clients!inner (nome, contatos)";

type Row = {
  id: string;
  client_id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  status: "pendente" | "pago" | "atrasado";
  client: { nome: string; contatos: unknown };
};

// Status efetivo: pendente com vencimento passado conta como atrasado, mesmo
// antes do job diário marcar no banco.
function toView(row: Row, today: string): PaymentView {
  const contato = z.array(contactSchema).catch([]).parse(row.client.contatos)[0];
  return {
    id: row.id,
    client_id: row.client_id,
    clienteNome: row.client.nome,
    contatoNome: contato?.nome ?? "",
    contatoTelefone: contato?.telefone || null,
    competencia: row.competencia,
    valor: row.valor,
    vencimento: row.vencimento,
    pago_em: row.pago_em,
    status: row.status === "pendente" && row.vencimento < today ? "atrasado" : row.status,
  };
}

export async function getMonthPayments(workspaceId: string, competencia: string) {
  const supabase = await createClient();
  const today = todayISO();
  const { data } = await supabase
    .from("payments")
    .select(select)
    .eq("workspace_id", workspaceId)
    .eq("competencia", competencia)
    .order("vencimento");
  return ((data ?? []) as Row[]).map((r) => toView(r, today));
}

// Todas as cobranças vencidas e não pagas, de qualquer mês.
export async function getOverduePayments(workspaceId: string) {
  const supabase = await createClient();
  const today = todayISO();
  const { data } = await supabase
    .from("payments")
    .select(select)
    .eq("workspace_id", workspaceId)
    .neq("status", "pago")
    .lt("vencimento", today)
    .order("vencimento");
  return ((data ?? []) as Row[]).map((r) => toView(r, today));
}

export async function getClientPaymentViews(workspaceId: string, clientId: string) {
  const supabase = await createClient();
  const today = todayISO();
  const { data } = await supabase
    .from("payments")
    .select(select)
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("competencia", { ascending: false });
  return ((data ?? []) as Row[]).map((r) => toView(r, today));
}
