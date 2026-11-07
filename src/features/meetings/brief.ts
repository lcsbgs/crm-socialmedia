import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Brief da reunião: o que o cliente tem em aberto, montado só com dados reais.
export async function getMeetingBrief(workspaceId: string, clientId: string, canSeeFinance: boolean) {
  const supabase = await createClient();
  const month = new Date().toISOString().slice(0, 7);
  const prevStart = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 2, 1)).toISOString().slice(0, 10);
  const [waiting, strategy, tasks, payment, published] = await Promise.all([
    supabase.from("deliverables").select("id, status_changed_at").eq("client_id", clientId).eq("status", "em_aprovacao"),
    supabase.from("client_strategies").select("decisoes").eq("client_id", clientId).maybeSingle(),
    supabase.from("tasks").select("titulo, due_date").eq("client_id", clientId).eq("status", "pendente").order("due_date").limit(5),
    canSeeFinance
      ? supabase.from("payments").select("status, vencimento").eq("client_id", clientId).eq("competencia", `${month}-01`).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("deliverables").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "publicado").gte("data_publicacao", prevStart).lt("data_publicacao", `${month}-01`),
  ]);
  const items: string[] = [];
  const w = waiting.data ?? [];
  if (w.length) {
    const dias = Math.floor((Date.now() - Math.min(...w.map((x) => Date.parse(x.status_changed_at)))) / 86_400_000);
    items.push(`${w.length === 1 ? "1 post aguardando" : `${w.length} posts aguardando`} aprovação${dias ? ` há ${dias} ${dias === 1 ? "dia" : "dias"}` : ""}`);
  }
  const decisao = z.array(z.object({ data: z.string(), texto: z.string() })).catch([]).parse(strategy.data?.decisoes ?? [])[0];
  if (decisao) items.push(`Decidido${decisao.data ? ` em ${decisao.data.split("-").reverse().slice(0, 2).join("/")}` : ""}: ${decisao.texto}`);
  for (const t of tasks.data ?? []) items.push(`Em aberto: ${t.titulo}${t.due_date ? ` (vence ${t.due_date.split("-").reverse().slice(0, 2).join("/")})` : ""}`);
  if (payment.data) items.push(payment.data.status === "pago" ? "Pagamento do mês recebido" : `Pagamento do mês ${payment.data.status === "atrasado" ? "atrasado" : "em aberto"}`);
  if (published.count) items.push(`Mês passado: ${published.count} posts publicados`);
  return items;
}
