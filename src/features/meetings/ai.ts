import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverEnv } from "@/lib/env.server";
import { aiMinutesSchema, minutesSchema, type Minutes } from "./schemas";

const SYSTEM = `Você ajuda profissionais de social media a registrar reuniões com clientes.
A partir das anotações brutas, escreva uma ata em português do Brasil.

Regras:
- Use só o que está nas anotações. Não invente decisões, prazos ou tarefas.
- Decisões: o que ficou combinado. Próximos passos: ações concretas que alguém precisa fazer.
- Prazos: converta datas relativas ("sexta", "semana que vem") usando a data da reunião informada. Sem prazo claro, use null.
- Texto direto, sem travessões.`;

export type MinutesResult = { ok: true; ata: Minutes } | { ok: false; error: string };

export async function generateMinutes(input: {
  notas: string;
  clienteNome: string;
  dataReuniao: string; // YYYY-MM-DD
}): Promise<MinutesResult> {
  let apiKey: string;
  let model: string;
  try {
    apiKey = serverEnv("ANTHROPIC_API_KEY");
    model = serverEnv("ANTHROPIC_MODEL");
  } catch {
    // Sem chave: ata de demonstração a partir das próprias anotações.
    const { mockMinutes } = await import("./mock-minutes");
    return { ok: true, ata: mockMinutes(input.notas) };
  }

  const client = new Anthropic({ apiKey, timeout: 90_000 });

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Cliente: ${input.clienteNome}\nData da reunião: ${input.dataReuniao}\n\nAnotações:\n${input.notas}`,
        },
      ],
      output_config: { format: zodOutputFormat(aiMinutesSchema) },
    });

    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        error: "A IA não conseguiu processar estas anotações. Revise o texto e tente de novo.",
      };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { ok: false, error: "A resposta da IA veio incompleta. Tente de novo." };
    }

    // Segunda validação, mais estrita (datas ISO, limites de tamanho).
    const parsed = minutesSchema.safeParse(response.parsed_output);
    if (!parsed.success)
      return { ok: false, error: "A IA devolveu uma ata em formato inesperado. Tente de novo." };
    return { ok: true, ata: parsed.data };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Chave da Anthropic inválida. Confira ANTHROPIC_API_KEY." };
    }
    if (error instanceof Anthropic.NotFoundError || error instanceof Anthropic.BadRequestError) {
      return { ok: false, error: "Modelo da IA inválido ou indisponível. Confira ANTHROPIC_MODEL." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Muitas solicitações à IA agora. Aguarde um pouco e tente de novo." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: "A IA está indisponível no momento. Tente de novo em instantes." };
    }
    throw error;
  }
}
