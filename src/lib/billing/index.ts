import "server-only";
import { isMockMode } from "@/lib/integrations/mode";
import { asaasProvider } from "./asaas";
import type { BillingProvider } from "./types";

const manual: BillingProvider = {
  name: "manual",
  simulated: false,
  async createCharge() {
    return null;
  },
  async issueInvoice() {
    return null;
  },
};

// Asaas simulado: boleto e Pix de exemplo, nota "emitida" na hora.
const asaasMock: BillingProvider = {
  name: "asaas",
  simulated: true,
  async createCharge(input) {
    const id = `demo_pay_${input.paymentId.slice(0, 8)}`;
    return {
      providerId: id,
      boletoUrl: `/demo/boleto/${input.paymentId}`,
      pixCode: `00020126580014BR.GOV.BCB.PIX0136demo-${input.paymentId.slice(0, 8)}5204000053039865406${input.valor.toFixed(2)}5802BR5905PAUTA6009SAO PAULO62070503***6304ABCD`,
    };
  },
  async issueInvoice(input) {
    return { invoiceId: `demo_inv_${input.providerId.slice(-8)}`, status: "emitida", numero: String(1000 + Math.floor(Math.random() * 9000)), pdfUrl: null, xmlUrl: null };
  },
};

export function billingProvider(preferido: "manual" | "asaas"): BillingProvider {
  if (preferido === "manual") return manual;
  if (isMockMode()) return asaasMock;
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return manual;
  return asaasProvider({ apiKey, baseUrl: process.env.ASAAS_BASE_URL });
}

export type { BillingProvider } from "./types";
