import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(32),
  MOCK_AUTH_SECRET: z.string().min(16),
});

// Variável opcional: devolve undefined em vez de falhar.
export function optionalServerEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v : undefined;
}

type ServerEnv = z.infer<typeof serverSchema>;

// Validação preguiçosa: só falha quando a variável é de fato usada,
// para o app subir mesmo sem a chave da Anthropic configurada.
export function serverEnv<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
  return serverSchema.shape[key].parse(process.env[key], {
    error: () => `Variável de ambiente ${key} ausente`,
  }) as ServerEnv[K];
}
