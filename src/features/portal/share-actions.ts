"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Ação da equipe (logada): troca o token do portal do cliente.
export async function regeneratePortalLink(input: { workspaceId: string; clientId: string }) {
  await requireUser();
  const clientId = z.uuid().parse(input.clientId);
  z.uuid().parse(input.workspaceId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_portal_token", { p_client_id: clientId });
  if (error) return { error: "Não foi possível gerar um novo link." };

  revalidatePath("/w", "layout");
  return { ok: true };
}
