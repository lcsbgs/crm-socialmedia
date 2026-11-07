import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { parseAsaasWebhook } from "@/lib/billing/asaas";
import { billingProvider } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook do Asaas. Valida o token configurado no painel (cabeçalho asaas-access-token).
export async function POST(request: NextRequest) {
  const secret = process.env.ASAAS_WEBHOOK_TOKEN;
  const got = request.headers.get("asaas-access-token") ?? "";
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const event = parseAsaasWebhook(await request.json().catch(() => null));
  const admin = createAdminClient();
  if (event.kind === "pago") {
    const { data: id } = await admin.rpc("billing_mark_paid", { p_provider_id: event.providerId, p_pago_em: event.pagoEm ?? "", p_metodo: event.metodo ?? "" });
    if (id) {
      // NFS-e ao pagar, se o espaço ligou a emissão automática.
      const { data: pg } = await admin
        .from("payments")
        .select("id, valor, descricao, competencia, workspace:workspaces!inner (finance_config), client:clients!inner (nome)")
        .eq("id", id)
        .single();
      const cfg = (pg?.workspace.finance_config ?? {}) as { auto_nfse?: boolean };
      if (pg && cfg.auto_nfse) {
        try {
          const inv = await billingProvider("asaas").issueInvoice({
            providerId: event.providerId,
            descricao: pg.descricao ?? `Gestão de redes sociais, ${pg.client.nome}`,
            valor: Number(pg.valor),
          });
          if (inv) await admin.from("payments").update({ nfse_status: inv.status, nfse_provider_id: inv.invoiceId }).eq("id", pg.id);
        } catch {
          await admin.from("payments").update({ nfse_status: "erro", nfse_erro: "Falha ao pedir a nota no Asaas." }).eq("id", pg.id);
        }
      }
    }
  } else if (event.kind === "nota") {
    await admin.rpc("billing_set_invoice", {
      p_payment_provider_id: event.providerId ?? "",
      p_status: event.status,
      p_numero: event.numero ?? "",
      p_pdf: event.pdfUrl ?? "",
      p_xml: event.xmlUrl ?? "",
      p_erro: event.erro ?? "",
      p_invoice_id: event.invoiceId,
    });
  }
  return NextResponse.json({ ok: true });
}
