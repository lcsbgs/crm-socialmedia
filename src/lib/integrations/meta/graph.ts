import { metaErrorFrom } from "./errors";
import { MetaError, type DiscoveredAccount, type MetaAdapter, type PublishInput, type PublishTarget } from "./types";

type Fetch = typeof fetch;

// Implementação real (Graph API). Credenciais: META_APP_ID, META_APP_SECRET, META_GRAPH_VERSION.
// TODO(oauth-setup): preencher as variáveis e passar pela revisão do app (docs/meta-app-review.md).
export function graphAdapter(opts: { appId: string; appSecret: string; version?: string; host?: string; fetchImpl?: Fetch; pollMs?: number }): MetaAdapter {
  const f = opts.fetchImpl ?? fetch;
  const base = `https://${opts.host ?? "graph.facebook.com"}/${opts.version ?? "v23.0"}`;
  const pollMs = opts.pollMs ?? 3000;

  async function call<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET"): Promise<T> {
    const url = new URL(`${base}${path}`);
    const body = new URLSearchParams(params);
    if (method === "GET") body.forEach((v, k) => url.searchParams.set(k, v));
    let res: Response;
    try {
      res = await f(url, method === "POST" ? { method, body } : { method });
    } catch {
      throw new MetaError("rede", "Sem conexão com a Meta agora. Vamos tentar de novo.", true);
    }
    const json = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) throw metaErrorFrom(json, res.status);
    return json;
  }

  async function waitReady(containerId: string, token: string) {
    for (let i = 0; i < 20; i++) {
      const s = await call<{ status_code?: string }>(`/${containerId}`, { fields: "status_code", access_token: token });
      if (s.status_code === "FINISHED") return;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED")
        throw new MetaError("container", "A Meta não conseguiu processar o vídeo. Confira formato e duração.", false);
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new MetaError("timeout", "O vídeo demorou demais para processar. Vamos tentar de novo.", true);
  }

  async function igContainer(t: PublishTarget, params: Record<string, string>) {
    const c = await call<{ id: string }>(`/${t.externalId}/media`, { ...params, access_token: t.accessToken }, "POST");
    return c.id;
  }

  return {
    simulated: false,
    async exchangeCode(code, redirectUri) {
      const short = await call<{ access_token: string }>("/oauth/access_token", {
        client_id: opts.appId,
        client_secret: opts.appSecret,
        redirect_uri: redirectUri,
        code,
      });
      return this.refreshToken(short.access_token);
    },
    async refreshToken(accessToken) {
      const long = await call<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
        grant_type: "fb_exchange_token",
        client_id: opts.appId,
        client_secret: opts.appSecret,
        fb_exchange_token: accessToken,
      });
      return { accessToken: long.access_token, expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null };
    },
    async discoverAccounts(accessToken) {
      const pages = await call<{
        data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string; profile_picture_url?: string } }[];
      }>("/me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}", access_token: accessToken });
      const out: DiscoveredAccount[] = [];
      for (const p of pages.data ?? []) {
        out.push({ plataforma: "facebook", externalId: p.id, nome: p.name, pageToken: p.access_token });
        const ig = p.instagram_business_account;
        if (ig) out.push({ plataforma: "instagram", externalId: ig.id, nome: ig.username ? `@${ig.username}` : p.name, username: ig.username, avatarUrl: ig.profile_picture_url, pageId: p.id });
      }
      return out;
    },
    async publish(t, input: PublishInput) {
      if (t.plataforma === "facebook") {
        const isVideo = input.mediaTypes[0] === "video";
        const r = isVideo
          ? await call<{ id: string }>(`/${t.externalId}/videos`, { file_url: input.mediaUrls[0], description: input.caption, access_token: t.accessToken }, "POST")
          : input.mediaUrls.length
            ? await call<{ id: string; post_id?: string }>(`/${t.externalId}/photos`, { url: input.mediaUrls[0], caption: input.caption, access_token: t.accessToken }, "POST")
            : await call<{ id: string }>(`/${t.externalId}/feed`, { message: input.caption, access_token: t.accessToken }, "POST");
        return { externalId: r.id, permalink: `https://www.facebook.com/${r.id}` };
      }
      if (!input.mediaUrls.length) throw new MetaError("sem_midia", "O Instagram precisa de pelo menos uma imagem ou vídeo.", false);
      let creation: string;
      if (input.kind === "carousel") {
        const children: string[] = [];
        for (let i = 0; i < input.mediaUrls.length; i++) {
          const video = input.mediaTypes[i] === "video";
          const id = await igContainer(t, { is_carousel_item: "true", ...(video ? { media_type: "VIDEO", video_url: input.mediaUrls[i] } : { image_url: input.mediaUrls[i] }) });
          if (video) await waitReady(id, t.accessToken);
          children.push(id);
        }
        creation = await igContainer(t, { media_type: "CAROUSEL", children: children.join(","), caption: input.caption });
      } else if (input.kind === "reels" || input.kind === "video") {
        creation = await igContainer(t, { media_type: "REELS", video_url: input.mediaUrls[0], caption: input.caption });
        await waitReady(creation, t.accessToken);
      } else if (input.kind === "story") {
        const video = input.mediaTypes[0] === "video";
        creation = await igContainer(t, { media_type: "STORIES", ...(video ? { video_url: input.mediaUrls[0] } : { image_url: input.mediaUrls[0] }) });
        if (video) await waitReady(creation, t.accessToken);
      } else {
        creation = await igContainer(t, { image_url: input.mediaUrls[0], caption: input.caption });
      }
      const pub = await call<{ id: string }>(`/${t.externalId}/media_publish`, { creation_id: creation, access_token: t.accessToken }, "POST");
      const info = await call<{ permalink?: string }>(`/${pub.id}`, { fields: "permalink", access_token: t.accessToken }).catch(() => ({ permalink: undefined }));
      return { externalId: pub.id, permalink: info.permalink ?? null };
    },
  };
}
