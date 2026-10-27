import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

export type ActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: Record<string, string>;
} | null;

export function fromZodError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: "Confira os campos destacados.", fieldErrors };
}

// Traduz erros do Postgres/PostgREST para mensagens de UI.
export function fromDbError(
  error: PostgrestError | null,
  fallback = "Não foi possível concluir. Tente de novo.",
): ActionState {
  if (!error) return { error: fallback };
  if (error.hint?.startsWith("PLAN_LIMIT")) {
    return { error: `${error.message}. Faça upgrade do plano para continuar.` };
  }
  if (error.code === "42501")
    return {
      error:
        error.message.includes("permission") || error.message.includes("policy")
          ? "Você não tem permissão para isso."
          : error.message,
    };
  if (error.code === "22023" || error.code === "P0002") return { error: error.message };
  return { error: fallback };
}
