import "server-only";

// Modo das integrações externas. "mock" (padrão) simula todas as conexões com dados de exemplo;
// "real" usa os provedores de verdade, que precisam das credenciais descritas em docs/oauth-setup.md.
export type IntegrationsMode = "mock" | "real";

export function integrationsMode(): IntegrationsMode {
  return process.env.INTEGRATIONS_MODE === "real" ? "real" : "mock";
}

export function isMockMode() {
  return integrationsMode() === "mock";
}
