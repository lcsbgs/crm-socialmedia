"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const markPaidSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  pago_em: z.iso.date().optional().catch(undefined),
});

export async function markPaymentPaid(formData: FormData) {
  await requireUser();
  const { workspaceId, id, pago_em } = markPaidSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  await supabase
    .from("payments")
    .update({ status: "pago", pago_em: pago_em ?? todayISO() })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidatePath("/w", "layout");
}

export async function undoPayment(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();

  const { data } = await supabase
    .from("payments")
    .select("vencimento")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return;

  await supabase
    .from("payments")
    .update({ status: data.vencimento < todayISO() ? "atrasado" : "pendente", pago_em: null })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidatePath("/w", "layout");
}

// Versão chamável direto da tela Hoje.
export async function markPaid(input: { workspaceId: string; id: string }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const id = z.uuid().parse(input.id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "pago", pago_em: todayISO() })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível marcar como paga." } : { ok: true };
}
