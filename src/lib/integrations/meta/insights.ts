// Métricas diárias da conta (Instagram). Real: Graph API /insights; demonstração: números
// determinísticos por conta e dia (estáveis entre execuções), marcados como simulados.
export type DailyInsights = { seguidores: number | null; alcance: number; impressoes: number; interacoes: number };

export async function fetchInstagramInsights(opts: {
  igUserId: string;
  token: string;
  day: string; // YYYY-MM-DD
  host?: string;
  version?: string;
  fetchImpl?: typeof fetch;
}): Promise<DailyInsights> {
  const f = opts.fetchImpl ?? fetch;
  const base = `https://${opts.host ?? "graph.facebook.com"}/${opts.version ?? "v23.0"}`;
  const since = Math.floor(Date.parse(`${opts.day}T00:00:00-03:00`) / 1000);
  const until = since + 86_400;
  const url = `${base}/${opts.igUserId}/insights?metric=reach,views,total_interactions&metric_type=total_value&period=day&since=${since}&until=${until}&access_token=${opts.token}`;
  const res = await f(url);
  const json = (await res.json()) as { data?: { name: string; total_value?: { value: number } }[] };
  if (!res.ok) throw new Error("Não foi possível ler as métricas.");
  const get = (n: string) => json.data?.find((d) => d.name === n)?.total_value?.value ?? 0;
  const prof = await f(`${base}/${opts.igUserId}?fields=followers_count&access_token=${opts.token}`).then((r) => r.json() as Promise<{ followers_count?: number }>);
  return { seguidores: prof.followers_count ?? null, alcance: get("reach"), impressoes: get("views"), interacoes: get("total_interactions") };
}

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function mockInsights(accountId: string, day: string): DailyInsights {
  const h = hash(`${accountId}:${day}`);
  const base = 800 + (hash(accountId) % 2000);
  const dayIndex = Math.floor(Date.parse(day) / 86_400_000);
  return {
    seguidores: 2000 + (hash(accountId) % 5000) + (dayIndex % 365) * 3,
    alcance: base + (h % 900),
    impressoes: Math.round((base + (h % 900)) * 1.6),
    interacoes: 40 + (h % 160),
  };
}
