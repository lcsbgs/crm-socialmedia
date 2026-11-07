import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";

const personal = new Set(["google", "canva", "granola"]);

export async function saveIntegrationConnection(input: {
  workspaceId: string;
  provider: "google" | "canva" | "granola" | "asaas" | "assinatura";
  simulated: boolean;
  conta: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string[];
  config?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = personal.has(input.provider) ? (auth.user?.id ?? null) : null;
  const row = {
    workspace_id: input.workspaceId,
    user_id: userId,
    provider: input.provider,
    status: "ativa",
    conta: input.conta,
    access_token_enc: input.accessToken ? encryptSecret(input.accessToken) : null,
    refresh_token_enc: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    expires_at: input.expiresAt?.toISOString() ?? null,
    scopes: input.scopes ?? [],
    simulated: input.simulated,
    config: (input.config ?? {}) as never,
  };
  let q = supabase.from("integration_connections").delete().eq("workspace_id", input.workspaceId).eq("provider", input.provider);
  q = userId ? q.eq("user_id", userId) : q.is("user_id", null);
  await q;
  const { error } = await supabase.from("integration_connections").insert(row);
  return error ? { error: "Não foi possível salvar a conexão." } : { ok: true as const };
}

export async function getIntegration(workspaceId: string, provider: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_integration_secret", { p_workspace_id: workspaceId, p_provider: provider }).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    simulated: data.simulated,
    config: (data.config ?? {}) as Record<string, unknown>,
    expiresAt: data.expires_at,
    accessToken: data.access_token_enc ? decryptSecret(data.access_token_enc) : null,
    refreshToken: data.refresh_token_enc ? decryptSecret(data.refresh_token_enc) : null,
  };
}
