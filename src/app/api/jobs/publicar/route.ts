import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { processPublishQueue } from "@/lib/jobs/publish";

// Fila de publicação: chamada a cada minuto (pg_cron + pg_net ou cron externo).
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const results = await processPublishQueue(10);
  return NextResponse.json({ processados: results.length, results });
}
