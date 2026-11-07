"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  deliverables: { id: string; titulo: string | null; client_id: string; clientNome: string; cor: number }[];
  tasks: {
    id: string;
    titulo: string;
    due_date: string | null;
    clientNome: string | null;
    cor: number | null;
  }[];
  meetings: { id: string; titulo: string; data: string; client_id: string; clientNome: string; cor: number }[];
  leads: { id: string; nome: string; proposalId: string | null }[];
};

// Busca da command palette: posts, tarefas pendentes, reuniões e leads do espaço.
export async function searchWorkspace(workspaceId: string, query: string): Promise<SearchResult> {
  await requireUser();
  const ws = z.uuid().parse(workspaceId);
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return { deliverables: [], tasks: [], meetings: [], leads: [] };
  const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  const supabase = await createClient();
  const [deliverables, tasks, meetings, leads] = await Promise.all([
    supabase
      .from("deliverables")
      .select("id, titulo, client_id, client:clients!inner (nome, cor)")
      .eq("workspace_id", ws)
      .ilike("titulo", pattern)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("tasks")
      .select("id, titulo, due_date, client:clients (nome, cor)")
      .eq("workspace_id", ws)
      .eq("status", "pendente")
      .ilike("titulo", pattern)
      .order("due_date", { nullsFirst: false })
      .limit(6),
    supabase
      .from("meetings")
      .select("id, titulo, data, client_id, client:clients!inner (nome, cor)")
      .eq("workspace_id", ws)
      .ilike("titulo", pattern)
      .order("data", { ascending: false })
      .limit(5),
    // Comercial só aparece para owner/admin (o RLS devolve vazio para membros).
    supabase.from("leads").select("id, nome, proposals (id)").eq("workspace_id", ws).ilike("nome", pattern).limit(5),
  ]);

  return {
    deliverables: (deliverables.data ?? []).map((d) => ({
      id: d.id,
      titulo: d.titulo,
      client_id: d.client_id,
      clientNome: d.client.nome,
      cor: d.client.cor ?? 0,
    })),
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      titulo: t.titulo,
      due_date: t.due_date,
      clientNome: t.client?.nome ?? null,
      cor: t.client?.cor ?? null,
    })),
    meetings: (meetings.data ?? []).map((m) => ({ id: m.id, titulo: m.titulo, data: m.data, client_id: m.client_id, clientNome: m.client.nome, cor: m.client.cor ?? 0 })),
    leads: (leads.data ?? []).map((l) => ({ id: l.id, nome: l.nome, proposalId: l.proposals?.[0]?.id ?? null })),
  };
}
