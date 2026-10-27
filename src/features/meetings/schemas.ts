import { z } from "zod";

// Formato que a IA devolve (structured outputs). Campos obrigatórios e
// due_date nulo quando não houver prazo, para o schema ficar simples e estrito.
export const aiMinutesSchema = z.object({
  resumo: z.string().describe("Resumo objetivo da reunião em 2 a 5 frases"),
  decisoes: z.array(z.string()).describe("Decisões tomadas, uma por item"),
  proximos_passos: z
    .array(
      z.object({
        titulo: z.string().describe("Ação concreta, começando com verbo no infinitivo"),
        due_date: z
          .string()
          .nullable()
          .describe("Prazo em YYYY-MM-DD se mencionado ou dedutível, senão null"),
      }),
    )
    .describe("Próximos passos acionáveis"),
});

// Validação do que fica salvo (após revisão do usuário).
export const minutesSchema = z.object({
  resumo: z.string().trim().max(5000),
  decisoes: z.array(z.string().trim().min(1).max(500)).max(50),
  proximos_passos: z
    .array(
      z.object({
        titulo: z.string().trim().min(1).max(200),
        due_date: z.iso.date().nullable().catch(null),
      }),
    )
    .max(50),
});
export type Minutes = z.infer<typeof minutesSchema>;

// <input type="datetime-local"> vem sem fuso; interpretamos como horário de Brasília.
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data inválida")
  .transform((v) => new Date(`${v}:00-03:00`).toISOString());

export const meetingSchema = z.object({
  workspaceId: z.uuid(),
  clientId: z.uuid(),
  titulo: z.string().trim().min(1, "Informe o título").max(200),
  data: localDateTime,
  notas_brutas: z.string().max(50000).default(""),
});

export const updateNotesSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  titulo: z.string().trim().min(1, "Informe o título").max(200),
  data: localDateTime,
  notas_brutas: z.string().max(50000),
});

export const confirmMinutesSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  ata: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Ata inválida" });
        return z.NEVER;
      }
    })
    .pipe(minutesSchema),
});

// "2026-10-27T13:00:00Z" -> "2026-10-27T10:00" (Brasília) para o input.
export function toLocalInput(iso: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}
