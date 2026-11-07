import { describe, expect, it, vi } from "vitest";
import { backoffMinutes, metaErrorFrom } from "./errors";
import { graphAdapter } from "./graph";
import { publishKindFor } from "./types";

function fakeGraph(routes: Record<string, unknown | ((u: URL, init?: RequestInit) => unknown)>) {
  const calls: { path: string; method: string; body: string }[] = [];
  const impl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/v[\d.]+/, "");
    calls.push({ path, method: init?.method ?? "GET", body: String(init?.body ?? "") });
    const key = Object.keys(routes).find((k) => path === k) ?? Object.keys(routes).sort((a, b) => b.length - a.length).find((k) => path.startsWith(k));
    const value = key ? routes[key] : { error: { code: 100, message: "rota desconhecida" } };
    const data = typeof value === "function" ? (value as (u: URL, i?: RequestInit) => unknown)(url, init) : value;
    const status = (data as { error?: unknown }).error ? 400 : 200;
    return new Response(JSON.stringify(data), { status });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const target = { plataforma: "instagram" as const, externalId: "IG1", accessToken: "tok" };

describe("adapter da Graph API (com mock)", () => {
  it("publica imagem: cria container e publica", async () => {
    const g = fakeGraph({ "/IG1/media_publish": { id: "POST1" }, "/IG1/media": { id: "C1" }, "/POST1": { permalink: "https://instagram.com/p/abc" } });
    const a = graphAdapter({ appId: "a", appSecret: "s", fetchImpl: g.impl, pollMs: 0 });
    const r = await a.publish(target, { kind: "image", caption: "Oi", mediaUrls: ["https://x/1.jpg"], mediaTypes: ["image"] });
    expect(r).toEqual({ externalId: "POST1", permalink: "https://instagram.com/p/abc" });
    expect(g.calls[0].body).toContain("image_url=https");
    expect(g.calls[1].body).toContain("creation_id=C1");
  });

  it("carrossel cria um item por mídia e o container CAROUSEL", async () => {
    let n = 0;
    const g = fakeGraph({ "/IG1/media_publish": { id: "P" }, "/IG1/media": () => ({ id: `C${++n}` }), "/P": {} });
    const a = graphAdapter({ appId: "a", appSecret: "s", fetchImpl: g.impl, pollMs: 0 });
    await a.publish(target, { kind: "carousel", caption: "x", mediaUrls: ["u1", "u2", "u3"], mediaTypes: ["image", "image", "image"] });
    const containers = g.calls.filter((c) => c.path === "/IG1/media");
    expect(containers).toHaveLength(4);
    expect(containers[3].body).toContain("media_type=CAROUSEL");
    expect(containers[3].body).toContain("children=C1%2CC2%2CC3");
  });

  it("reels espera o processamento do vídeo", async () => {
    let polls = 0;
    const g = fakeGraph({
      "/IG1/media_publish": { id: "P" },
      "/IG1/media": { id: "V1" },
      "/V1": () => ({ status_code: ++polls < 3 ? "IN_PROGRESS" : "FINISHED" }),
      "/P": {},
    });
    const a = graphAdapter({ appId: "a", appSecret: "s", fetchImpl: g.impl, pollMs: 0 });
    await a.publish(target, { kind: "reels", caption: "x", mediaUrls: ["v.mp4"], mediaTypes: ["video"] });
    expect(polls).toBe(3);
  });

  it("story usa media_type STORIES; página do Facebook usa /photos", async () => {
    const g = fakeGraph({ "/IG1/media_publish": { id: "P" }, "/IG1/media": { id: "S1" }, "/P": {}, "/PAGE/photos": { id: "F1" } });
    const a = graphAdapter({ appId: "a", appSecret: "s", fetchImpl: g.impl, pollMs: 0 });
    await a.publish(target, { kind: "story", caption: "", mediaUrls: ["i.jpg"], mediaTypes: ["image"] });
    expect(g.calls[0].body).toContain("media_type=STORIES");
    const fb = await a.publish({ plataforma: "facebook", externalId: "PAGE", accessToken: "pt" }, { kind: "page_post", caption: "Oi", mediaUrls: ["i.jpg"], mediaTypes: ["image"] });
    expect(fb.externalId).toBe("F1");
  });

  it("descobre páginas e Instagram ligado", async () => {
    const g = fakeGraph({
      "/me/accounts": { data: [{ id: "PG", name: "Padaria", access_token: "pt", instagram_business_account: { id: "IG", username: "padaria" } }] },
    });
    const a = graphAdapter({ appId: "a", appSecret: "s", fetchImpl: g.impl });
    const accs = await a.discoverAccounts("tok");
    expect(accs.map((x) => [x.plataforma, x.externalId])).toEqual([["facebook", "PG"], ["instagram", "IG"]]);
  });

  it("token expirado vira erro legível e não recuperável", async () => {
    const g = fakeGraph({ "/IG1/media": { error: { code: 190, message: "Error validating access token" } } });
    const a = graphAdapter({ appId: "a", appSecret: "s", fetchImpl: g.impl });
    await expect(a.publish(target, { kind: "image", caption: "", mediaUrls: ["u"], mediaTypes: ["image"] })).rejects.toMatchObject({
      recoverable: false,
      friendly: expect.stringContaining("reconecte"),
    });
  });

  it("limite de chamadas é recuperável; backoff cresce", () => {
    expect(metaErrorFrom({ error: { code: 4 } }, 400).recoverable).toBe(true);
    expect([1, 2, 3, 4, 9].map(backoffMinutes)).toEqual([1, 5, 15, 60, 60]);
  });

  it("formato do post define o tipo de publicação", () => {
    expect(publishKindFor("carrossel", "instagram", 3)).toBe("carousel");
    expect(publishKindFor("reels", "instagram", 1)).toBe("reels");
    expect(publishKindFor("story", "instagram", 1)).toBe("story");
    expect(publishKindFor("post", "facebook", 1)).toBe("page_post");
  });
});
