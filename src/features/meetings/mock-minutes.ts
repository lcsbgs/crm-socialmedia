import type { Minutes } from "./schemas";

// Ata de demonstração (sem ANTHROPIC_API_KEY): organiza as próprias anotações,
// sem inventar nada. Linhas com "decid", "combin" ou "ficou" viram decisões;
// linhas com verbo de ação ou marcador viram próximos passos.
export function mockMinutes(notas: string): Minutes {
  const linhas = notas
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 3);
  const decisoes = linhas.filter((l) => /decid|combin|ficou|aprovad/i.test(l)).slice(0, 10);
  const passos = linhas
    .filter((l) => !decisoes.includes(l) && /^(enviar|mandar|fazer|criar|marcar|revisar|ligar|preparar|postar|gravar|ajustar|definir|separar)/i.test(l))
    .slice(0, 10)
    .map((titulo) => ({ titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), due_date: null }));
  const resumo = linhas.slice(0, 3).join(". ").slice(0, 600) || "Reunião sem anotações.";
  return { resumo: `${resumo}${resumo.endsWith(".") ? "" : "."} (Ata em modo demonstração: revise antes de confirmar.)`, decisoes, proximos_passos: passos };
}
