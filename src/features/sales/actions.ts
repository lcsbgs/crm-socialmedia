"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { describeItems } from "@/features/packages/schemas";
import { runAi } from "@/lib/ai";
import { diagnosisPrompt } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { formatBRL, formatDate, parseMoney } from "@/lib/format";
import { signatureAdapter, type SignatureProviderName } from "@/lib/integrations/signature";
import { createClient } from "@/lib/supabase/server";
import { defaultContractTemplate, fillTemplate } from "./contract-template";

type Result = { ok: true; id?: string } | { error: string };
const etapas = ["novo", "conversa", "proposta", "negociacao", "ganho", "perdido"] as const;

function done(): Result {
  revalidatePath("/w", "layout");
  return { ok: true };
}

export async function createLead(input: { workspaceId: string; nome: string; contato?: string; telefone?: string; email?: string; segmento?: string; origem?: string }): Promise<Result> {
  await requireUser();
  const nome = input.nome.trim();
  if (!nome) return { error: "Informe o nome do lead." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: z.uuid().parse(input.workspaceId),
      nome: nome.slice(0, 120),
      contato_nome: input.contato?.trim() || null,
      telefone: input.telefone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      segmento: input.segmento?.trim() || null,
      origem: input.origem?.trim() || null,
      ordem: Date.now() / 1e6,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Só owner e admin mexem no comercial." };
  revalidatePath("/w", "layout");
  return { ok: true, id: data.id };
}

export async function moveLead(input: { id: string; etapa: (typeof etapas)[number]; motivo?: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ etapa: z.enum(etapas).parse(input.etapa), ...(input.etapa === "perdido" ? { perdido_motivo: input.motivo ?? null } : {}) })
    .eq("id", z.uuid().parse(input.id));
  return error ? { error: "Não foi possível mover." } : done();
}

export async function updateLeadNotes(input: { id: string; notas: string; valor?: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ notas: input.notas.slice(0, 5000) || null, valor_estimado: input.valor ? parseMoney(input.valor) : null })
    .eq("id", z.uuid().parse(input.id));
  return error ? { error: "Não foi possível salvar." } : done();
}

