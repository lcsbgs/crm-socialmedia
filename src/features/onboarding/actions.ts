"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const email = z.string().trim().toLowerCase().pipe(z.union([z.literal(""), z.email("E-mail inválido")]));

const studioSchema = z.object({
  workspaceId: z.uuid(),
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  estudio: z.string().trim().min(2, "Informe o nome do estúdio").max(80),
  modo: z.enum(["solo", "equipe", "agencia"]),
  convites: z
    .array(z.object({ email, role: z.enum(["admin", "member"]) }))
    .max(10),
});

// Passo 1: nome do estúdio, modo de trabalho e convites (guardados mesmo além do plano).
export async function saveStudioStep(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const emails = formData.getAll("convite_email").map(String);
  const roles = formData.getAll("convite_role").map(String);
  const parsed = studioSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    nome: formData.get("nome"),
    estudio: formData.get("estudio"),
    modo: formData.get("modo") || "solo",
    convites: emails.map((e, i) => ({ email: e, role: roles[i] || "member" })),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  await supabase.from("profiles").update({ nome: parsed.data.nome }).eq("id", user.id);
  const { error } = await supabase.rpc("save_studio_step", {
    p_workspace_id: parsed.data.workspaceId,
    p_nome: parsed.data.estudio,
    p_modo: parsed.data.modo,
  });
  if (error) return fromDbError(error);

  const convites = parsed.data.convites.filter((c) => c.email && c.email !== user.email.toLowerCase());
  for (const c of convites) {
    const { error: inviteError } = await supabase.from("invitations").insert({
      workspace_id: parsed.data.workspaceId,
      email: c.email,
      role: c.role,
      invited_by: user.id,
    });
    if (inviteError && inviteError.code !== "23505") return fromDbError(inviteError);
  }
  redirect("/onboarding/ia");
}

// Passo 2: escolha da IA. A conexão com o ChatGPT acontece em Ajustes > IA (Fase 6).
export async function saveAiStep(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const mode = formData.get("ai_mode") === "chatgpt" ? "chatgpt" : "creditos";
  const supabase = await createClient();
  await supabase.from("workspaces").update({ ai_mode: mode }).eq("id", workspaceId);
  redirect(mode === "chatgpt" ? "/onboarding/ia?conectar=chatgpt" : "/onboarding/cliente");
}

export async function skipOnboarding() {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("finish_onboarding");
  redirect("/w");
}

const firstClientSchema = z.object({
  workspaceId: z.uuid(),
  marca: z.string().trim().min(1, "Informe o nome da marca").max(120),
  aprovador: z.string().trim().max(120).optional().default(""),
  pacote: z.string().optional().default(""),
  responsaveis: z.array(z.uuid()).max(50),
  convidados: z.array(z.uuid()).max(50),
});

// Passo 3: primeiro cliente, pacote e responsáveis; monta o mês e abre a pauta.
export async function saveFirstClientStep(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = firstClientSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    marca: formData.get("marca"),
    aprovador: formData.get("aprovador") ?? "",
    pacote: formData.get("pacote") ?? "",
    responsaveis: formData.getAll("responsavel").map(String),
    convidados: formData.getAll("convidado").map(String),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();

  let packageId = d.pacote && d.pacote !== "novo" ? d.pacote : null;
  if (!packageId) {
    const { data: pkg, error } = await supabase
      .from("package_templates")
      .insert({
        workspace_id: d.workspaceId,
        nome: "Essencial",
        itens: [
          { tipo: "Post", quantidade: 3, cadencia: "semanal" },
          { tipo: "Reunião", quantidade: 1, cadencia: "mensal" },
          { tipo: "Relatório", quantidade: 1, cadencia: "mensal" },
        ],
      })
      .select("id")
      .single();
    if (error || !pkg) return fromDbError(error);
    packageId = pkg.id;
  }

  // "(54) 99999-0000, Mariana": telefone e nome de quem aprova.
  const [fone, ...resto] = d.aprovador.split(",");
  const contatos = d.aprovador
    ? [{ nome: resto.join(",").trim() || "Quem aprova", cargo: "aprova conteúdo", telefone: fone.trim(), email: "" }]
    : [];

  const { data: client, error } = await supabase
    .from("clients")
    .insert({ workspace_id: d.workspaceId, nome: d.marca, package_template_id: packageId, contatos })
    .select("id")
    .single();
  if (error || !client) return fromDbError(error);

  if (d.responsaveis.length) {
    const { data: me } = await supabase.auth.getUser();
    const ids = Array.from(new Set([...(me.user ? [me.user.id] : []), ...d.responsaveis]));
    await supabase.rpc("set_member_clients", { p_workspace_id: d.workspaceId, p_user_id: ids[0], p_client_ids: [client.id] });
    for (const uid of ids.slice(1)) {
      const { data: current } = await supabase
        .from("client_assignees")
        .select("client_id")
        .eq("workspace_id", d.workspaceId)
        .eq("user_id", uid);
      await supabase.rpc("set_member_clients", {
        p_workspace_id: d.workspaceId,
        p_user_id: uid,
        p_client_ids: [...(current ?? []).map((c) => c.client_id), client.id],
      });
    }
  }
  for (const inviteId of d.convidados) {
    const { data: inv } = await supabase.from("invitations").select("client_ids").eq("id", inviteId).maybeSingle();
    if (inv) {
      await supabase
        .from("invitations")
        .update({ client_ids: Array.from(new Set([...(inv.client_ids ?? []), client.id])) })
        .eq("id", inviteId);
    }
  }

  const today = new Date();
  const competencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  await supabase.rpc("generate_month", { p_workspace_id: d.workspaceId, p_competencia: competencia });
  await supabase.rpc("finish_onboarding");

  const { data: ws } = await supabase.from("workspaces").select("slug").eq("id", d.workspaceId).single();
  redirect(ws ? `/w/${ws.slug}` : "/w");
}
