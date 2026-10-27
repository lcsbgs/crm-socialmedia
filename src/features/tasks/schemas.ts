import { z } from "zod";

export const createTaskSchema = z.object({
  workspaceId: z.uuid(),
  titulo: z.string().trim().min(1, "Informe a tarefa").max(200),
  client_id: z
    .string()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable())
    .optional(),
  due_date: z
    .string()
    .transform((v) => v || null)
    .pipe(z.iso.date().nullable())
    .optional(),
});
