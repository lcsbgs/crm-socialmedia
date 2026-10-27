import { z } from "zod";

export const cadenceLabels = { diaria: "por dia útil", semanal: "por semana", mensal: "por mês" } as const;
export type Cadence = keyof typeof cadenceLabels;

export const packageItemSchema = z.object({
  tipo: z.string().trim().min(1, "Informe o tipo").max(40),
  quantidade: z.coerce.number().int().min(1, "Mínimo 1").max(50, "Máximo 50"),
  cadencia: z.enum(["diaria", "semanal", "mensal"]),
});

export type PackageItem = z.infer<typeof packageItemSchema>;

export const packageSchema = z.object({
  workspaceId: z.uuid(),
  nome: z.string().trim().min(1, "Informe o nome do pacote").max(80),
  itens: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Itens inválidos" });
        return z.NEVER;
      }
    })
    .pipe(z.array(packageItemSchema).min(1, "Adicione pelo menos um item").max(20)),
});

export function describeItems(itens: unknown) {
  const parsed = z.array(packageItemSchema).safeParse(itens);
  if (!parsed.success) return "";
  return parsed.data.map((i) => `${i.quantidade} ${i.tipo} ${cadenceLabels[i.cadencia]}`).join(" · ");
}

export const suggestedItems: PackageItem[] = [
  { tipo: "Post", quantidade: 3, cadencia: "semanal" },
  { tipo: "Reels", quantidade: 1, cadencia: "semanal" },
  { tipo: "Stories", quantidade: 1, cadencia: "diaria" },
  { tipo: "Relatório", quantidade: 1, cadencia: "mensal" },
];
