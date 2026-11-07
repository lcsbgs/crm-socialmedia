import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { MetaError, publishKindFor } from "@/lib/integrations/meta";
import { graphAdapter } from "@/lib/integrations/meta/graph";
import { mockMetaAdapter } from "@/lib/integrations/meta/mock";
import { createAdminClient } from "@/lib/supabase/admin";

const isVideo = (p: string) => /\.(mp4|mov)$/i.test(p);

// Processa a fila: pega jobs vencidos, publica pelo adapter e registra sucesso ou falha (com backoff).
export async function processPublishQueue(limit = 10) {
  const admin = createAdminClient();
  const { data: jobs } = await admin.rpc("claim_publish_jobs", { p_limit: limit });
  const results: { id: string; ok: boolean; erro?: string }[] = [];

  for (const job of jobs ?? []) {
    try {
      const [{ data: d }, { data: account }] = await Promise.all([
        admin.from("deliverables").select("formato, legenda, midia_urls").eq("id", job.deliverable_id).single(),
        admin.from("social_accounts").select("plataforma, external_id, page_id, connection_id").eq("id", job.social_account_id).single(),
      ]);
      if (!d || !account) throw new MetaError("dados", "Post ou conta não encontrados.", false);
      const { data: secret } = await admin.rpc("get_social_connection_secret", { p_connection_id: account.connection_id }).maybeSingle();
      if (!secret?.access_token_enc) throw new MetaError("190", "Conta desconectada: reconecte em Ajustes, Integrações.", false);

      const signed = d.midia_urls.length
        ? ((await admin.storage.from("midia").createSignedUrls(d.midia_urls, 60 * 60)).data ?? [])
        : [];
      const mediaUrls = signed.map((s) => s.signedUrl).filter((u): u is string => !!u);
      const plataforma = account.plataforma as "instagram" | "facebook";
      const input = {
        kind: publishKindFor(d.formato, plataforma, mediaUrls.length),
        caption: d.legenda ?? "",
        mediaUrls,
        mediaTypes: d.midia_urls.map((p) => (isVideo(p) ? ("video" as const) : ("image" as const))),
      };

      let result;
      if (secret.simulated) {
        result = await mockMetaAdapter.publish({ plataforma, externalId: account.external_id, accessToken: "" }, input);
      } else {
        const appId = secret.provider === "instagram" ? process.env.INSTAGRAM_APP_ID : process.env.META_APP_ID;
        const appSecret = secret.provider === "instagram" ? process.env.INSTAGRAM_APP_SECRET : process.env.META_APP_SECRET;
        if (!appId || !appSecret) throw new MetaError("config", "Integração com a Meta não configurada no servidor.", false);
        const adapter = graphAdapter({
          appId,
          appSecret,
          version: process.env.META_GRAPH_VERSION,
          host: secret.provider === "instagram" ? "graph.instagram.com" : undefined,
        });
        let token = decryptSecret(secret.access_token_enc);
        if (plataforma === "facebook") {
          // Página: publica com o token da página, pedido na hora.
          const page = await fetch(
            `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v23.0"}/${account.external_id}?fields=access_token&access_token=${token}`,
          ).then((r) => r.json() as Promise<{ access_token?: string }>);
          if (!page.access_token) throw new MetaError("190", "Sem acesso à página: reconecte o Facebook.", false);
          token = page.access_token;
        }
        result = await adapter.publish({ plataforma, externalId: account.external_id, accessToken: token }, input);
      }
      await admin.rpc("complete_publish_job", {
        p_job_id: job.id,
        p_external_id: result.externalId,
        p_permalink: result.permalink ?? "",
        p_simulated: secret.simulated,
      });
      results.push({ id: job.id, ok: true });
    } catch (e) {
      const err = e instanceof MetaError ? e : new MetaError("interno", "Erro inesperado ao publicar. Vamos tentar de novo.", true);
      await admin.rpc("fail_publish_job", { p_job_id: job.id, p_codigo: err.code, p_mensagem: err.friendly, p_recuperavel: err.recoverable });
      if (err.code === "190") {
        const { data: acc } = await admin.from("social_accounts").select("connection_id").eq("id", job.social_account_id).maybeSingle();
        if (acc) await admin.from("social_connections").update({ status: "expirada", ultimo_erro: err.friendly }).eq("id", acc.connection_id);
      }
      results.push({ id: job.id, ok: false, erro: err.friendly });
    }
  }
  return results;
}

// Renova tokens de longa duração que vencem em até 7 dias.
export async function refreshMetaTokens() {
  const admin = createAdminClient();
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { data: conns } = await admin
    .from("social_connections")
    .select("id, provider, simulated")
    .eq("status", "ativa")
    .lt("expires_at", soon);
  let renovadas = 0;
  for (const c of conns ?? []) {
    try {
      if (c.simulated) {
        const t = await mockMetaAdapter.refreshToken("");
        await admin.from("social_connections").update({ access_token_enc: encryptSecret(t.accessToken), expires_at: t.expiresAt?.toISOString() }).eq("id", c.id);
        renovadas++;
        continue;
      }
      const { data: s } = await admin.rpc("get_social_connection_secret", { p_connection_id: c.id }).maybeSingle();
      if (!s?.access_token_enc) continue;
      const token = decryptSecret(s.access_token_enc);
      let next: { accessToken: string; expiresAt: Date | null };
      if (c.provider === "instagram") {
        const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`).then(
          (x) => x.json() as Promise<{ access_token?: string; expires_in?: number }>,
        );
        if (!r.access_token) throw new Error("falhou");
        next = { accessToken: r.access_token, expiresAt: r.expires_in ? new Date(Date.now() + r.expires_in * 1000) : null };
      } else {
        next = await graphAdapter({ appId: process.env.META_APP_ID ?? "", appSecret: process.env.META_APP_SECRET ?? "" }).refreshToken(token);
      }
      await admin
        .from("social_connections")
        .update({ access_token_enc: encryptSecret(next.accessToken), expires_at: next.expiresAt?.toISOString() ?? null })
        .eq("id", c.id);
      renovadas++;
    } catch {
      await admin.from("social_connections").update({ status: "expirada", ultimo_erro: "Não foi possível renovar o acesso. Reconecte." }).eq("id", c.id);
    }
  }
  return renovadas;
}
