"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { generateMinutes } from "./ai";
import { confirmMinutesSchema, meetingSchema, updateNotesSchema } from "./schemas";

export async function createMeeting(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = meetingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, clientId, ...values } = parsed.data;
  const slug = String(formData.get("slug") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({ ...values, workspace_id: workspaceId, client_id: clientId })
    .select("id")
    .single();
  if (error || !data) return fromDbError(error);

  revalidatePath("/w", "layout");
  redirect(`/w/${slug}/clientes/${clientId}/reunioes/${data.id}`);
}

export async function saveMeetingNotes(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = updateNotesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update(values)
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) return fromDbError(error);

  revalidatePath("/w", "layout");
  return { message: "Anotações salvas." };
}

// Gera a ata com IA a partir das anotações salvas. Guarda como rascunho em ata_ia.
export async function generateMeetingMinutes(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));

  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("notas_brutas, data, ata_confirmada_em, client:clients!inner (nome)")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (!meeting) return { error: "Reunião não encontrada." };
  if (meeting.ata_confirmada_em) return { error: "A ata desta reunião já foi confirmada." };
  if (meeting.notas_brutas.trim().length < 20) {
    return { error: "Escreva e salve as anotações antes de gerar a ata." };
  }

  const result = await generateMinutes({
    notas: meeting.notas_brutas,
    clienteNome: meeting.client.nome,
    dataReuniao: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(meeting.data),
    ),
  });
  if (!result.ok) return { error: result.error };

  const { error } = await supabase
    .from("meetings")
    .update({ ata_ia: result.ata })
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) return fromDbError(error);

  revalidatePath("/w", "layout");
  return { message: "Ata gerada. Revise antes de confirmar." };
}

// Usuário revisou: grava a ata e cria as tarefas dos próximos passos.
export async function confirmMeetingMinutes(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = confirmMinutesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { workspaceId, id, ata } = parsed.data;

  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("client_id, ata_confirmada_em")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (!meeting) return { error: "Reunião não encontrada." };
  if (meeting.ata_confirmada_em) return { error: "A ata desta reunião já foi confirmada." };

  // Marca como confirmada primeiro (condicional), para um duplo clique não duplicar tarefas.
  const { data: claimed, error } = await supabase
    .from("meetings")
    .update({ ata_ia: ata, decisoes: ata.decisoes, ata_confirmada_em: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .is("ata_confirmada_em", null)
    .select("id");
  if (error) return fromDbError(error);
  if (!claimed.length) return { error: "A ata desta reunião já foi confirmada." };

  if (ata.proximos_passos.length) {
    const { error: tasksError } = await supabase.from("tasks").insert(
      ata.proximos_passos.map((p) => ({
        workspace_id: workspaceId,
        client_id: meeting.client_id,
        meeting_id: id,
        titulo: p.titulo,
        due_date: p.due_date,
        tipo: "avulsa" as const,
        origem: "ata" as const,
      })),
    );
    if (tasksError) {
      await supabase
        .from("meetings")
        .update({ ata_confirmada_em: null })
        .eq("workspace_id", workspaceId)
        .eq("id", id);
      return fromDbError(tasksError);
    }
  }

  revalidatePath("/w", "layout");
  return {
    message: `Ata confirmada. ${plural(ata.proximos_passos.length, "tarefa criada", "tarefas criadas")}.`,
  };
}

export async function deleteMeeting(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));
  const back = String(formData.get("back") ?? "/w");

  const supabase = await createClient();
  await supabase.from("meetings").delete().eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath("/w", "layout");
  redirect(back.startsWith("/w/") ? back : "/w");
}
