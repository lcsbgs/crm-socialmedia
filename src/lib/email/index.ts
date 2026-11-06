import "server-only";
import { isMockMode } from "@/lib/integrations/mode";
import { optionalServerEnv } from "@/lib/env.server";

export type EmailMessage = { to: string; subject: string; text: string; html?: string };
export type EmailResult = { ok: true; id: string; simulated: boolean } | { ok: false; error: string };

export interface EmailAdapter {
  send(message: EmailMessage): Promise<EmailResult>;
}

// Modo demonstração: não envia nada, só registra no log do servidor.
const mockEmail: EmailAdapter = {
  async send(message) {
    console.info(`[e-mail simulado] para ${message.to}: ${message.subject}`);
    return { ok: true, id: `simulado-${Date.now()}`, simulated: true };
  },
};

// Envio real pela API do Resend.
// TODO(oauth-setup): definir RESEND_API_KEY e EMAIL_FROM (domínio verificado no Resend).
const resendEmail: EmailAdapter = {
  async send(message) {
    const key = optionalServerEnv("RESEND_API_KEY");
    const from = optionalServerEnv("EMAIL_FROM");
    if (!key || !from) return { ok: false, error: "Envio de e-mail não configurado." };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text, html: message.html }),
    });
    if (!res.ok) return { ok: false, error: "O provedor de e-mail recusou o envio." };
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? "", simulated: false };
  },
};

export function emailAdapter(): EmailAdapter {
  return isMockMode() ? mockEmail : resendEmail;
}
