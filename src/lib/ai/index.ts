import "server-only";
import { decryptSecret } from "@/lib/crypto";
import { optionalServerEnv } from "@/lib/env.server";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";
import { anthropicProvider } from "./providers/anthropic";
import { mockProvider } from "./providers/mock";
import { chatgptMockProvider, chatgptProvider } from "./providers/openai-chatgpt";
import { planAiRoute } from "./route";
import { AiPlanLimitError, type AiProvider, type PromptDefinition } from "./types";

export type RunAiResult =
  | { ok: true; text: string; provider: AiProvider["name"]; warning?: string }
  | { ok: false; error: string };

// Ponto único de entrada da IA: escolhe o provedor (plano do ChatGPT da pessoa ou créditos do
// espaço), cai para os créditos se o ChatGPT recusar e registra o uso em ai_usage.
export async function runAi<V>(workspaceId: string, def: PromptDefinition<V>, vars: V): Promise<RunAiResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Entre de novo para usar a IA." };

  const [{ data: ws }, { data: conn }, { data: credits }] = await Promise.all([
    supabase.from("workspaces").select("ai_mode").eq("id", workspaceId).single(),
    supabase.rpc("get_ai_connection_secret", { p_provider: "chatgpt" }).maybeSingle(),
    supabase.rpc("ai_credits_status", { p_workspace_id: workspaceId }).maybeSingle(),
  ]);
  if (!ws || !credits) return { ok: false, error: "Espaço não encontrado." };

  const anthropicKey = optionalServerEnv("ANTHROPIC_API_KEY");
  const plan = planAiRoute({
    workspaceMode: ws.ai_mode === "chatgpt" ? "chatgpt" : "creditos",
    connection: conn ? { status: conn.status as "ativa", simulated: conn.simulated } : null,
    hasAnthropicKey: !!anthropicKey,
    integrationsMock: isMockMode(),
    credits,
    cost: def.credits,
  });
  if (plan.kind === "blocked") return { ok: false, error: plan.reason };

  const prompt = def.build(vars);
  const credit = (p: "anthropic" | "mock"): AiProvider =>
    p === "anthropic" && anthropicKey ? anthropicProvider(anthropicKey, optionalServerEnv("ANTHROPIC_MODEL") ?? "claude-opus-5-5") : mockProvider;

  async function record(provider: AiProvider["name"], tokensIn: number, tokensOut: number, fallback: boolean) {
    await supabase.from("ai_usage").insert({
      workspace_id: workspaceId,
      user_id: auth.user!.id,
      provider,
      tarefa: def.id,
      prompt_versao: def.version,
      tokens_entrada: tokensIn,
      tokens_saida: tokensOut,
      creditos: provider === "chatgpt" ? 0 : def.credits,
      fallback,
    });
  }

  try {
    if (plan.kind === "chatgpt") {
      try {
        const provider = plan.simulated
          ? chatgptMockProvider({ limitReached: false })
          : chatgptProvider(decryptSecret(conn!.access_token_enc ?? ""));
        const r = await provider.generate(prompt, { task: def.id });
        await record("chatgpt", r.tokensIn, r.tokensOut, false);
        return { ok: true, text: r.text, provider: "chatgpt" };
      } catch (e) {
        if (!(e instanceof AiPlanLimitError)) throw e;
        await supabase
          .from("ai_connections")
          .update({ status: e.reason === "limite" ? "limite" : "inelegivel", limite_aviso_em: new Date().toISOString() })
          .eq("user_id", auth.user.id)
          .eq("provider", "chatgpt");
        const r = await credit(plan.then.provider).generate(prompt, { task: def.id });
        await record(plan.then.provider, r.tokensIn, r.tokensOut, true);
        return { ok: true, text: r.text, provider: plan.then.provider, warning: plan.then.warning };
      }
    }
    const r = await credit(plan.provider).generate(prompt, { task: def.id });
    await record(plan.provider, r.tokensIn, r.tokensOut, false);
    return { ok: true, text: r.text, provider: plan.provider, warning: plan.warning };
  } catch {
    return { ok: false, error: "A IA não respondeu agora. Tente de novo em instantes." };
  }
}
