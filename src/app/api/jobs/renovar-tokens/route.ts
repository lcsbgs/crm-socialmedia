import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { refreshMetaTokens } from "@/lib/jobs/publish";

// Renovação diária dos tokens da Meta que vencem em até 7 dias.
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json({ renovadas: await refreshMetaTokens() });
}
