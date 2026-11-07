import { describe, expect, it, vi } from "vitest";
import { asaasProvider, parseAsaasWebhook } from "./asaas";

describe("Asaas", () => {
  it("cria cliente e cobrança Pix com QR code", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push(`${init?.method ?? "GET"} ${u.replace("https://api-sandbox.asaas.com/v3", "")}`);
      if (u.includes("/customers?")) return new Response(JSON.stringify({ data: [] }));
      if (u.endsWith("/customers")) return new Response(JSON.stringify({ id: "cus_1" }));
      if (u.endsWith("/payments")) return new Response(JSON.stringify({ id: "pay_1", invoiceUrl: "https://asaas/i/pay_1" }));
      if (u.endsWith("/pixQrCode")) return new Response(JSON.stringify({ payload: "000201PIX" }));
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    const p = asaasProvider({ apiKey: "k", fetchImpl });
    const r = await p.createCharge({ paymentId: "x", valor: 1200, vencimento: "2026-11-10", descricao: "Mensalidade", metodo: "pix", customer: { nome: "Padaria" } });
    expect(r).toEqual({ providerId: "pay_1", boletoUrl: "https://asaas/i/pay_1", pixCode: "000201PIX" });
    expect(calls).toContain("POST /payments");
  });

  it("webhook de pagamento e de nota", () => {
    expect(parseAsaasWebhook({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1", paymentDate: "2026-11-05", billingType: "PIX" } })).toEqual({
      kind: "pago",
      providerId: "pay_1",
      pagoEm: "2026-11-05",
      metodo: "pix",
    });
    expect(parseAsaasWebhook({ event: "INVOICE_ERROR", invoice: { id: "inv", payment: "pay_1", statusDescription: "Alíquota inválida" } })).toMatchObject({
      kind: "nota",
      status: "erro",
      erro: "Alíquota inválida",
    });
    expect(parseAsaasWebhook({ event: "PAYMENT_CREATED" })).toEqual({ kind: "ignorado" });
  });
});
