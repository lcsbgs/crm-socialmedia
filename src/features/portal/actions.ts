"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Ações públicas (sem login). Token, cliente e etapa são validados no banco, em funções
// que só o service role executa. Guardamos nome, data, IP, navegador e versão do post.
async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
  return { ip, ua: h.get("user-agent")?.slice(0, 300) ?? null };
}

const respondSchema = z
  .object({
    token: z.uuid(),
    deliverableId: z.uuid(),
    decisao: z.enum(["aprovado", "ajuste"]),
    autorNome: z.string().trim().min(1, "Informe seu nome").max(80),
    comentario: z.string().trim().max(2000).default(""),
    ponto: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullable().default(null),
  })
  .refine((v) => v.decisao === "aprovado" || v.comentario.length > 0, { message: "Conte o que precisa ser ajustado" });

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function respondToPost(input: z.input<typeof respondSchema>): Promise<Result> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const v = parsed.data;
  const meta = await requestMeta();
  const { error } = await createAdminClient().rpc("portal_respond", {
    p_token: v.token,
    p_deliverable_id: v.deliverableId,
    p_decisao: v.decisao,
    p_comentario: v.comentario,
    p_autor_nome: v.autorNome,
    p_ip: meta.ip ?? undefined,
    p_user_agent: meta.ua ?? undefined,
    p_ponto: v.ponto ?? undefined,
  });
  if (error) return { ok: false, error: error.code === "22023" ? error.message : "Não foi possível registrar. Tente de novo." };
  return { ok: true, message: v.decisao === "aprovado" ? "Aprovado. Obrigado!" : "Pedido de ajuste enviado. Obrigado!" };
}

export async function approveAll(input: { token: string; autorNome: string }): Promise<Result> {
  const token = z.uuid().safeParse(input.token);
  const nome = z.string().trim().min(1).max(80).safeParse(input.autorNome);
  if (!token.success || !nome.success) return { ok: false, error: "Informe seu nome." };
  const meta = await requestMeta();
  const { data, error } = await createAdminClient().rpc("portal_approve_all", {
    p_token: token.data,
    p_autor_nome: nome.data,
    p_ip: meta.ip ?? undefined,
    p_user_agent: meta.ua ?? undefined,
  });
  if (error) return { ok: false, error: "Não foi possível aprovar. Tente de novo." };
  return { ok: true, message: data === 1 ? "1 post aprovado. Obrigado!" : `${data} posts aprovados. Obrigado!` };
}

export async function respondToPlan(input: {
  token: string;
  competencia: string;
  decisao: "aprovado" | "ajuste";
  comentario: string;
  autorNome: string;
}): Promise<Result> {
  const v = z
    .object({
      token: z.uuid(),
      competencia: z.iso.date(),
      decisao: z.enum(["aprovado", "ajuste"]),
      comentario: z.string().trim().max(2000),
      autorNome: z.string().trim().min(1, "Informe seu nome").max(80),
    })
    .safeParse(input);
  if (!v.success) return { ok: false, error: v.error.issues[0]?.message ?? "Confira os dados." };
  const meta = await requestMeta();
  const { error } = await createAdminClient().rpc("portal_plan_respond", {
    p_token: v.data.token,
    p_competencia: v.data.competencia,
    p_decisao: v.data.decisao,
    p_comentario: v.data.comentario,
    p_autor_nome: v.data.autorNome,
    p_ip: meta.ip ?? undefined,
  });
  if (error) return { ok: false, error: error.code === "22023" ? error.message : "Não foi possível registrar." };
  return { ok: true, message: v.data.decisao === "aprovado" ? "Planejamento aprovado. Obrigado!" : "Recebemos seu pedido de ajuste." };
}
