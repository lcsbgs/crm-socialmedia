"use server";

import { fromZodError, type ActionState } from "@/lib/action-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalResponseSchema } from "./schemas";

// Ação pública (sem login). A validação do token e da etapa acontece no banco,
// em portal_respond(), que só o service role pode executar.
export async function respondToDeliverable(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = portalResponseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { token, deliverableId, decisao, comentario, autor_nome } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.rpc("portal_respond", {
    p_token: token,
    p_deliverable_id: deliverableId,
    p_decisao: decisao,
    p_comentario: comentario,
    p_autor_nome: autor_nome,
  });
  if (error) {
    return {
      error:
        error.code === "22023" ? error.message : "Não foi possível registrar sua resposta. Tente de novo.",
    };
  }

  // Sem revalidar: o card fica na tela mostrando a confirmação. Ao recarregar, some.
  return { message: decisao === "aprovado" ? "Aprovado. Obrigado!" : "Pedido de ajuste enviado. Obrigado!" };
}
