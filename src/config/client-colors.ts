// Paleta fixa de cores de cliente (índice salvo em clients.cor).
// Tons sóbrios, legíveis como texto pequeno sobre fundo claro e escuro.
export const clientColors = [
  { name: "Ameixa", hex: "#8E2F6B" },
  { name: "Petróleo", hex: "#2F6B73" },
  { name: "Oliva", hex: "#6B7A2F" },
  { name: "Telha", hex: "#A4512F" },
  { name: "Índigo", hex: "#45508F" },
  { name: "Musgo", hex: "#3F6B4A" },
  { name: "Caramelo", hex: "#9A6A22" },
  { name: "Ardósia", hex: "#5B6470" },
  { name: "Vinho", hex: "#7A2F3B" },
  { name: "Lavanda", hex: "#6E5A9A" },
] as const;

export function clientColor(index: number | null | undefined) {
  return clientColors[(index ?? 0) % clientColors.length].hex;
}
