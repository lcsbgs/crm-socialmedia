import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "../types";

// Créditos do Pauta: Anthropic com a chave do servidor.
export function anthropicProvider(apiKey: string, model: string): AiProvider {
  const client = new Anthropic({ apiKey, timeout: 60_000 });
  return {
    name: "anthropic",
    async generate(prompt) {
      const res = await client.messages.create({
        model,
        max_tokens: prompt.maxTokens,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      });
      const text = res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      return { text, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens };
    },
  };
}
