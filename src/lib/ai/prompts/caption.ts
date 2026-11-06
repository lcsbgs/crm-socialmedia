import type { PromptDefinition } from "../types";
import { baseRules, brandBlock, type BrandContext } from "./brand";

// Prompts versionados: mudar o texto exige subir a versão (fica registrado em ai_usage).

export const captionPrompt: PromptDefinition<BrandContext & { titulo: string; formato: string; ideia?: string }> = {
  id: "legenda",
  version: "legenda@1",
  credits: 3,
  build: (v) => ({
    system: `Você é redatora de redes sociais de uma agência pequena. ${baseRules}`,
    user: `${brandBlock(v)}\n\nEscreva a legenda de um ${v.formato} sobre "${v.titulo}".${v.ideia ? `\nIdeia ou rascunho: ${v.ideia}` : ""}\nAté 600 caracteres, com uma chamada no final.`,
    maxTokens: 500,
  }),
};

export const shortenPrompt: PromptDefinition<BrandContext & { legenda: string }> = {
  id: "encurtar",
  version: "encurtar@1",
  credits: 1,
  build: (v) => ({
    system: `Você edita legendas mantendo o tom da marca. ${baseRules}`,
    user: `${brandBlock(v)}\n\nEncurte esta legenda para cerca de metade, sem perder a ideia principal:\n${v.legenda}`,
    maxTokens: 300,
  }),
};

export const tonePrompt: PromptDefinition<BrandContext & { legenda: string; alvo: string }> = {
  id: "tom",
  version: "tom@1",
  credits: 1,
  build: (v) => ({
    system: `Você edita legendas mantendo o sentido. ${baseRules}`,
    user: `${brandBlock(v)}\n\nReescreva esta legenda com um tom ${v.alvo}:\n${v.legenda}`,
    maxTokens: 400,
  }),
};

export const ctaPrompt: PromptDefinition<BrandContext & { legenda: string; objetivo: string }> = {
  id: "chamada",
  version: "chamada@1",
  credits: 1,
  build: (v) => ({
    system: `Você escreve chamadas para ação curtas. ${baseRules}`,
    user: `${brandBlock(v)}\n\nAcrescente ao fim desta legenda uma chamada para ${v.objetivo}. Devolva a legenda completa:\n${v.legenda}`,
    maxTokens: 400,
  }),
};

export const strategyPrompt: PromptDefinition<BrandContext & { objetivo?: string | null }> = {
  id: "estrategia",
  version: "estrategia@1",
  credits: 5,
  build: (v) => ({
    system: `Você é estrategista de conteúdo. ${baseRules} Responda em JSON válido.`,
    user: `${brandBlock(v)}\n${v.objetivo ? `Objetivo: ${v.objetivo}\n` : ""}\nMonte um rascunho de estratégia para o próximo trimestre. Formato:\n{"objetivo": string, "pilares": [{"nome": string, "pct": number}], "formatos": [{"formato": string, "frequencia": string}]}\nOs pilares somam 100.`,
    maxTokens: 700,
  }),
};
