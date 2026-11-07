import { NextResponse, type NextRequest } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { fetchInstagramInsights, mockInsights } from "@/lib/integrations/meta/insights";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Coleta diária das métricas de ontem para cada conta do Instagram ligada a cliente.
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const { data: accounts } = await admin
    .from("social_accounts")
    .select("id, workspace_id, client_id, external_id, connection_id")
    .eq("plataforma", "instagram")
    .not("client_id", "is", null);
  let ok = 0;
  for (const a of accounts ?? []) {
    try {
      const { data: s } = await admin.rpc("get_social_connection_secret", { p_connection_id: a.connection_id }).maybeSingle();
      if (!s) continue;
      const m = s.simulated
        ? mockInsights(a.id, day)
        : await fetchInstagramInsights({
            igUserId: a.external_id,
            token: decryptSecret(s.access_token_enc ?? ""),
            day,
            host: s.provider === "instagram" ? "graph.instagram.com" : undefined,
            version: process.env.META_GRAPH_VERSION,
          });
      await admin.from("metrics_daily").upsert(
        { workspace_id: a.workspace_id, client_id: a.client_id!, social_account_id: a.id, data: day, ...m, simulated: s.simulated },
        { onConflict: "social_account_id,data" },
      );
      ok++;
    } catch {
      // conta com erro fica sem o dia; a próxima coleta segue
    }
  }
  return NextResponse.json({ contas: ok, dia: day });
}
