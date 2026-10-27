import { z } from "zod";

export const formatLabels = {
  post: "Post",
  reels: "Reels",
  carrossel: "Carrossel",
  story: "Story",
  relatorio: "Relatório",
} as const;
export type DeliverableFormat = keyof typeof formatLabels;

export const statusColumns = [
  { id: "planejar", label: "Planejar" },
  { id: "produzir", label: "Produzir" },
  { id: "em_aprovacao", label: "Em aprovação" },
  { id: "aprovado", label: "Aprovado" },
  { id: "publicado", label: "Publicado" },
] as const;
export type DeliverableStatus = (typeof statusColumns)[number]["id"];

const formatEnum = z.enum(["post", "reels", "carrossel", "story", "relatorio"]);
const statusEnum = z.enum(["planejar", "produzir", "em_aprovacao", "aprovado", "publicado"]);
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
  titulo: z.string().trim().min(1, "Informe o título").max(200),
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

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_MEDIA =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,application/pdf";
