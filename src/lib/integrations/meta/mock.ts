import type { MetaAdapter } from "./types";

// Modo demonstração: contas fictícias e publicações simuladas.
export const mockMetaAdapter: MetaAdapter = {
  simulated: true,
  async exchangeCode() {
    return { accessToken: `simulado-${Date.now()}`, expiresAt: new Date(Date.now() + 60 * 86_400_000) };
  },
  async refreshToken() {
    return { accessToken: `simulado-${Date.now()}`, expiresAt: new Date(Date.now() + 60 * 86_400_000) };
  },
  async discoverAccounts() {
    return [
      { plataforma: "instagram", externalId: "demo-ig-1", nome: "@paoquente.caxias", username: "paoquente.caxias", pageId: "demo-fb-1" },
      { plataforma: "facebook", externalId: "demo-fb-1", nome: "Padaria Pão Quente" },
      { plataforma: "instagram", externalId: "demo-ig-2", nome: "@clinicasorrir", username: "clinicasorrir", pageId: "demo-fb-2" },
      { plataforma: "facebook", externalId: "demo-fb-2", nome: "Clínica Sorrir" },
      { plataforma: "instagram", externalId: "demo-ig-3", nome: "@studiolume", username: "studiolume" },
    ];
  },
  async publish(target) {
    const id = `demo_${target.plataforma}_${Date.now().toString(36)}`;
    return { externalId: id, permalink: null };
  },
};
