import "server-only";
import { encryptSecret } from "@/lib/crypto";
import type { DiscoveredAccount } from "@/lib/integrations/meta";
import { createClient } from "@/lib/supabase/server";

// Salva a conexão da Meta (token cifrado) e as contas descobertas. Usa a sessão de quem conectou
// (owner/admin): as policies garantem que só eles gravam.
export async function saveMetaConnection(input: {
  workspaceId: string;
  provider: "facebook" | "instagram";
  accessToken: string;
  expiresAt: Date | null;
  simulated: boolean;
  contaNome: string;
  accounts: DiscoveredAccount[];
  scopes: string[];
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: conn, error } = await supabase
    .from("social_connections")
    .insert({
      workspace_id: input.workspaceId,
      conectado_por: auth.user?.id ?? null,
      provider: input.provider,
      access_token_enc: encryptSecret(input.accessToken),
      expires_at: input.expiresAt?.toISOString() ?? null,
      simulated: input.simulated,
      conta_nome: input.contaNome,
      scopes: input.scopes,
    })
    .select("id")
    .single();
  if (error || !conn) return { error: "Não foi possível salvar a conexão. Só owner e admin conectam contas." };

  for (const a of input.accounts) {
    // Token da página fica junto do id externo? Não: guardamos só o token do usuário (longo) e
    // pedimos o da página na hora de publicar. Contas já existentes trocam de conexão.
    await supabase.from("social_accounts").upsert(
      {
        workspace_id: input.workspaceId,
        connection_id: conn.id,
        plataforma: a.plataforma,
        external_id: a.externalId,
        nome: a.nome,
        username: a.username ?? null,
        avatar_url: a.avatarUrl ?? null,
        page_id: a.pageId ?? null,
      },
      { onConflict: "workspace_id,plataforma,external_id" },
    );
  }
  return { ok: true as const, connectionId: conn.id, count: input.accounts.length };
}
