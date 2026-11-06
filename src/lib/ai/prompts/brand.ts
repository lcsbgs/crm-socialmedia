// Contexto da marca usado por todos os prompts de texto.
export type BrandContext = {
  cliente: string;
  segmento?: string | null;
  tom?: string[];
  evitar?: string[];
  pilar?: string | null;
  briefing?: string | null;
};

export function brandBlock(b: BrandContext) {
  return [
    `Marca: ${b.cliente}${b.segmento ? ` (${b.segmento})` : ""}.`,
    b.tom?.length ? `Tom de voz: ${b.tom.join(", ")}.` : "",
    b.evitar?.length ? `Nunca use: ${b.evitar.map((e) => `"${e}"`).join(", ")}.` : "",
    b.pilar ? `Pilar de conteúdo: ${b.pilar}.` : "",
    b.briefing ? `Briefing: ${b.briefing.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const baseRules =
  "Escreva em português do Brasil, natural, sem travessão (use vírgula, dois-pontos ou ponto). Sem hashtags genéricas. Responda só com o texto pedido, sem explicações.";
