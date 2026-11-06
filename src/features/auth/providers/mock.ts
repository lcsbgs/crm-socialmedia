import "server-only";
import type { LoginProviderAdapter } from "./types";

// Modo demonstração: abre uma tela de consentimento simulada dentro do próprio Pauta.
export const mockLoginAdapter: LoginProviderAdapter = {
  async start(provider, next) {
    return { url: `/auth/simulado/${provider}?next=${encodeURIComponent(next)}` };
  },
};
