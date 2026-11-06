"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contactSchema } from "@/features/clients/schemas";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { mediaKind, signMedia, type Media } from "./queries";
import type { DeliverableFormat, DeliverableStatus } from "./schemas";

export type DeliverableDetail = {
  id: string;
  workspaceId: string;
  titulo: string | null;
  slot_label: string | null;
  formato: DeliverableFormat;
  status: DeliverableStatus;
  data_publicacao: string | null;
  legenda: string | null;
  responsavel_id: string | null;
  created_at: string;
  pilar: string | null;
  prazo_interno: string | null;
  hora_publicacao: string | null;
  rodadas: number;
  limiteRodadas: number;
  checklist: { texto: string; feito: boolean }[];
  canal: "instagram" | "facebook" | "ambos";
  versaoAtual: number;
  versions: { numero: number; origem: string; created_at: string; legenda: string | null; thumb: string | null }[];
  pilares: string[];
  client: {
    id: string;
    nome: string;
    cor: number;
    portalUrl: string;
    contatoNome: string;
    contatoTelefone: string | null;
    instagram: string | null;
  };
  media: Media[];
  comments: {
    id: string;
    corpo: string;
    created_at: string;
    author: { id: string; nome: string } | null;
    mine: boolean;
  }[];
  activity: {
    id: string;
    tipo: string;
    de: string | null;
    para: string | null;
    created_at: string;
    actor: string | null;
  }[];
  approvals: {
    decisao: "aprovado" | "ajuste";
    comentario: string | null;
    autor_nome: string;
    created_at: string;
  }[];
  members: { id: string; nome: string }[];
};

const ids = z.object({ workspaceId: z.uuid(), id: z.uuid() });

