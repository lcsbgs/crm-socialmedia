"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runAi } from "@/lib/ai";
import { captionPrompt, ctaPrompt, shortenPrompt, strategyPrompt, tonePrompt, type BrandContext } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";
import { formatLabels } from "@/features/deliverables/schemas";

async function brandFor(clientId: string): Promise<BrandContext | null> {
  const supabase = await createClient();
  const [{ data: c }, { data: kit }] = await Promise.all([
    supabase.from("clients").select("nome, segmento, briefing, tom_de_voz").eq("id", clientId).maybeSingle(),
    supabase.from("brand_kits").select("tom, evitar").eq("client_id", clientId).maybeSingle(),
  ]);
  if (!c) return null;
  return {
    cliente: c.nome,
    segmento: c.segmento,
    briefing: [c.briefing, c.tom_de_voz].filter(Boolean).join("\n") || null,
    tom: kit?.tom ?? [],
    evitar: kit?.evitar ?? [],
  };
}

const captionInput = z.object({
  workspaceId: z.uuid(),
  deliverableId: z.uuid(),
  acao: z.enum(["escrever", "encurtar", "acolhedor", "chamada"]),
  legenda: z.string().max(5000).default(""),
});

// Ações de IA da legenda. Não salvam: devolvem o texto para a pessoa revisar.
export async function captionAi(input: z.input<typeof captionInput>) {
  await requireUser();
  const i = captionInput.parse(input);
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deliverables")
    .select("titulo, slot_label, formato, pilar, client_id")
    .eq("workspace_id", i.workspaceId)
    .eq("id", i.deliverableId)
    .maybeSingle();
  if (!d) return { ok: false as const, error: "Post não encontrado." };
  const brand = await brandFor(d.client_id);
  if (!brand) return { ok: false as const, error: "Cliente não encontrado." };
  const ctx = { ...brand, pilar: d.pilar };
  const legenda = i.legenda.trim();
  if (i.acao !== "escrever" && !legenda) return { ok: false as const, error: "Escreva ou gere uma legenda primeiro." };
  if (i.acao === "escrever")
    return runAi(i.workspaceId, captionPrompt, { ...ctx, titulo: d.titulo ?? d.slot_label ?? "post", formato: formatLabels[d.formato], ideia: legenda || undefined });
  if (i.acao === "encurtar") return runAi(i.workspaceId, shortenPrompt, { ...ctx, legenda });
  if (i.acao === "acolhedor") return runAi(i.workspaceId, tonePrompt, { ...ctx, legenda, alvo: "mais acolhedor" });
  return runAi(i.workspaceId, ctaPrompt, { ...ctx, legenda, objetivo: "encomenda ou contato pelo direct" });
}

// Rascunho de estratégia (a pessoa revisa antes de salvar).
export async function strategyDraftAi(input: { workspaceId: string; clientId: string; objetivo?: string }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const brand = await brandFor(z.uuid().parse(input.clientId));
  if (!brand) return { ok: false as const, error: "Cliente não encontrado." };
  const r = await runAi(workspaceId, strategyPrompt, { ...brand, objetivo: input.objetivo });
  if (!r.ok) return r;
  try {
    const json = JSON.parse(r.text.replace(/^```json|```$/g, "").trim());
    return { ...r, draft: json as unknown };
  } catch {
    return { ok: false as const, error: "A IA devolveu um rascunho que não deu para ler. Tente de novo." };
  }
}

// Conectar o plano do ChatGPT. Em modo demonstração cria uma conexão simulada.
export async function connectChatgpt(formData: FormData) {
  const user = await requireUser();
  const back = String(formData.get("back") ?? "/w");
  if (!isMockMode()) redirect(`/api/ai/chatgpt/start?back=${encodeURIComponent(back)}`);
  const supabase = await createClient();
  await supabase.from("ai_connections").upsert(
    {
      user_id: user.id,
      provider: "chatgpt",
      status: "ativa",
      conta: user.email,
      simulated: true,
      access_token_enc: encryptSecret(`simulado-${user.id}`),
      scopes: ["openid", "profile", "email", "uso-do-plano"],
    },
    { onConflict: "user_id,provider" },
  );
  revalidatePath("/w", "layout");
  redirect(back.startsWith("/") ? back : "/w");
}

export async function disconnectChatgpt() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("ai_connections").delete().eq("user_id", user.id).eq("provider", "chatgpt");
  revalidatePath("/w", "layout");
}

// Só em demonstração: simula o limite semanal acabando (para ver o aviso de fallback).
export async function simulateChatgptLimit(formData: FormData) {
  const user = await requireUser();
  if (!isMockMode()) return;
  const supabase = await createClient();
  const status = formData.get("status") === "limite" ? "limite" : "ativa";
  await supabase.from("ai_connections").update({ status }).eq("user_id", user.id).eq("provider", "chatgpt");
  revalidatePath("/w", "layout");
}

export async function setWorkspaceAiMode(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const mode = formData.get("ai_mode") === "chatgpt" ? "chatgpt" : "creditos";
  const supabase = await createClient();
  await supabase.from("workspaces").update({ ai_mode: mode }).eq("id", workspaceId);
  revalidatePath("/w", "layout");
}
