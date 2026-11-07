"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contactSchema } from "@/features/clients/schemas";
import { requireUser } from "@/lib/auth";
import { mockCanva, realCanva } from "@/lib/integrations/canva";
import { mockGoogle, realGoogle, type GoogleAdapter } from "@/lib/integrations/google";
import { mockGranola, realGranola } from "@/lib/integrations/granola";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";
import { getIntegration } from "./store";

type Result = { ok: true; message?: string } | { error: string };

async function clientContacts(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, nome, contatos").eq("workspace_id", workspaceId).neq("status", "encerrado");
  return (data ?? []).flatMap((c) =>
    z
      .array(contactSchema)
      .catch([])
      .parse(c.contatos)
      .filter((ct) => ct.email)
      .map((ct) => ({ clientId: c.id, cliente: c.nome, email: ct.email!.toLowerCase() })),
  );
}

async function google(workspaceId: string): Promise<{ adapter: GoogleAdapter; token: string } | { error: string }> {
  const conn = await getIntegration(workspaceId, "google");
  if (!conn) return { error: "Conecte o Google em Ajustes, Integrações." };
  if (conn.simulated) {
    if (!isMockMode()) return { error: "Conexão simulada não vale no modo real. Reconecte o Google." };
    const contacts = await clientContacts(workspaceId);
    return { adapter: mockGoogle(contacts), token: "" };
  }
  // TODO(oauth-setup): renovar com refresh token quando expirar (ver docs/oauth-setup.md).
  return { adapter: realGoogle, token: conn.accessToken ?? "" };
}

// Traz as reuniões dos próximos 7 dias do Google Agenda, ligando ao cliente pelo e-mail dos convidados.
export async function syncGoogleMeetings(input: { workspaceId: string }): Promise<Result> {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const g = await google(workspaceId);
  if ("error" in g) return g;
  const from = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00-03:00");
  const to = new Date(from.getTime() + 7 * 86_400_000);
  const contacts = await clientContacts(workspaceId);
  const events = await g.adapter.listEvents(g.token, from.toISOString(), to.toISOString());
  const supabase = await createClient();
  let criadas = 0;
  for (const e of events) {
    const match = contacts.find((c) => e.convidados.includes(c.email));
    if (!match) continue;
    const dur = Math.max(5, Math.round((Date.parse(e.fim) - Date.parse(e.inicio)) / 60000));
    const { error } = await supabase.from("meetings").upsert(
      {
        workspace_id: workspaceId,
        client_id: match.clientId,
        titulo: e.titulo.slice(0, 200),
        data: e.inicio,
        duracao_min: Math.min(dur, 480),
        origem: "google",
        google_event_id: e.id,
        meet_link: e.meetLink,
      },
      { onConflict: "workspace_id,google_event_id", ignoreDuplicates: false },
    );
    if (!error) criadas++;
  }
  revalidatePath("/w", "layout");
  return { ok: true, message: criadas ? `${criadas} reuniões com clientes vieram do Google Agenda.` : "Nenhuma reunião com e-mail de cliente nos próximos 7 dias." };
}

export async function createGoogleMeet(input: { workspaceId: string; meetingId: string }): Promise<Result> {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("meetings")
    .select("id, titulo, data, duracao_min, client_id")
    .eq("workspace_id", workspaceId)
    .eq("id", z.uuid().parse(input.meetingId))
    .maybeSingle();
  if (!m) return { error: "Reunião não encontrada." };
  const g = await google(workspaceId);
  if ("error" in g) return g;
  const convidados = (await clientContacts(workspaceId)).filter((c) => c.clientId === m.client_id).map((c) => c.email);
  const ev = await g.adapter.createEvent(g.token, {
    titulo: m.titulo,
    inicio: m.data,
    fim: new Date(Date.parse(m.data) + m.duracao_min * 60000).toISOString(),
    convidados,
  });
  await supabase.from("meetings").update({ google_event_id: ev.id, meet_link: ev.meetLink, origem: "google" }).eq("id", m.id);
  revalidatePath("/w", "layout");
  return { ok: true, message: "Reunião criada no Google Agenda com Meet." };
}

export async function createClientDriveFolder(input: { workspaceId: string; clientId: string }): Promise<Result> {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const supabase = await createClient();
  const { data: c } = await supabase.from("clients").select("id, nome").eq("id", z.uuid().parse(input.clientId)).maybeSingle();
  if (!c) return { error: "Cliente não encontrado." };
  const g = await google(workspaceId);
  if ("error" in g) return g;
  const folder = await g.adapter.createFolder(g.token, `Pauta, ${c.nome}`);
  await supabase.from("clients").update({ drive_folder_url: folder.url }).eq("id", c.id);
  revalidatePath("/w", "layout");
  return { ok: true, message: "Pasta criada no Drive." };
}

// Granola: traz a nota da reunião para as anotações; a ata vira sugestões confirmáveis no fluxo de sempre.
export async function importGranolaNotes(input: { workspaceId: string; meetingId: string }): Promise<Result> {
  await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("meetings")
    .select("id, titulo, data, notas_brutas, ata_confirmada_em")
    .eq("workspace_id", workspaceId)
    .eq("id", z.uuid().parse(input.meetingId))
    .maybeSingle();
  if (!m) return { error: "Reunião não encontrada." };
  if (m.ata_confirmada_em) return { error: "A ata desta reunião já foi confirmada." };
  const conn = await getIntegration(workspaceId, "granola");
  if (!conn) return { error: "Conecte o Granola em Ajustes, Integrações, ou cole as notas." };
  const adapter = conn.simulated ? mockGranola : realGranola();
  const note = await adapter.findNoteFor(conn.accessToken ?? "", { titulo: m.titulo, data: m.data });
  if (!note) return { error: "Não achei esta reunião no Granola. Cole as notas no campo abaixo." };
  const notas = m.notas_brutas ? `${m.notas_brutas}\n\n${note.texto}` : note.texto;
  await supabase.from("meetings").update({ notas_brutas: notas.slice(0, 50000), granola_note_id: note.id }).eq("id", m.id);
  revalidatePath("/w", "layout");
  return { ok: true, message: "Notas do Granola trazidas. Agora gere a ata para revisar as sugestões." };
}

// Canva: cria o design e manda para o editor do Canva (real) ou para a tela simulada.
export async function openCanva(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const deliverableId = z.uuid().parse(formData.get("deliverableId"));
  const slug = z.string().parse(formData.get("slug"));
  const conn = await getIntegration(workspaceId, "canva");
  if (!conn) redirect(`/w/${slug}/ajustes/integracoes?erro=canva`);
  if (conn.simulated) redirect(`/w/${slug}/integracoes/canva?post=${deliverableId}&editor=1`);
  const supabase = await createClient();
  const { data: d } = await supabase.from("deliverables").select("titulo, slot_label, formato").eq("id", deliverableId).single();
  const size = d?.formato === "reels" || d?.formato === "story" ? { largura: 1080, altura: 1920 } : { largura: 1080, altura: 1350 };
  const design = await realCanva.createDesign(conn.accessToken ?? "", { titulo: d?.titulo ?? d?.slot_label ?? "Post", ...size, paginas: 1 });
  const url = new URL(design.editUrl);
  url.searchParams.set("correlation_state", `${slug}:${deliverableId}:${design.designId}`);
  redirect(url.toString());
}

void mockCanva;
