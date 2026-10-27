import { z } from "zod";
import { parseMoney } from "@/lib/format";

export const clientStatusLabels = { ativo: "Ativo", pausado: "Pausado", encerrado: "Encerrado" } as const;
export type ClientStatus = keyof typeof clientStatusLabels;

export const contactSchema = z.object({
  nome: z.string().trim().max(80),
  cargo: z.string().trim().max(60).optional().default(""),
  telefone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
});
export type Contact = z.infer<typeof contactSchema>;

export const linkSchema = z.object({
  label: z.string().trim().max(40),
  url: z.string().trim().max(300),
});
export type ClientLink = z.infer<typeof linkSchema>;

function jsonList<T extends z.ZodType>(item: T) {
  return z
    .string()
    .default("[]")
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Lista inválida" });
        return z.NEVER;
      }
    })
    .pipe(z.array(item).max(20));
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const clientSchema = z.object({
  workspaceId: z.uuid(),
  nome: z.string().trim().min(1, "Informe o nome do cliente").max(120),
  segmento: optionalText(80),
  briefing: optionalText(5000),
  tom_de_voz: optionalText(1000),
  status: z.enum(["ativo", "pausado", "encerrado"]).default("ativo"),
  package_template_id: z
    .string()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable())
    .optional(),
  valor_mensal: z
    .preprocess(
      (v) => (v === "" || v === undefined ? null : parseMoney(v)),
      z.number("Valor inválido").min(0).nullable(),
    )
    .optional(),
  dia_vencimento: z
    .preprocess(
      (v) => (v === "" || v === undefined ? null : Number(v)),
      z.number().int().min(1, "Entre 1 e 31").max(31, "Entre 1 e 31").nullable(),
    )
    .optional(),
  inicio_contrato: z
    .string()
    .transform((v) => v || null)
    .pipe(z.iso.date().nullable())
    .optional(),
  contatos: jsonList(contactSchema).transform((list) => list.filter((c) => c.nome || c.telefone || c.email)),
  links: jsonList(linkSchema).transform((list) => list.filter((l) => l.url)),
});

export type ClientInput = z.infer<typeof clientSchema>;
