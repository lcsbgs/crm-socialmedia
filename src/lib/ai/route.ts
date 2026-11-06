// Decisão de provedor, separada para testar sem banco nem rede.

export type RouteInput = {
  workspaceMode: "creditos" | "chatgpt";
  connection: { status: "ativa" | "limite" | "inelegivel" | "revogada"; simulated: boolean } | null;
  hasAnthropicKey: boolean;
  integrationsMock: boolean;
  credits: { usados: number; limite: number };
  cost: number;
};

export type RoutePlan =
  | { kind: "chatgpt"; simulated: boolean; then: RouteCredits }
  | RouteCredits
  | { kind: "blocked"; reason: string };

type RouteCredits = { kind: "credits"; provider: "anthropic" | "mock"; warning?: string };

export function planAiRoute(i: RouteInput): RoutePlan {
  const creditsLeft = i.credits.limite - i.credits.usados;
  const credits: RouteCredits | { kind: "blocked"; reason: string } =
    creditsLeft >= i.cost
      ? { kind: "credits", provider: i.hasAnthropicKey ? "anthropic" : "mock" }
      : { kind: "blocked", reason: "Os créditos de IA do mês acabaram. Conecte o ChatGPT ou espere o próximo mês." };

  const usableChatgpt =
    i.connection &&
    i.connection.status === "ativa" &&
    // conexão simulada só vale em modo demonstração; conexão real só fora dele
    i.connection.simulated === i.integrationsMock;

  if (usableChatgpt && i.workspaceMode === "chatgpt") {
    const fallback: RouteCredits =
      credits.kind === "credits"
        ? { ...credits, warning: "O limite do seu plano do ChatGPT acabou. Usei os créditos do Pauta." }
        : { kind: "credits", provider: "mock", warning: "Limite do ChatGPT e créditos do Pauta acabaram." };
    return { kind: "chatgpt", simulated: i.connection!.simulated, then: fallback };
  }
  if (i.connection && i.connection.status !== "ativa" && i.workspaceMode === "chatgpt" && credits.kind === "credits") {
    return {
      ...credits,
      warning:
        i.connection.status === "limite"
          ? "O limite semanal do seu ChatGPT acabou. Usando os créditos do Pauta."
          : "Sua conta do ChatGPT não pode ser usada aqui. Usando os créditos do Pauta.",
    };
  }
  return credits;
}
