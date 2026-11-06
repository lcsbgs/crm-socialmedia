import "server-only";
import { AiPlanLimitError, type AiProvider } from "../types";

// Plano do ChatGPT da própria pessoa (OAuth da OpenAI, escopos de uso pedidos à parte).
// TODO(oauth-setup): confirmar o endpoint e o modelo liberados para apps que usam a assinatura
// do ChatGPT e preencher OPENAI_CHATGPT_RESPONSES_URL / OPENAI_CHATGPT_MODEL. Ver docs/oauth-setup.md.
export function chatgptProvider(accessToken: string): AiProvider {
  const url = process.env.OPENAI_CHATGPT_RESPONSES_URL ?? "https://api.openai.com/v1/responses";
  const model = process.env.OPENAI_CHATGPT_MODEL ?? "gpt-5";
  return {
    name: "chatgpt",
    async generate(prompt) {
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          instructions: prompt.system,
          input: prompt.user,
          max_output_tokens: prompt.maxTokens,
        }),
      });
      if (res.status === 429) throw new AiPlanLimitError("limite");
      if (res.status === 401 || res.status === 403) throw new AiPlanLimitError("inelegivel");
      if (!res.ok) throw new Error(`ChatGPT respondeu ${res.status}`);
      const data = (await res.json()) as {
        output_text?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return {
        text: (data.output_text ?? "").trim(),
        tokensIn: data.usage?.input_tokens ?? 0,
        tokensOut: data.usage?.output_tokens ?? 0,
      };
    },
  };
}

// Conexão simulada: responde como o mock, mas pode simular o limite semanal acabando.
export function chatgptMockProvider(opts: { limitReached: boolean }): AiProvider {
  return {
    name: "chatgpt",
    async generate(prompt, ctx) {
      if (opts.limitReached) throw new AiPlanLimitError("limite");
      const { mockProvider } = await import("./mock");
      return mockProvider.generate(prompt, ctx);
    },
  };
}
