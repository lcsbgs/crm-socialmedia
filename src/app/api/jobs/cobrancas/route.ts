import { NextResponse, type NextRequest } from "next/server";
import { billingProvider } from "@/lib/billing";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Cobrança automática (diária): gera boleto e Pix X dias antes do vencimento para quem usa Asaas.
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id, finance_config");
  let geradas = 0;
  for (const w of workspaces ?? []) {
    const cfg = (w.finance_config ?? {}) as { provider?: string; auto_cobranca?: boolean; dias_antes?: number };
    if (cfg.provider !== "asaas" || !cfg.auto_cobranca) continue;
    const limite = new Date(Date.now() + (cfg.dias_antes ?? 5) * 86_400_000).toISOString().slice(0, 10);
    const { data: pays } = await admin
      .from("payments")
      .select("id, valor, vencimento, descricao, client:clients!inner (nome, contatos)")
      .eq("workspace_id", w.id)
      .neq("status", "pago")
      .is("provider_id", null)
      .lte("vencimento", limite);
    const provider = billingProvider("asaas");
    for (const p of pays ?? []) {
      try {
        const contato = (Array.isArray(p.client.contatos) ? p.client.contatos[0] : null) as { email?: string; telefone?: string } | null;
        const r = await provider.createCharge({
          paymentId: p.id,
          valor: Number(p.valor),
          vencimento: p.vencimento,
          descricao: p.descricao ?? "Mensalidade",
          metodo: "boleto",
          customer: { nome: p.client.nome, email: contato?.email, telefone: contato?.telefone },
        });
        if (r) {
          await admin
            .from("payments")
            .update({ provider: "asaas", provider_id: r.providerId, boleto_url: r.boletoUrl, pix_code: r.pixCode, cobranca_gerada_em: new Date().toISOString(), simulated: provider.simulated })
            .eq("id", p.id);
          geradas++;
        }
      } catch {
        // segue para a próxima; o erro aparece como "Boleto ainda não gerado"
      }
    }
  }
  return NextResponse.json({ geradas });
}