export async function deleteLead(input: { id: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", z.uuid().parse(input.id));
  return done();
}

export async function createProposal(formData: FormData) {
  await requireUser();
  const leadId = z.uuid().parse(formData.get("leadId"));
  const slug = String(formData.get("slug"));
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("workspace_id, nome").eq("id", leadId).single();
  if (!lead) redirect(`/w/${slug}/comercial`);
  const { data: pkg } = await supabase
    .from("package_templates")
    .select("id, itens, preco")
    .eq("workspace_id", lead.workspace_id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const validade = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("proposals")
    .insert({
      workspace_id: lead.workspace_id,
      lead_id: leadId,
      titulo: `Proposta para ${lead.nome}`,
      package_template_id: pkg?.id ?? null,
      itens: pkg?.itens ?? [],
      valor_mensal: pkg?.preco ?? 0,
      validade,
    })
    .select("id")
    .single();
  await supabase.from("leads").update({ etapa: "proposta" }).eq("id", leadId).in("etapa", ["novo", "conversa"]);
  revalidatePath("/w", "layout");
  redirect(`/w/${slug}/comercial/propostas/${data?.id}`);
}

const proposalSchema = z.object({
  id: z.uuid(),
  titulo: z.string().trim().min(1).max(200),
  packageId: z.string().optional(),
  valor: z.string(),
  duracao: z.coerce.number().int().min(1).max(36),
  vencimento: z.coerce.number().int().min(1).max(28),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  diagnostico: z.string().max(5000),
  observacoes: z.string().max(5000),
});

export async function saveProposal(input: z.input<typeof proposalSchema>): Promise<Result> {
  await requireUser();
  const p = proposalSchema.safeParse(input);
  if (!p.success) return { error: "Confira os campos." };
  const supabase = await createClient();
  let itens: unknown = undefined;
  if (p.data.packageId) {
    const { data: pkg } = await supabase.from("package_templates").select("itens").eq("id", p.data.packageId).maybeSingle();
    itens = pkg?.itens;
  }
  const { error } = await supabase
    .from("proposals")
    .update({
      titulo: p.data.titulo,
      package_template_id: p.data.packageId || null,
      ...(itens !== undefined ? { itens: itens as never } : {}),
      valor_mensal: parseMoney(p.data.valor) ?? 0,
      duracao_meses: p.data.duracao,
      dia_vencimento: p.data.vencimento,
      validade: p.data.validade || null,
      diagnostico: p.data.diagnostico || null,
      observacoes: p.data.observacoes || null,
    })
    .eq("id", p.data.id);
  return error ? { error: "Não foi possível salvar." } : done();
}

export async function sendProposal(input: { id: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .update({ status: "enviada", enviada_em: new Date().toISOString() })
    .eq("id", z.uuid().parse(input.id))
    .in("status", ["rascunho", "enviada"]);
  return error ? { error: "Não foi possível enviar." } : done();
}

export async function diagnosisAi(input: { workspaceId: string; proposalId: string }) {
  await requireUser();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("proposals")
    .select("itens, lead:leads!inner (nome, segmento, notas)")
    .eq("id", z.uuid().parse(input.proposalId))
    .single();
  if (!p) return { ok: false as const, error: "Proposta não encontrada." };
  return runAi(z.uuid().parse(input.workspaceId), diagnosisPrompt, {
    empresa: p.lead.nome,
    segmento: p.lead.segmento,
    notas: p.lead.notas,
    pacote: describeItems(p.itens) || "pacote mensal",
  });
}

// Gera o contrato a partir da proposta aceita e manda para assinatura.
export async function generateContract(input: { proposalId: string; provider?: SignatureProviderName }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("proposals")
    .select("id, workspace_id, lead_id, valor_mensal, duracao_meses, dia_vencimento, itens, status, package:package_templates (nome, limite_rodadas), lead:leads!inner (nome, contato_nome, email, telefone)")
    .eq("id", z.uuid().parse(input.proposalId))
    .single();
  if (!p) return { error: "Proposta não encontrada." };
  if (p.status !== "aceita") return { error: "O contrato sai depois que o cliente aceita a proposta." };
  const { data: ws } = await supabase.from("workspaces").select("nome, contrato_modelo").eq("id", p.workspace_id).single();
  const inicio = new Date();
  const fim = new Date(inicio);
  fim.setMonth(fim.getMonth() + p.duracao_meses);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const corpo = fillTemplate(ws?.contrato_modelo || defaultContractTemplate, {
    cliente: p.lead.nome,
    cliente_documento: "",
    contato: p.lead.contato_nome ?? p.lead.nome,
    estudio: ws?.nome ?? "",
    pacote: p.package?.nome ?? "combinado",
    itens: describeItems(p.itens) || "conforme proposta",
    valor: formatBRL(p.valor_mensal),
    vencimento: String(p.dia_vencimento),
    duracao: String(p.duracao_meses),
    inicio: formatDate(iso(inicio)),
    fim: formatDate(iso(fim)),
    rodadas: String(p.package?.limite_rodadas ?? 2),
    data: formatDate(iso(inicio), "long"),
  });
  const provider = input.provider ?? ((process.env.SIGNATURE_PROVIDER as SignatureProviderName) || "simples");
  const adapter = signatureAdapter(provider);
  let doc: { docId: string | null; signUrl: string | null } = { docId: null, signUrl: null };
  try {
    doc = await adapter.createDocument({
      titulo: `Contrato ${p.lead.nome}`,
      corpo,
      signatario: { nome: p.lead.contato_nome ?? p.lead.nome, email: p.lead.email, telefone: p.lead.telefone },
    });
  } catch {
    return { error: "O provedor de assinatura recusou. Tente a assinatura simples." };
  }
  const { data: c, error } = await supabase
    .from("contracts")
    .insert({
      workspace_id: p.workspace_id,
      lead_id: p.lead_id,
      proposal_id: p.id,
      corpo,
      status: "enviado",
      provider: adapter.simulated ? "simples" : adapter.name,
      provider_doc_id: doc.docId,
      provider_sign_url: doc.signUrl,
      enviado_em: new Date().toISOString(),
      inicio: iso(inicio),
      fim: iso(fim),
    })
    .select("id")
    .single();
  if (error || !c) return { error: "Não foi possível gerar o contrato." };
  revalidatePath("/w", "layout");
  return { ok: true, id: c.id };
}

export async function saveContractTemplate(input: { workspaceId: string; texto: string }): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ contrato_modelo: input.texto.trim().slice(0, 20000) || null })
    .eq("id", z.uuid().parse(input.workspaceId));
  return error ? { error: "Só owner e admin mudam o modelo." } : done();
}
