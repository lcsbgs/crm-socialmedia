import type { BillingProvider, WebhookEvent } from "./types";

type Fetch = typeof fetch;

// Asaas (sandbox por padrão). TODO(oauth-setup): ASAAS_API_KEY, ASAAS_BASE_URL e ASAAS_WEBHOOK_TOKEN.
export function asaasProvider(opts: { apiKey: string; baseUrl?: string; fetchImpl?: Fetch }): BillingProvider {
  const f = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl ?? "https://api-sandbox.asaas.com/v3";
  async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const res = await f(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: { access_token: opts.apiKey, "content-type": "application/json", "user-agent": "Pauta" },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { errors?: { description: string }[] };
    if (!res.ok) throw new Error(data.errors?.[0]?.description ?? `Asaas respondeu ${res.status}`);
    return data;
  }
  return {
    name: "asaas",
    simulated: false,
    async createCharge(input) {
      const found = await call<{ data: { id: string }[] }>(`/customers?externalReference=${encodeURIComponent(input.customer.documento ?? input.customer.nome)}`);
      const customer =
        found.data[0] ??
        (await call<{ id: string }>("/customers", {
          method: "POST",
          body: {
            name: input.customer.nome,
            email: input.customer.email ?? undefined,
            mobilePhone: input.customer.telefone?.replace(/\D/g, "") || undefined,
            cpfCnpj: input.customer.documento ?? undefined,
            externalReference: input.customer.documento ?? input.customer.nome,
          },
        }));
      const pay = await call<{ id: string; bankSlipUrl?: string; invoiceUrl?: string }>("/payments", {
        method: "POST",
        body: {
          customer: customer.id,
          billingType: input.metodo === "pix" ? "PIX" : "BOLETO",
          value: input.valor,
          dueDate: input.vencimento,
          description: input.descricao,
          externalReference: input.paymentId,
        },
      });
      let pixCode: string | null = null;
      try {
        const qr = await call<{ payload?: string }>(`/payments/${pay.id}/pixQrCode`);
        pixCode = qr.payload ?? null;
      } catch {}
      return { providerId: pay.id, boletoUrl: pay.bankSlipUrl ?? pay.invoiceUrl ?? null, pixCode };
    },
    async issueInvoice(input) {
      const inv = await call<{ id: string; status: string }>("/invoices", {
        method: "POST",
        body: {
          payment: input.providerId,
          serviceDescription: input.descricao,
          observations: "Emitida pelo Pauta",
          value: input.valor,
          effectiveDate: new Date().toISOString().slice(0, 10),
          // TODO(oauth-setup): municipalServiceId/municipalServiceCode e impostos do cadastro na prefeitura.
        },
      });
      return { invoiceId: inv.id, status: "pendente" };
    },
  };
}

// Tradução dos eventos do webhook do Asaas.
export function parseAsaasWebhook(body: unknown): WebhookEvent {
  const b = body as {
    event?: string;
    payment?: { id: string; paymentDate?: string; clientPaymentDate?: string; billingType?: string };
    invoice?: { id: string; payment?: string; number?: string; pdfUrl?: string; xmlUrl?: string; statusDescription?: string };
  };
  if ((b.event === "PAYMENT_RECEIVED" || b.event === "PAYMENT_CONFIRMED") && b.payment) {
    return {
      kind: "pago",
      providerId: b.payment.id,
      pagoEm: b.payment.clientPaymentDate ?? b.payment.paymentDate ?? null,
      metodo: b.payment.billingType === "PIX" ? "pix" : b.payment.billingType === "BOLETO" ? "boleto" : b.payment.billingType === "CREDIT_CARD" ? "cartao" : null,
    };
  }
  if (b.invoice && (b.event === "INVOICE_AUTHORIZED" || b.event === "INVOICE_ERROR" || b.event === "INVOICE_SYNCHRONIZED")) {
    return {
      kind: "nota",
      providerId: b.invoice.payment ?? null,
      invoiceId: b.invoice.id,
      status: b.event === "INVOICE_AUTHORIZED" ? "emitida" : b.event === "INVOICE_ERROR" ? "erro" : "pendente",
      numero: b.invoice.number ?? null,
      pdfUrl: b.invoice.pdfUrl ?? null,
      xmlUrl: b.invoice.xmlUrl ?? null,
      erro: b.event === "INVOICE_ERROR" ? (b.invoice.statusDescription ?? "A prefeitura recusou a nota.") : null,
    };
  }
  return { kind: "ignorado" };
}
