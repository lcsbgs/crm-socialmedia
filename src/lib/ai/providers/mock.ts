import type { AiProvider, AiTask } from "../types";

// Respostas de demonstração: coerentes com o pedido, sem chamar nenhuma API.
function between(text: string, re: RegExp) {
  return text.match(re)?.[1]?.trim() ?? "";
}

const samples: Record<AiTask, (user: string) => string> = {
  legenda: (u) => {
    const tema = between(u, /sobre "([^"]+)"/) || "o post";
    const marca = between(u, /Marca: ([^.(\n]+)/) || "a marca";
    return `${tema}: do jeito que a gente gosta de fazer, com calma e cuidado em cada detalhe. Aqui na ${marca}, cada passo tem um motivo, e hoje a gente mostra um pouquinho disso. Arrasta pro lado e vem ver de perto. Gostou? Manda no direct que a gente separa o seu.`;
  },
  encurtar: (u) => {
    const original = u.split("\n").slice(-1)[0] ?? "";
    const frases = original.split(/(?<=[.!?])\s+/).filter(Boolean);
    return frases.slice(0, Math.max(1, Math.ceil(frases.length / 2))).join(" ");
  },
  tom: (u) => {
    const original = u.split("\n").slice(-1)[0] ?? "";
    return `${original.replace(/\.$/, "")}. Feito com carinho, pensando em você.`;
  },
  chamada: (u) => {
    const original = u.split("\n").slice(-1)[0] ?? "";
    return `${original.trim()} Faça sua encomenda pelo direct ou pelo WhatsApp do perfil.`;
  },
  estrategia: () =>
    JSON.stringify({
      objetivo: "Aumentar os pedidos pelo direct no próximo trimestre",
      pilares: [
        { nome: "Produto", pct: 40 },
        { nome: "Bastidores", pct: 30 },
        { nome: "Educativo", pct: 20 },
        { nome: "Prova social", pct: 10 },
      ],
      formatos: [
        { formato: "Carrossel", frequencia: "2 por semana" },
        { formato: "Reels", frequencia: "1 por semana" },
        { formato: "Stories", frequencia: "diário" },
      ],
    }),
  ata: () => "Ata de demonstração: decisões e próximos passos aparecem aqui quando a IA estiver configurada.",
  relatorio: () =>
    "O mês fechou com mais alcance que o anterior. Os carrosséis tiveram o melhor desempenho; vale manter dois por semana e testar um reels de bastidores.",
  cobranca: () => "Oi! Tudo bem? Passando para lembrar da mensalidade deste mês. Qualquer coisa, me chama. Obrigado!",
};

export const mockProvider: AiProvider = {
  name: "mock",
  async generate(prompt, { task }) {
    const text = samples[task](prompt.user);
    return { text, tokensIn: Math.ceil(prompt.user.length / 4), tokensOut: Math.ceil(text.length / 4) };
  },
};
