// Cobrança e NFS-e atrás de uma interface: "manual" (sem integração) e "asaas".
export type BillingCustomer = { nome: string; email?: string | null; telefone?: string | null; documento?: string | null };

export type ChargeInput = {
  paymentId: string;
  valor: number;
  vencimento: string; // YYYY-MM-DD
  descricao: string;
  metodo: "boleto" | "pix";
  customer: BillingCustomer;
};

export type ChargeResult = { providerId: string; boletoUrl: string | null; pixCode: string | null };

export type InvoiceResult = { invoiceId: string; status: "pendente" | "emitida" | "erro"; numero?: string | null; pdfUrl?: string | null; xmlUrl?: string | null; erro?: string | null };

export type WebhookEvent =
  | { kind: "pago"; providerId: string; pagoEm: string | null; metodo: string | null }
  | { kind: "nota"; providerId: string | null; invoiceId: string; status: "pendente" | "emitida" | "erro"; numero?: string | null; pdfUrl?: string | null; xmlUrl?: string | null; erro?: string | null }
  | { kind: "ignorado" };

export interface BillingProvider {
  name: "manual" | "asaas";
  simulated: boolean;
  createCharge(input: ChargeInput): Promise<ChargeResult | null>;
  issueInvoice(input: { providerId: string; descricao: string; valor: number }): Promise<InvoiceResult | null>;
}
