import { z } from "zod";

export const portalResponseSchema = z
  .object({
    token: z.uuid(),
    deliverableId: z.uuid(),
    decisao: z.enum(["aprovado", "ajuste"]),
    autor_nome: z.string().trim().min(1, "Informe seu nome").max(80),
    comentario: z.string().trim().max(2000).default(""),
  })
  .refine((v) => v.decisao === "aprovado" || v.comentario.length > 0, {
    path: ["comentario"],
    message: "Conte o que precisa ser ajustado",
  });
