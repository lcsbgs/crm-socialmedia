"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { metaAdapter } from "@/lib/integrations/meta";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";
import { integrationScopes, type IntegrationId } from "./catalog";
import { saveMetaConnection } from "./meta-store";

const idSchema = z.enum(["meta", "instagram", "google", "canva", "granola", "asaas", "assinatura"]);

// Botão "Conectar": em demonstração abre a tela de consentimento simulada; no modo real, o OAuth do provedor.
export async function startIntegration(formData: FormData) {
  await requireUser();
  const id = idSchema.parse(formData.get("id"));
  const slug = z.string().min(1).parse(formData.get("slug"));
  const back = String(formData.get("back") || `/w/${slug}/ajustes/integracoes`);
  if (isMockMode()) redirect(`/w/${slug}/ajustes/integracoes/conectar/${id}?back=${encodeURIComponent(back)}`);
  redirect(`/api/integrations/${id}/start?slug=${slug}&back=${encodeURIComponent(back)}`);
}

// Consentimento simulado aceito.
export async function confirmMockIntegration(formData: FormData) {
  const user = await requireUser();
  if (!isMockMode()) redirect("/w");
  const id = idSchema.parse(formData.get("id")) as IntegrationId;
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const back = String(formData.get("back") || "/w");

  if (id === "meta" || id === "instagram") {
    const adapter = metaAdapter()!;
    const token = await adapter.exchangeCode("simulado", "");
    const accounts = (await adapter.discoverAccounts(token.accessToken)).filter((a) => id === "meta" || a.plataforma === "instagram");
    const r = await saveMetaConnection({
      workspaceId,
      provider: id === "meta" ? "facebook" : "instagram",
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      simulated: true,
      contaNome: user.email,
      accounts,
      scopes: integrationScopes[id],
    });
    if ("error" in r) redirect(`${back}${back.includes("?") ? "&" : "?"}erro=conexao`);
  } else {
    const { saveIntegrationConnection } = await import("./store");
    await saveIntegrationConnection({ workspaceId, provider: id, simulated: true, conta: user.email, accessToken: `simulado-${id}`, scopes: integrationScopes[id] });
  }
  revalidatePath("/w", "layout");
  redirect(back);
}

export async function disconnectMeta(formData: FormData) {
  await requireUser();
  const id = z.uuid().parse(formData.get("connectionId"));
  const supabase = await createClient();
  await supabase.from("social_connections").delete().eq("id", id);
  revalidatePath("/w", "layout");
}

export async function assignAccountToClient(input: { workspaceId: string; accountId: string; clientId: string | null }) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("social_accounts")
    .update({ client_id: input.clientId })
    .eq("workspace_id", z.uuid().parse(input.workspaceId))
    .eq("id", z.uuid().parse(input.accountId));
  revalidatePath("/w", "layout");
  return error ? { error: "Só owner e admin ligam contas a clientes." } : { ok: true };
}

const scheduleSchema = z.object({
  deliverableId: z.uuid(),
  accountIds: z.array(z.uuid()).min(1, "Escolha onde publicar"),
  quando: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data e hora inválidas"),
});

export async function schedulePost(input: z.input<typeof scheduleSchema>) {
  await requireUser();
  const p = scheduleSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Confira os dados." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_deliverable", {
    p_deliverable_id: p.data.deliverableId,
    p_account_ids: p.data.accountIds,
    p_quando: new Date(`${p.data.quando}:00-03:00`).toISOString(),
  });
  revalidatePath("/w", "layout");
  if (error) return { error: error.code === "22023" ? error.message : "Não foi possível agendar." };
  return { ok: true };
}

export async function cancelSchedule(input: { deliverableId: string }) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_schedule", { p_deliverable_id: z.uuid().parse(input.deliverableId) });
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível cancelar." } : { ok: true };
}

export async function retryPublish(input: { jobId: string }) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("retry_publish_job", { p_job_id: z.uuid().parse(input.jobId) });
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível tentar de novo." } : { ok: true };
}

// Código que o app do Pauta no Canva usa para identificar a pessoa.
export async function generateCanvaAppCode(input: { workspaceId: string }) {
  const user = await requireUser();
  const { randomBytes } = await import("node:crypto");
  const code = randomBytes(18).toString("base64url");
  const supabase = await createClient();
  const { data: conn } = await supabase
    .from("integration_connections")
    .select("id, config")
    .eq("workspace_id", z.uuid().parse(input.workspaceId))
    .eq("provider", "canva")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return { error: "Conecte o Canva primeiro." };
  await supabase
    .from("integration_connections")
    .update({ config: { ...((conn.config as Record<string, unknown>) ?? {}), app_code: code } })
    .eq("id", conn.id);
  return { ok: true, code };
}
