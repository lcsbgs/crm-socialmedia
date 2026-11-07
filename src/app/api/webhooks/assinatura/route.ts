import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook do provedor de assinatura (Clicksign ou ZapSign). Protegido por SIGNATURE_WEBHOOK_TOKEN
// em "?token=" (ZapSign) ou no cabeçalho "x-webhook-token". Documento assinado vira cliente.
export async function POST(request: NextRequest) {
  const secret = process.env.SIGNATURE_WEBHOOK_TOKEN;
  const got = request.headers.get("x-webhook-token") ?? request.nextUrl.searchParams.get("token") ?? "";
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // ZapSign: { token, status: "signed", signers: [{ name }] }; Clicksign: { event: { name: "auto_close" }, document: { key } }.
  const docId = String((body.token as string) ?? (body.document as { key?: string })?.key ?? (body.envelope as { id?: string })?.id ?? "");
  const signed = body.status === "signed" || (body.event as { name?: string })?.name === "auto_close" || (body.event as { name?: string })?.name === "close";
  if (!docId || !signed) return NextResponse.json({ ignorado: true });
  const admin = createAdminClient();
  const { data: c } = await admin.from("contracts").select("token").eq("provider_doc_id", docId).maybeSingle();
  if (!c) return NextResponse.json({ ignorado: true });
  const nome = String((body.signers as { name?: string }[] | undefined)?.[0]?.name ?? "Signatário");
  const { error } = await admin.rpc("sign_contract", { p_token: c.token, p_nome: nome, p_ip: "provedor" });
  return error ? NextResponse.json({ error: "falhou" }, { status: 500 }) : NextResponse.json({ ok: true });
}
