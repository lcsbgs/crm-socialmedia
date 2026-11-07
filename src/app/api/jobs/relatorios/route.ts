import { NextResponse, type NextRequest } from "next/server";
import { upsertReport } from "@/features/reports/generate";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Dia 1: monta o relatório do mês anterior de cada cliente ativo (a leitura da IA é escrita
// quando alguém da equipe abre o relatório, para usar o plano de IA de quem revisa).
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const { data: clients } = await admin.from("clients").select("id, workspace_id").eq("status", "ativo");
  let n = 0;
  for (const c of clients ?? []) if (await upsertReport(admin, { workspaceId: c.workspace_id, clientId: c.id, month })) n++;
  return NextResponse.json({ relatorios: n, mes: month });
}
