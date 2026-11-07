"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contactSchema } from "@/features/clients/schemas";
import { requireUser } from "@/lib/auth";
import { billingProvider } from "@/lib/billing";
import { emailAdapter } from "@/lib/email";
import { formatBRL, formatDate, formatMonth, parseMoney } from "@/lib/format";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message?: string } | { error: string };

export type FinanceConfig = {
  provider: "manual" | "asaas";
  dias_antes: number;
  auto_cobranca: boolean;
  auto_whatsapp: boolean;
  auto_baixa: boolean;
  auto_nfse: boolean;
  contador_email: string | null;
};

export async function readFinanceConfig(raw: unknown): Promise<FinanceConfig> {
  const r = (raw ?? {}) as Partial<FinanceConfig>;
  return {
    provider: r.provider === "asaas" ? "asaas" : "manual",
    dias_antes: Number(r.dias_antes ?? 5),
    auto_cobranca: !!r.auto_cobranca,
    auto_whatsapp: !!r.auto_whatsapp,
    auto_baixa: r.auto_baixa !== false,
    auto_nfse: !!r.auto_nfse,
    contador_email: r.contador_email ?? null,
  };
}

function done(message?: string): Result {
  revalidatePath("/w", "layout");
  return { ok: true, message };
}

export async function saveFinanceConfig(input: { workspaceId: string; config: FinanceConfig }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const email = input.config.contador_email?.trim() || null;
  if (email && !z.email().safeParse(email).success) return { error: "E-mail do contador inválido." };
  const { error } = await supabase
    .from("workspaces")
    .update({ finance_config: { ...input.config, contador_email: email } })
    .eq("id", z.uuid().parse(input.workspaceId));
  return error ? { error: "Só owner e admin mudam o financeiro." } : done("Salvo.");
}

const chargeSchema = z.object({
  workspaceId: z.uuid(),
  clientId: z.uuid(),
  descricao: z.string().trim().min(1, "Descreva a cobrança").max(200),
  valor: z.string(),
  vencimento: z.iso.date(),
});

export async function createCharge(input: z.input<typeof chargeSchema>): Promise<Result> {
  await requireUser();
  const p = chargeSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Confira os campos." };
  const valor = parseMoney(p.data.valor);
  if (!valor || valor <= 0) return { error: "Informe o valor." };
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    workspace_id: p.data.workspaceId,
    client_id: p.data.clientId,
    competencia: `${p.data.vencimento.slice(0, 7)}-01`,
    valor,
    vencimento: p.data.vencimento,
    origem: "avulsa",
    descricao: p.data.descricao,
  });
  return error ? { error: "Não foi possível criar a cobrança." } : done("Cobrança criada.");
}

// Gera boleto e Pix no provedor configurado.
export async function generateBoleto(input: { workspaceId: string; paymentId: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const [{ data: pg }, { data: ws }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, valor, vencimento, competencia, descricao, origem, client:clients!inner (nome, contatos)")
      .eq("workspace_id", input.workspaceId)
      .eq("id", z.uuid().parse(input.paymentId))
      .single(),
    supabase.from("workspaces").select("finance_config").eq("id", input.workspaceId).single(),
  ]);
  if (!pg) return { error: "Cobrança não encontrada." };
  const cfg = await readFinanceConfig(ws?.finance_config);
  if (cfg.provider === "manual") return { error: "Conecte o Asaas em Ajustes, Integrações, e escolha Asaas aqui na cobrança automática." };
  const provider = billingProvider(cfg.provider);
  const contato = z.array(contactSchema).catch([]).parse(pg.client.contatos)[0];
  try {
    const r = await provider.createCharge({
      paymentId: pg.id,
      valor: Number(pg.valor),
      vencimento: pg.vencimento,
      descricao: pg.descricao ?? `Mensalidade de ${formatMonth(pg.competencia).toLowerCase()}`,
      metodo: "boleto",
      customer: { nome: pg.client.nome, email: contato?.email, telefone: contato?.telefone },
    });
    if (!r) return { error: "Provedor sem cobrança automática." };
    await supabase
      .from("payments")
      .update({ provider: "asaas", provider_id: r.providerId, boleto_url: r.boletoUrl, pix_code: r.pixCode, cobranca_gerada_em: new Date().toISOString(), simulated: provider.simulated })
      .eq("id", pg.id);
  } catch (e) {
    return { error: e instanceof Error ? `Asaas: ${e.message}` : "O Asaas recusou a cobrança." };
  }
  return done("Boleto e Pix gerados.");
}

