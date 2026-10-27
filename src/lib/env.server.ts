import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverSchema>;

// Validação preguiçosa: só falha quando a variável é de fato usada,
// para o app subir mesmo sem a chave da Anthropic configurada.
export function serverEnv<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
  return serverSchema.shape[key].parse(process.env[key], {
    error: () => `Variável de ambiente ${key} ausente`,
  }) as ServerEnv[K];
}
