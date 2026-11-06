// Contrato único da IA do Pauta. Telas pedem uma tarefa; o roteador escolhe o provedor.

export type AiTask = "legenda" | "encurtar" | "tom" | "chamada" | "estrategia" | "ata" | "relatorio" | "cobranca";

export type AiPrompt = { system: string; user: string; maxTokens: number };

export type PromptDefinition<V> = {
  id: AiTask;
  version: string; // ex.: "legenda@1"
  credits: number; // créditos do plano Pauta que a tarefa consome
  build(vars: V): AiPrompt;
};

export type AiResult = { text: string; tokensIn: number; tokensOut: number };

export interface AiProvider {
  name: "anthropic" | "chatgpt" | "mock";
  generate(prompt: AiPrompt, ctx: { task: AiTask }): Promise<AiResult>;
}

// Erros que fazem o roteador cair para os créditos do Pauta.
export class AiPlanLimitError extends Error {
  constructor(public reason: "limite" | "inelegivel" | "desconectado") {
    super(reason);
  }
}