// Emite (ou corrige e reemite) a NFS-e de uma cobrança paga.
export async function issueInvoice(input: { workspaceId: string; paymentId: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data: pg } = await supabase
    .from("payments")
    .select("id, valor, competencia, descricao, status, provider, provider_id, client:clients!inner (nome)")
    .eq("workspace_id", input.workspaceId)
    .eq("id", z.uuid().parse(input.paymentId))
    .single();
  if (!pg) return { error: "Cobrança não encontrada." };
  if (pg.status !== "pago") return { error: "A nota sai depois do pagamento." };
  if (pg.provider !== "asaas" || !pg.provider_id) return { error: "Nota automática só para cobranças geradas pelo Asaas. Emita no site da prefeitura e anexe." };
  const provider = billingProvider("asaas");
  try {
    const r = await provider.issueInvoice({
      providerId: pg.provider_id,
      descricao: pg.descricao ?? `Gestão de redes sociais, ${formatMonth(pg.competencia).toLowerCase()}, ${pg.client.nome}`,
      valor: Number(pg.valor),
    });
    if (!r) return { error: "Provedor sem nota fiscal." };
    await supabase
      .from("payments")
      .update({ nfse_status: r.status, nfse_provider_id: r.invoiceId, nfse_numero: r.numero ?? null, nfse_erro: null })
      .eq("id", pg.id);
  } catch (e) {
    await supabase.from("payments").update({ nfse_status: "erro", nfse_erro: e instanceof Error ? e.message : "Erro na emissão" }).eq("id", pg.id);
    return { error: "A emissão falhou. Confira o cadastro na prefeitura no Asaas." };
  }
  return done("Nota fiscal pedida.");
}

// Escopo extra a cobrar: soma na próxima cobrança em aberto do cliente.
export async function addScopeToNextCharge(input: { workspaceId: string; scopeId: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("scope_requests")
    .select("id, client_id, descricao, valor_sugerido, status")
    .eq("workspace_id", input.workspaceId)
    .eq("id", z.uuid().parse(input.scopeId))
    .single();
  if (!s || s.status !== "pendente") return { error: "Pedido extra não encontrado." };
  if (!s.valor_sugerido) return { error: "Defina o valor do extra na aba Escopo do cliente." };
  const { data: next } = await supabase
    .from("payments")
    .select("id, valor, descricao, provider_id")
    .eq("client_id", s.client_id)
    .neq("status", "pago")
    .is("provider_id", null)
    .order("vencimento")
    .limit(1)
    .maybeSingle();
  if (!next) return { error: "Nenhuma cobrança em aberto sem boleto gerado para somar." };
  await supabase
    .from("payments")
    .update({ valor: Number(next.valor) + Number(s.valor_sugerido), descricao: [next.descricao, `+ ${s.descricao}`].filter(Boolean).join(" ") })
    .eq("id", next.id);
  await supabase.from("scope_requests").update({ status: "cobrado" }).eq("id", s.id);
  return done("Extra somado na próxima cobrança.");
}

const expenseSchema = z.object({
  workspaceId: z.uuid(),
  descricao: z.string().trim().min(1).max(200),
  categoria: z.enum(["freelancer", "ferramentas", "impostos", "anuncios", "equipe", "outros"]),
  valor: z.string(),
  data: z.iso.date(),
  clientId: z.string().optional(),
});

export async function createExpense(input: z.input<typeof expenseSchema>): Promise<Result> {
  await requireUser();
  const p = expenseSchema.safeParse(input);
  if (!p.success) return { error: "Confira os campos da despesa." };
  const valor = parseMoney(p.data.valor);
  if (valor === null) return { error: "Valor inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    workspace_id: p.data.workspaceId,
    descricao: p.data.descricao,
    categoria: p.data.categoria,
    valor,
    data: p.data.data,
    client_id: p.data.clientId || null,
  });
  return error ? { error: "Não foi possível lançar." } : done("Despesa lançada.");
}

