import { z } from "zod";

export const formatLabels = {
  post: "Post",
  reels: "Reels",
  carrossel: "Carrossel",
  story: "Story",
  relatorio: "Relatório",
} as const;
export type DeliverableFormat = keyof typeof formatLabels;

// Etapas do post. "aprovado" (cliente aprovou, falta agendar) aparece na coluna Agendado.
export const statusLabels = {
  planejar: "Planejado",
  produzir: "Em produção",
  em_aprovacao: "Em aprovação",
  ajuste: "Ajuste pedido",
  aprovado: "Aprovado",
  agendado: "Agendado",
  publicado: "Publicado",
} as const;
export type DeliverableStatus = keyof typeof statusLabels;

export const statusColumns = [
  { id: "planejar", label: "Planejado", color: "#8A93A3" },
  { id: "produzir", label: "Em produção", color: "#6B4EFF" },
  { id: "em_aprovacao", label: "Em aprovação", color: "#E0A800" },
  { id: "ajuste", label: "Ajuste pedido", color: "#C2410C" },
  { id: "agendado", label: "Agendado", color: "#1F7A4D" },
  { id: "publicado", label: "Publicado", color: "#3E4656" },
] as const;
export type ColumnId = (typeof statusColumns)[number]["id"];

export function columnOf(status: DeliverableStatus): ColumnId {
  return status === "aprovado" ? "agendado" : status;
}

// Ordem das etapas no editor (bolinhas de progresso).
export const stageOrder: ColumnId[] = ["planejar", "produzir", "em_aprovacao", "agendado", "publicado"];

const formatEnum = z.enum(["post", "reels", "carrossel", "story", "relatorio"]);
const statusEnum = z.enum(["planejar", "produzir", "em_aprovacao", "ajuste", "aprovado", "agendado", "publicado"]);
const optionalDate = z
  .string()
  .transform((v) => v || null)
  .pipe(z.iso.date().nullable())
  .optional();

export const createDeliverableSchema = z.object({
  workspaceId: z.uuid(),
  clientId: z.uuid(),
  titulo: z.string().trim().min(1, "Informe o título").max(200),
  formato: formatEnum.default("post"),
  data_publicacao: optionalDate,
});

export const updateDeliverableSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  // Vazio mantém o rascunho do pacote sem título.
  titulo: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
  formato: formatEnum,
  status: statusEnum,
  data_publicacao: optionalDate,
  legenda: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => v || null),
});

export const moveDeliverableSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  status: statusEnum,
  ordem: z.number().finite(),
});

// Caminho no bucket: {workspace}/{cliente}/{entrega}/{arquivo}
export function mediaPrefix(workspaceId: string, clientId: string, deliverableId: string) {
  return `${workspaceId}/${clientId}/${deliverableId}/`;
}

// Nome exibido: título real ou, no rascunho do pacote, o rótulo do slot.
export function deliverableLabel(d: { titulo: string | null; slot_label?: string | null }) {
  return d.titulo ?? d.slot_label ?? "Sem título";
}

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_MEDIA =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,application/pdf";
