"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveAccount(input: { nome: string; resumoDiario: boolean }) {
  const user = await requireUser();
  const nome = input.nome.trim();
  if (nome.length < 2) return { error: "Informe seu nome." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ nome: nome.slice(0, 80), resumo_diario: input.resumoDiario }).eq("id", user.id);
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível salvar." } : { ok: true as const };
}