export async function deleteExpense(input: { id: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", z.uuid().parse(input.id));
  return done();
}

// Demonstração: simula o webhook do Asaas confirmando o pagamento (e emitindo a nota, se ligado).
export async function simulatePayment(input: { workspaceId: string; paymentId: string }): Promise<Result> {
  await requireUser();
  if (!isMockMode()) return { error: "Só em modo demonstração." };
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("finance_config").eq("id", input.workspaceId).single();
  const cfg = await readFinanceConfig(ws?.finance_config);
  await supabase
    .from("payments")
    .update({ status: "pago", pago_em: new Date().toISOString().slice(0, 10), metodo: "pix" })
    .eq("id", z.uuid().parse(input.paymentId));
  if (cfg.auto_nfse) await issueInvoice(input);
  return done("Pagamento simulado recebido.");
}

// Fechamento do mês para o contador: extrato, notas e despesas em um e-mail com links.
export async function closeMonth(input: { workspaceId: string; month: string }): Promise<Result> {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(input.month);
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("nome, finance_config").eq("id", workspaceId).single();
  const cfg = await readFinanceConfig(ws?.finance_config);
  if (!cfg.contador_email) return { error: "Informe o e-mail do contador na cobrança automática." };
  const start = `${month}-01`;
  const end = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);
  const [{ data: pays }, { data: exps }] = await Promise.all([
    supabase.from("payments").select("valor, pago_em, metodo, nfse_numero, nfse_pdf_url, nfse_xml_url, client:clients!inner (nome)").eq("workspace_id", workspaceId).eq("status", "pago").gte("pago_em", start).lte("pago_em", end),
    supabase.from("expenses").select("descricao, categoria, valor, data").eq("workspace_id", workspaceId).gte("data", start).lte("data", end),
  ]);
  const recebido = (pays ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const despesas = (exps ?? []).reduce((s, e) => s + Number(e.valor), 0);
  const linhas = [
    `Fechamento de ${formatMonth(start).toLowerCase()} do ${ws?.nome}`,
    "",
    "Recebimentos (cliente; valor; data; forma; NFS-e; PDF; XML)",
    ...(pays ?? []).map((p) => [p.client.nome, formatBRL(p.valor), p.pago_em ? formatDate(p.pago_em) : "", p.metodo ?? "", p.nfse_numero ?? "sem nota", p.nfse_pdf_url ?? "", p.nfse_xml_url ?? ""].join("; ")),
    `Total recebido: ${formatBRL(recebido)}`,
    "",
    "Despesas (descrição; categoria; valor; data)",
    ...(exps ?? []).map((e) => [e.descricao, e.categoria, formatBRL(e.valor), formatDate(e.data)].join("; ")),
    `Total de despesas: ${formatBRL(despesas)}`,
  ];
  const sent = await emailAdapter().send({ to: cfg.contador_email, subject: `Fechamento de ${formatMonth(start).toLowerCase()}`, text: linhas.join("\n") });
  if (!sent.ok) return { error: sent.error };
  await supabase.from("accounting_closings").upsert(
    { workspace_id: workspaceId, competencia: start, enviado_para: cfg.contador_email, resumo: { recebido, despesas, notas: (pays ?? []).filter((p) => p.nfse_numero).length }, simulated: sent.simulated, enviado_em: new Date().toISOString() },
    { onConflict: "workspace_id,competencia" },
  );
  return done(sent.simulated ? "Fechamento registrado. Envio de e-mail simulado." : `Enviado para ${cfg.contador_email}.`);
}
