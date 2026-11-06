"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { briefingQuestions } from "@/features/clients/hub-schemas";
import { createAdminClient } from "@/lib/supabase/admin";

// Resposta do briefing público: passa pelo servidor com service role, validada aqui.
export async function submitBriefing(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = z.uuid().safeParse(formData.get("token"));
  if (!token.success) return { error: "Link inválido." };
  const nome = String(formData.get("nome") ?? "").trim().slice(0, 80);
  const respostas: Record<string, string> = {};
  for (const q of briefingQuestions) {
    const v = String(formData.get(q.key) ?? "").trim().slice(0, 3000);
    if (v) respostas[q.key] = v;
  }
  if (Object.keys(respostas).length < 2) return { error: "Responda pelo menos duas perguntas." };
  const { error } = await createAdminClient().rpc("submit_briefing", {
    p_token: token.data,
    p_respostas: respostas,
    p_nome: nome,
  });
  if (error) return { error: "Não foi possível enviar. Tente de novo." };
  return { message: "Recebido. Obrigado! Já dá para fechar esta página." };
}
