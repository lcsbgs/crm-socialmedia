import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Lembrete de aprovação (48 h) e aprovação tácita. Também agendado no pg_cron, de hora em hora.
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const { data, error } = await createAdminClient().rpc("run_approval_reminders").maybeSingle();
  if (error) return NextResponse.json({ error: "falhou" }, { status: 500 });
  return NextResponse.json(data);
}
