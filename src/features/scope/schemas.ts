import { z } from "zod";
import { parseMoney } from "@/lib/format";

export const scopeStatusLabels = {
  pendente: "Pendente",
  cobrado: "Cobrado",
  absorvido: "Absorvido",
} as const;
export type ScopeStatus = keyof typeof scopeStatusLabels;

export const scopeRequestSchema = z.object({
  workspaceId: z.uuid(),
  clientId: z.uuid(),
  descricao: z.string().trim().min(1, "Descreva o pedido").max(2000),
  valor_sugerido: z.preprocess(
    (v) => (v === "" || v === undefined ? null : parseMoney(v)),
    z.number("Valor inválido").min(0).nullable(),
  ),
});

export const scopeStatusSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  status: z.enum(["pendente", "cobrado", "absorvido"]),
});
