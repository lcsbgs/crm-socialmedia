// Paleta fixa de cores de cliente (índice salvo em clients.cor).
// Cada cor tem a forte (quadrado, ponto, avatar), a tonal (fundo de etiqueta e cartão),
// o texto escuro sobre a tonal (contraste AA) e um tom médio para miniaturas.
export type ClientColor = { name: string; hex: string; tonal: string; ink: string; thumb: string };

export const clientColors: readonly ClientColor[] = [
  { name: "Laranja", hex: "#F28C28", tonal: "#FFF1E6", ink: "#8A3A06", thumb: "#F7D9B9" },
  { name: "Verde-água", hex: "#1C8C86", tonal: "#E2F4F2", ink: "#0F5C58", thumb: "#C9EDE9" },
  { name: "Rosa", hex: "#D9468F", tonal: "#FCE3F0", ink: "#9C1F5E", thumb: "#F9D4E7" },
  { name: "Azul", hex: "#3D6FE0", tonal: "#E4ECFC", ink: "#1F4BAF", thumb: "#D6E2FB" },
  { name: "Roxo", hex: "#7A4FD6", tonal: "#EFE8FB", ink: "#5A2FB0", thumb: "#E3D8F8" },
  { name: "Verde", hex: "#3E9B4F", tonal: "#E5F4E7", ink: "#1E6B2E", thumb: "#CDEBD2" },
  { name: "Vermelho", hex: "#D9483B", tonal: "#FDE6E3", ink: "#9E2418", thumb: "#F8CFCA" },
  { name: "Mostarda", hex: "#C99A06", tonal: "#FBF3D5", ink: "#6B4F00", thumb: "#F1E2A8" },
  { name: "Petróleo", hex: "#2B6E8F", tonal: "#E1EEF4", ink: "#174A63", thumb: "#C6DDE9" },
  { name: "Grafite", hex: "#5B6470", tonal: "#ECEEF1", ink: "#363D47", thumb: "#D9DDE3" },
] as const;

export function clientPalette(index: number | null | undefined): ClientColor {
  const n = clientColors.length;
  return clientColors[(((index ?? 0) % n) + n) % n];
}

export function clientColor(index: number | null | undefined) {
  return clientPalette(index).hex;
}
