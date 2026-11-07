import "server-only";
import { buildDailyAgenda, type AgendaClient } from "./agenda";
import { z } from "zod";
import { contactSchema } from "@/features/clients/schemas";
import { deliverableLabel } from "@/features/deliverables/schemas";
import { publicEnv } from "@/lib/env";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/whatsapp";


function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}


export function chargeMessage(
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

// Em pauta hoje: lê o que existe no banco e monta os blocos (ver agenda.ts).
export async function getDailyAgenda(
  workspaceId: string,
  opts: { userId: string; scope: "minha" | "time"; canSeeFinance: boolean },
) {
  const supabase = await createClient();
  const today = todayISO();
  const dayStart = new Date(`${today}T00:00:00-03:00`).toISOString();
  const dayEnd = new Date(`${addDays(today, 1)}T00:00:00-03:00`).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();

  const { data: failed } = await supabase
    .from("publish_jobs")
    .select("deliverable_id, erro_mensagem, agendado_para, deliverable:deliverables!inner (titulo, slot_label, client_id)")
    .eq("workspace_id", workspaceId)
    .eq("status", "erro")
    .gte("agendado_para", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(20);
  const yesterday = new Date(`${addDays(today, -1)}T00:00:00-03:00`).toISOString();
  const [{ data: views }, { data: pendingContracts }] = opts.canSeeFinance
    ? await Promise.all([
        supabase
          .from("proposal_views")
          .select("proposal_id, proposal:proposals!inner (status, lead:leads!inner (nome, telefone))")
          .eq("workspace_id", workspaceId)
          .gte("viewed_at", yesterday),
        supabase
          .from("contracts")
          .select("id, enviado_em, lead:leads (nome)")
          .eq("workspace_id", workspaceId)
          .eq("status", "enviado"),
      ])
    : [{ data: [] }, { data: [] }];
  const viewsBy = new Map<string, { lead: string; telefone: string | null; vezes: number }>();
  for (const v of views ?? []) {
    if (v.proposal.status !== "enviada") continue;
    const cur = viewsBy.get(v.proposal_id) ?? { lead: v.proposal.lead.nome, telefone: v.proposal.lead.telefone, vezes: 0 };
    cur.vezes++;
    viewsBy.set(v.proposal_id, cur);
  }
  const [clients, members, mine, meetings, adjustments, tasks, posts, payments] = await Promise.all([
    supabase.from("clients").select("id, nome, cor, contatos, portal_token").eq("workspace_id", workspaceId),
    supabase.from("workspace_members").select("user_id, profile:profiles!inner (nome)").eq("workspace_id", workspaceId),
    supabase.from("client_assignees").select("client_id").eq("workspace_id", workspaceId).eq("user_id", opts.userId),
    supabase
      .from("meetings")
      .select("id, titulo, data, client_id")
      .eq("workspace_id", workspaceId)
      .gte("data", dayStart)
      .lt("data", dayEnd),
    supabase
      .from("approvals")
      .select("deliverable_id, autor_nome, created_at, deliverable:deliverables!inner (titulo, slot_label, status, client_id)")
      .eq("workspace_id", workspaceId)
      .eq("decisao", "ajuste")
      .gte("created_at", twoDaysAgo)
      .in("deliverable.status", ["planejar", "produzir", "ajuste"]),
    supabase
      .from("tasks")
      .select("id, titulo, due_date, origem, status, done_at, responsavel_id, client_id")
      .eq("workspace_id", workspaceId)
      .or(`and(status.eq.pendente,due_date.lte.${today}),done_at.gte.${dayStart}`)
      .limit(300),
    supabase
      .from("deliverables")
      .select("id, titulo, slot_label, status, data_publicacao, hora_publicacao, status_changed_at, responsavel_id, client_id")
      .eq("workspace_id", workspaceId)
      .or(`status.eq.em_aprovacao,and(status.in.(planejar,produzir,ajuste),data_publicacao.lte.${today}),and(status.in.(aprovado,agendado,publicado),data_publicacao.eq.${today})`)
      .limit(400),
    opts.canSeeFinance
      ? supabase
          .from("payments")
          .select("id, valor, vencimento, status, client_id")
          .eq("workspace_id", workspaceId)
          .neq("status", "pago")
          .lte("vencimento", today)
      : Promise.resolve({ data: [] as { id: string; valor: number; vencimento: string; status: "pendente" | "pago" | "atrasado"; client_id: string }[] }),
  ]);

  const byId = new Map((clients.data ?? []).map((c) => [c.id, c]));
  const client = (id: string): AgendaClient => {
    const c = byId.get(id);
    return { id, nome: c?.nome ?? "Cliente", cor: c?.cor ?? 0 };
  };
  const contato = (id: string) => {
    const c = z.array(contactSchema).catch([]).parse(byId.get(id)?.contatos)[0];
    return c ? { nome: c.nome, telefone: c.telefone ?? "" } : null;
  };

  return buildDailyAgenda({
    today,
    now: new Date().toISOString(),
    userId: opts.userId,
    scope: opts.scope,
    myClientIds: (mine.data ?? []).map((m) => m.client_id),
    people: (members.data ?? []).map((m) => ({ id: m.user_id, nome: m.profile.nome })),
    meetings: (meetings.data ?? []).map((m) => ({ id: m.id, titulo: m.titulo, data: m.data, client: client(m.client_id) })),
    adjustments: (adjustments.data ?? []).map((a) => ({
      deliverableId: a.deliverable_id,
      titulo: deliverableLabel(a.deliverable),
      autor: a.autor_nome,
      createdAt: a.created_at,
      client: client(a.deliverable.client_id),
    })),
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      titulo: t.titulo,
      dueDate: t.due_date,
      origem: t.origem,
      status: t.status,
      doneAt: t.done_at,
      responsavelId: t.responsavel_id,
      client: t.client_id ? client(t.client_id) : null,
    })),
    posts: (posts.data ?? []).map((p) => ({
      id: p.id,
      titulo: deliverableLabel(p),
      status: p.status,
      dataPublicacao: p.data_publicacao,
      hora: p.hora_publicacao,
      statusChangedAt: p.status_changed_at,
      responsavelId: p.responsavel_id,
      client: client(p.client_id),
      contato: contato(p.client_id),
      portalUrl: byId.get(p.client_id)?.portal_token
        ? `${publicEnv.NEXT_PUBLIC_APP_URL}/p/${byId.get(p.client_id)?.portal_token}`
        : null,
    })),
    sales: [
      ...[...viewsBy.entries()].map(([id, v]) => ({ kind: "proposta" as const, proposalId: id, lead: v.lead, vezes: v.vezes, telefone: v.telefone })),
      ...(pendingContracts ?? []).map((c) => ({ kind: "contrato" as const, contractId: c.id, lead: c.lead?.nome ?? "Cliente novo", desde: c.enviado_em ?? today })),
    ],
    publishErrors: (failed ?? []).map((f) => ({
      deliverableId: f.deliverable_id,
      titulo: deliverableLabel(f.deliverable),
      erro: f.erro_mensagem ?? "A Meta recusou a publicação.",
      quando: f.agendado_para,
      client: client(f.deliverable.client_id),
    })),
    payments: (payments.data ?? []).map((p) => ({
      id: p.id,
      valor: p.valor,
      vencimento: p.vencimento,
      status: p.status,
      client: client(p.client_id),
      contato: contato(p.client_id),
    })),
  });
}

// Fatos do dia para a saudação: só coisas que aconteceram de verdade.
export async function getGreetingFacts(workspaceId: string) {
  const supabase = await createClient();
  const today = todayISO();
  const yStart = new Date(`${addDays(today, -1)}T00:00:00-03:00`).toISOString();
  const tStart = new Date(`${today}T00:00:00-03:00`).toISOString();
  const { data } = await supabase
    .from("approvals")
    .select("decisao, deliverable:deliverables!inner (client_id, client:clients!inner (nome))")
    .eq("workspace_id", workspaceId)
    .eq("decisao", "aprovado")
    .gte("created_at", yStart)
    .lt("created_at", tStart);
  const byClient = new Map<string, { nome: string; n: number }>();
  for (const a of data ?? []) {
    const k = a.deliverable.client_id;
    const cur = byClient.get(k) ?? { nome: a.deliverable.client.nome, n: 0 };
    cur.n += 1;
    byClient.set(k, cur);
  }
  return [...byClient.entries()].slice(0, 2).map(([id, c]) => ({
    key: `aprovou-${id}`,
    text: `${c.nome} aprovou ${c.n === 1 ? "1 post" : `${c.n} posts`} ontem.`,
  }));
}
