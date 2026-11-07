"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAi } from "@/lib/ai";
import { reportPrompt } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { monthLabel } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { upsertReport } from "./generate";

export async function generateReport(input: { workspaceId: string; clientId: string; month: string }) {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const clientId = z.uuid().parse(input.clientId);
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(input.month);
  const supabase = await createClient();
  const r = await upsertReport(supabase, { workspaceId, clientId, month });
  if (!r) return { error: "Não foi possível gerar o relatório." };
  const { data: c } = await supabase.from("clients").select("nome").eq("id", clientId).single();
  const ai = await runAi(workspaceId, reportPrompt, { cliente: c?.nome ?? "Cliente", mes: monthLabel(month), resumo: JSON.stringify(r.resumo) });
  if (ai.ok) await supabase.from("reports").update({ leitura: ai.text }).eq("id", r.id);
  revalidatePath("/w", "layout");
  return { ok: true as const, warning: ai.ok ? ai.warning : "Relatório gerado sem a leitura da IA." };
}

export async function saveReport(input: { id: string; leitura: string; publicar: boolean }) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({
      leitura: input.leitura.slice(0, 5000),
      ...(input.publicar ? { status: "publicado", publicado_em: new Date().toISOString() } : {}),
    })
    .eq("id", z.uuid().parse(input.id));
  revalidatePath("/w", "layout");
  return error ? { error: "Não foi possível salvar." } : { ok: true as const };
}
