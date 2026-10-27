import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CalendarMeeting } from "@/features/deliverables/components/month-calendar";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export async function getCalendarMeetings(
  workspaceId: string,
  from: string,
  to: string,
  clientId?: string,
): Promise<CalendarMeeting[]> {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select("id, titulo, data, client:clients!inner (id, nome, cor)")
    .eq("workspace_id", workspaceId)
    .gte("data", new Date(`${from}T00:00:00-03:00`).toISOString())
    .lte("data", new Date(`${to}T23:59:59-03:00`).toISOString())
    .order("data");
  if (clientId) query = query.eq("client_id", clientId);
  const { data } = await query;
  return (data ?? []).map((m) => ({
    id: m.id,
    titulo: m.titulo,
    date: dateFmt.format(new Date(m.data)),
    time: timeFmt.format(new Date(m.data)),
    client: { id: m.client.id, nome: m.client.nome, cor: m.client.cor ?? 0 },
  }));
}
