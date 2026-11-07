import "server-only";
import { isMockMode } from "./mode";

// Assinatura eletrônica. "simples" = assinatura no portal do Pauta (nome, data e IP).
export type SignatureProviderName = "simples" | "clicksign" | "zapsign";

export interface SignatureAdapter {
  name: SignatureProviderName;
  simulated: boolean;
  // Cria o documento no provedor e devolve o link de assinatura do signatário.
  createDocument(input: { titulo: string; corpo: string; signatario: { nome: string; email: string | null; telefone: string | null } }): Promise<{
    docId: string | null;
    signUrl: string | null;
  }>;
}

const simples: SignatureAdapter = {
  name: "simples",
  simulated: false,
  async createDocument() {
    return { docId: null, signUrl: null };
  },
};

// TODO(oauth-setup): CLICKSIGN_ACCESS_TOKEN e CLICKSIGN_BASE_URL. API v3 (envelopes).
const clicksign: SignatureAdapter = {
  name: "clicksign",
  simulated: false,
  async createDocument(input) {
    const base = process.env.CLICKSIGN_BASE_URL ?? "https://sandbox.clicksign.com";
    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    if (!token) throw new Error("Clicksign não configurado.");
    const headers = { authorization: token, "content-type": "application/vnd.api+json" };
    const env = await fetch(`${base}/api/v3/envelopes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: { type: "envelopes", attributes: { name: input.titulo, locale: "pt-BR" } } }),
    }).then((r) => r.json() as Promise<{ data?: { id: string } }>);
    if (!env.data?.id) throw new Error("Clicksign recusou o envelope.");
    await fetch(`${base}/api/v3/envelopes/${env.data.id}/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "documents",
          attributes: { filename: "contrato.txt", content_base64: `data:text/plain;base64,${Buffer.from(input.corpo).toString("base64")}` },
        },
      }),
    });
    // Signatário, requisitos e ativação ficam a cargo da configuração do envelope no painel (TODO).
    return { docId: env.data.id, signUrl: null };
  },
};

// TODO(oauth-setup): ZAPSIGN_API_TOKEN.
const zapsign: SignatureAdapter = {
  name: "zapsign",
  simulated: false,
  async createDocument(input) {
    const token = process.env.ZAPSIGN_API_TOKEN;
    if (!token) throw new Error("ZapSign não configurado.");
    const res = await fetch("https://api.zapsign.com.br/api/v1/docs/", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: input.titulo,
        markdown_text: input.corpo,
        lang: "pt-br",
        signers: [{ name: input.signatario.nome, email: input.signatario.email ?? "", phone_number: input.signatario.telefone ?? "" }],
      }),
    }).then((r) => r.json() as Promise<{ token?: string; signers?: { sign_url: string }[] }>);
    if (!res.token) throw new Error("ZapSign recusou o documento.");
    return { docId: res.token, signUrl: res.signers?.[0]?.sign_url ?? null };
  },
};

export function signatureAdapter(preferido: SignatureProviderName): SignatureAdapter {
  if (preferido === "simples" || isMockMode()) return { ...simples, simulated: preferido !== "simples" && isMockMode() };
  return preferido === "zapsign" ? zapsign : clicksign;
}
