import "server-only";
import { z } from "zod";
import { contactSchema } from "@/features/clients/schemas";
import { publicEnv } from "@/lib/env";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { firstName, whatsappLink } from "@/lib/whatsapp";

const APPROVAL_STALE_DAYS = 2;
const PAYMENT_LOOKAHEAD_DAYS = 3;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type TodayClient = { id: string; nome: string; cor: number };

export type TodayItem =
  | { kind: "task"; id: string; titulo: string; date: string | null; client: TodayClient | null }
  | { kind: "deliverable"; id: string; titulo: string; date: string; status: string; client: TodayClient }
  | { kind: "approval"; id: string; titulo: string; since: string; client: TodayClient; resendUrl: string }
  | {
      kind: "payment";
      id: string;
      titulo: string;
      valor: number;
      date: string;
      late: boolean;
      client: TodayClient;
      chargeUrl: string;
    }
  | { kind: "meeting"; id: string; titulo: string; at: string; client: TodayClient };

export type TodaySections = {
  atrasadas: TodayItem[];
  hoje: TodayItem[];
  esperando: TodayItem[];
  receber: TodayItem[];
  reunioes: TodayItem[];
};

type ClientRow = { id: string; nome: string; cor: number | null; contatos: unknown; portal_token: string };

function chargeMessage(
  contato: string,
  valor: number,
  vencimento: string,
  competencia: string,
  late: boolean,
) {
  const oi = contato ? `Oi, ${firstName(contato)}!` : "Oi!";
  const mes = formatMonth(competencia).toLowerCase();
  return late
    ? `${oi} Tudo bem? A mensalidade de ${mes}, no valor de ${formatBRL(valor)}, venceu em ${formatDate(vencimento)} e ainda não identifiquei o pagamento. Consegue verificar para mim? Se já pagou, me manda o comprovante, por favor. Obrigado!`
    : `${oi} Passando para lembrar da mensalidade de ${mes}, no valor de ${formatBRL(valor)}, com vencimento em ${formatDate(vencimento)}. Obrigado!`;
}

// Tudo que pede atenção hoje, em seções na ordem da tela.
export async function getToday(workspaceId: string) {
  const supabase = await createClient();
  const today = todayISO();
  const staleBefore = new Date(Date.now() - APPROVAL_STALE_DAYS * 86_400_000).toISOString();
  const dayStart = new Date(`${today}T00:00:00-03:00`).toISOString();
  const dayEnd = new Date(`${addDays(today, 1)}T00:00:00-03:00`).toISOString();

  const [tasks, deliverables, approvals, payments, meetings, clients] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titulo, due_date, client_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "pendente")
      .lte("due_date", today)
      .order("due_date")
      .order("created_at")
      .limit(200),
    supabase
      .from("deliverables")
      .select("id, titulo, data_publicacao, status, client_id")
      .eq("workspace_id", workspaceId)
      .in("status", ["planejar", "produzir"])
      .lte("data_publicacao", today)
      .order("data_publicacao")
      .limit(200),
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
    supabase
      .from("meetings")
      .select("id, titulo, data, client_id")
      .eq("workspace_id", workspaceId)
      .gte("data", dayStart)
      .lt("data", dayEnd)
      .order("data"),
    supabase.from("clients").select("id, nome, cor, contatos, portal_token").eq("workspace_id", workspaceId),
  ]);

  const byId = new Map<string, ClientRow>((clients.data ?? []).map((c) => [c.id, c]));
  const client = (id: string): TodayClient => {
    const c = byId.get(id);
    return { id, nome: c?.nome ?? "Cliente", cor: c?.cor ?? 0 };
  };
  const contact = (id: string) => z.array(contactSchema).catch([]).parse(byId.get(id)?.contatos)[0];

  const sections: TodaySections = { atrasadas: [], hoje: [], esperando: [], receber: [], reunioes: [] };

  for (const t of tasks.data ?? []) {
    const item: TodayItem = {
      kind: "task",
      id: t.id,
      titulo: t.titulo,
      date: t.due_date,
      client: t.client_id ? client(t.client_id) : null,
    };
    (t.due_date && t.due_date < today ? sections.atrasadas : sections.hoje).push(item);
  }

  for (const d of deliverables.data ?? []) {
    if (!d.data_publicacao) continue;
    const item: TodayItem = {
      kind: "deliverable",
      id: d.id,
      titulo: d.titulo,
      date: d.data_publicacao,
      status: d.status,
      client: client(d.client_id),
    };
    (d.data_publicacao < today ? sections.atrasadas : sections.hoje).push(item);
  }

  // Pendências por data, tarefas antes de entregas no mesmo dia.
  const byDate = (a: TodayItem, b: TodayItem) =>
    ("date" in a && a.date ? a.date : "").localeCompare("date" in b && b.date ? b.date : "");
  sections.atrasadas.sort(byDate);

  // Aprovações paradas: um "reenviar" por cliente com o total pendente dele.
  const pendingByClient = new Map<string, number>();
  for (const a of approvals.data ?? [])
    pendingByClient.set(a.client_id, (pendingByClient.get(a.client_id) ?? 0) + 1);
  for (const a of approvals.data ?? []) {
    const c = byId.get(a.client_id);
    const url = `${publicEnv.NEXT_PUBLIC_APP_URL}/p/${c?.portal_token}`;
    const contato = contact(a.client_id);
    const n = pendingByClient.get(a.client_id) ?? 1;
    const oi = contato?.nome ? `Oi, ${firstName(contato.nome)}!` : "Oi!";
    const msg = `${oi} ${n === 1 ? "Ainda tem 1 conteúdo esperando" : `Ainda tem ${n} conteúdos esperando`} sua aprovação. Consegue dar uma olhada? ${url}`;
    sections.esperando.push({
      kind: "approval",
      id: a.id,
      titulo: a.titulo,
      since: a.status_changed_at,
      client: client(a.client_id),
      resendUrl: whatsappLink(contato?.telefone, msg),
    });
  }

  for (const p of payments.data ?? []) {
    const late = p.vencimento < today;
    const contato = contact(p.client_id);
    sections.receber.push({
      kind: "payment",
      id: p.id,
      titulo: `Mensalidade de ${formatMonth(p.competencia).toLowerCase()}`,
      valor: p.valor,
      date: p.vencimento,
      late,
      client: client(p.client_id),
      chargeUrl: whatsappLink(
        contato?.telefone,
        chargeMessage(contato?.nome ?? "", p.valor, p.vencimento, p.competencia, late),
      ),
    });
  }

  for (const m of meetings.data ?? []) {
    sections.reunioes.push({
      kind: "meeting",
      id: m.id,
      titulo: m.titulo,
      at: m.data,
      client: client(m.client_id),
    });
  }

  return { today, sections };
}