export async function getDeliverableDetail(input: {
  workspaceId: string;
  id: string;
}): Promise<DeliverableDetail | null> {
  const user = await requireUser();
  const parsed = ids.safeParse(input);
  if (!parsed.success) return null;
  const { workspaceId, id } = parsed.data;
  const supabase = await createClient();

  const [{ data: d }, { data: comments }, { data: activity }, { data: approvals }, { data: members }] =
    await Promise.all([
      supabase
        .from("deliverables")
        .select(
          "id, titulo, slot_label, formato, status, data_publicacao, legenda, responsavel_id, created_at, midia_urls, pilar, prazo_interno, hora_publicacao, rodadas, checklist, canal, versao_atual, client:clients!inner (id, nome, cor, contatos, portal_token, instagram_handle, package:package_templates (limite_rodadas))",
        )
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("deliverable_comments")
        .select("id, corpo, created_at, author:profiles (id, nome)")
        .eq("workspace_id", workspaceId)
        .eq("deliverable_id", id)
        .order("created_at"),
      supabase
        .from("deliverable_activity")
        .select("id, tipo, de, para, created_at, actor:profiles (nome)")
        .eq("workspace_id", workspaceId)
        .eq("deliverable_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("approvals")
        .select("decisao, comentario, autor_nome, created_at")
        .eq("workspace_id", workspaceId)
        .eq("deliverable_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_members")
        .select("user_id, profile:profiles!inner (nome)")
        .eq("workspace_id", workspaceId),
    ]);
  if (!d) return null;

  const [{ data: versions }, { data: strategy }] = await Promise.all([
    supabase
      .from("deliverable_versions")
      .select("numero, origem, created_at, legenda, midia_paths")
      .eq("deliverable_id", id)
      .order("numero", { ascending: false })
      .limit(20),
    supabase.from("client_strategies").select("pilares").eq("client_id", d.client.id).maybeSingle(),
  ]);
  const versionThumbs = await signMedia((versions ?? []).map((v) => v.midia_paths[0]).filter(Boolean));
  const signed = await signMedia(d.midia_urls);
  const contato = z.array(contactSchema).catch([]).parse(d.client.contatos)[0];

  return {
    id: d.id,
    workspaceId,
    titulo: d.titulo,
    slot_label: d.slot_label,
    formato: d.formato,
    status: d.status,
    data_publicacao: d.data_publicacao,
    legenda: d.legenda,
    responsavel_id: d.responsavel_id,
    created_at: d.created_at,
    pilar: d.pilar,
    prazo_interno: d.prazo_interno,
    hora_publicacao: d.hora_publicacao,
    rodadas: d.rodadas,
    limiteRodadas: d.client.package?.limite_rodadas ?? 2,
    checklist: z.array(z.object({ texto: z.string(), feito: z.boolean() })).catch([]).parse(d.checklist),
    canal: (d.canal as "instagram" | "facebook" | "ambos") ?? "instagram",
    versaoAtual: d.versao_atual,
    versions: (versions ?? []).map((v) => ({
      numero: v.numero,
      origem: v.origem,
      created_at: v.created_at,
      legenda: v.legenda,
      thumb: v.midia_paths[0] ? (versionThumbs.get(v.midia_paths[0]) ?? null) : null,
    })),
    pilares: z.array(z.object({ nome: z.string() })).catch([]).parse(strategy?.pilares ?? []).map((p) => p.nome),
    client: {
      id: d.client.id,
      nome: d.client.nome,
      cor: d.client.cor ?? 0,
      portalUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/p/${d.client.portal_token}`,
      contatoNome: contato?.nome ?? "",
      contatoTelefone: contato?.telefone || null,
      instagram: d.client.instagram_handle,
    },
    media: d.midia_urls.map((path) => ({ path, url: signed.get(path) ?? null, kind: mediaKind(path) })),
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      corpo: c.corpo,
      created_at: c.created_at,
      author: c.author ? { id: c.author.id, nome: c.author.nome } : null,
      mine: c.author?.id === user.id,
    })),
    activity: (activity ?? []).map((a) => ({
      id: a.id,
      tipo: a.tipo,
      de: a.de,
      para: a.para,
      created_at: a.created_at,
      actor: a.actor?.nome ?? null,
    })),
    approvals: approvals ?? [],
    members: (members ?? []).map((m) => ({ id: m.user_id, nome: m.profile.nome || "Sem nome" })),
  };
}

const patchSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .max(200)
      .transform((v) => v || null),
    legenda: z
      .string()
      .max(5000)
      .transform((v) => v.trim() || null),
    formato: z.enum(["post", "reels", "carrossel", "story", "relatorio"]),
    status: z.enum(["planejar", "produzir", "em_aprovacao", "ajuste", "aprovado", "agendado", "publicado"]),
    data_publicacao: z.iso.date().nullable(),
    responsavel_id: z.uuid().nullable(),
    pilar: z.string().trim().max(40).nullable(),
    prazo_interno: z.iso.date().nullable(),
    hora_publicacao: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    canal: z.enum(["instagram", "facebook", "ambos"]),
    checklist: z.array(z.object({ texto: z.string().trim().min(1).max(120), feito: z.boolean() })).max(20),
  })
  .partial();

// Atualiza um ou mais campos da entrega (o painel salva campo a campo).
export async function updateDeliverableFields(input: {
  workspaceId: string;
  id: string;
  patch: z.input<typeof patchSchema>;
}) {
  await requireUser();
  const { workspaceId, id } = ids.parse(input);
  const patch = patchSchema.safeParse(input.patch);
  if (!patch.success) return { error: patch.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update(patch.data)
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) {
    if (error.code === "23514" && error.message.includes("nome"))
      return { error: "Dê um título para esta entrega." };
    if (error.code === "23514") return { error: error.message };
    return { error: "Não foi possível salvar." };
  }
  revalidatePath("/w", "layout");
  return { ok: true };
}

export async function addComment(input: { workspaceId: string; id: string; corpo: string }) {
  const user = await requireUser();
  const { workspaceId, id } = ids.parse(input);
  const corpo = z.string().trim().min(1, "Escreva um comentário").max(4000).safeParse(input.corpo);
  if (!corpo.success) return { error: corpo.error.issues[0]?.message ?? "Comentário inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverable_comments")
    .insert({ workspace_id: workspaceId, deliverable_id: id, author_id: user.id, corpo: corpo.data });
  return error ? { error: "Não foi possível comentar." } : { ok: true };
}

export async function deleteComment(input: { workspaceId: string; id: string }) {
  await requireUser();
  const { workspaceId, id } = ids.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverable_comments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  return error ? { error: "Não foi possível apagar." } : { ok: true };
}

// Nova versão do post (arte e legenda atuais ficam guardadas com número).
export async function saveDeliverableVersion(input: { workspaceId: string; id: string; origem?: "upload" | "canva" | "drive" | "edicao" }) {
  await requireUser();
  const { id } = ids.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_deliverable_version", {
    p_deliverable_id: id,
    p_origem: input.origem ?? "edicao",
  });
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível salvar a versão." } : { ok: true, numero: data };
}
