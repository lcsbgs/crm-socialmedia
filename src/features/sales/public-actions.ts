"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

async function ip() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "";
}

export async function acceptProposalPublic(input: { token: string; nome: string }) {
  const token = z.uuid().safeParse(input.token);
  if (!token.success) return { error: "Link inválido." };
  const { error } = await createAdminClient().rpc("accept_proposal", { p_token: token.data, p_nome: input.nome.slice(0, 80), p_ip: await ip() });
  if (error) return { error: error.code === "22023" ? error.message : "Não foi possível registrar o aceite." };
  return { ok: true as const };
}

export async function signContractPublic(input: { token: string; nome: string; concordo: boolean }) {
  const token = z.uuid().safeParse(input.token);
  if (!token.success) return { error: "Link inválido." };
  if (!input.concordo) return { error: "Marque que leu e concorda com o contrato." };
  const { error } = await createAdminClient().rpc("sign_contract", { p_token: token.data, p_nome: input.nome.slice(0, 80), p_ip: await ip() });
  if (error) return { error: error.code === "22023" ? error.message : "Não foi possível assinar." };
  return { ok: true as const };
}
