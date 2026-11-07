import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Jobs agendados (pg_cron + pg_net ou cron externo) chamam /api/jobs/* com
// "Authorization: Bearer CRON_SECRET". Sem o segredo configurado, as rotas ficam fechadas.
export function isAuthorizedJob(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
