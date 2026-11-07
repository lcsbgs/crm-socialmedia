import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Aviso do brief 15 minutos antes da reunião (também agendado no pg_cron a cada 5 minutos).
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const { data, error } = await createAdminClient().rpc("run_meeting_briefs");
  if (error) return NextResponse.json({ error: "falhou" }, { status: 500 });
  return NextResponse.json({ avisos: data });
}
