import { NextResponse, type NextRequest } from "next/server";
import { brand } from "@/config/brand";
import { publicEnv } from "@/lib/env";
import { emailAdapter } from "@/lib/email";
import { isAuthorizedJob } from "@/lib/jobs/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Resumo diário por e-mail (opcional, Minha conta). Só números reais do dia.
export async function POST(request: NextRequest) {
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const dayStart = new Date(`${today}T00:00:00-03:00`).toISOString();
  const dayEnd = new Date(Date.parse(dayStart) + 86_400_000).toISOString();
  const { data: people } = await admin.from("profiles").select("id, nome, email").eq("resumo_diario", true).not("email", "is", null);
  let enviados = 0;
  for (const p of people ?? []) {
    const { data: members } = await admin.from("workspace_members").select("role, workspace:workspaces!inner (id, nome, slug)").eq("user_id", p.id);
    const blocos: string[] = [];
    for (const m of members ?? []) {
      const ws = m.workspace;
      const [reunioes, aprov, publica, tarefas, atrasadas] = await Promise.all([
        admin.from("meetings").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("data", dayStart).lt("data", dayEnd),
        admin.from("deliverables").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "em_aprovacao"),
        admin.from("deliverables").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("data_publicacao", today).in("status", ["aprovado", "agendado"]),
        admin.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "pendente").lte("due_date", today),
        m.role === "member"
          ? Promise.resolve({ count: 0 })
          : admin.from("payments").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).neq("status", "pago").lt("vencimento", today),
      ]);
      const linhas = [
        reunioes.count ? `${reunioes.count} reuniões` : null,
        publica.count ? `${publica.count} posts para publicar` : null,
        aprov.count ? `${aprov.count} posts esperando o cliente` : null,
        tarefas.count ? `${tarefas.count} tarefas para hoje` : null,
        atrasadas.count ? `${atrasadas.count} cobranças atrasadas` : null,
      ].filter(Boolean);
      if (linhas.length) blocos.push(`${ws.nome}: ${linhas.join(", ")}.\nAbrir: ${publicEnv.NEXT_PUBLIC_APP_URL}/w/${ws.slug}`);
    }
    if (!blocos.length || !p.email) continue;
    const r = await emailAdapter().send({
      to: p.email,
      subject: `Em pauta hoje, ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date())}`,
      text: `Bom dia, ${(p.nome ?? "").split(" ")[0]}!\n\n${blocos.join("\n\n")}\n\n${brand.name}`,
    });
    if (r.ok) enviados++;
  }
  return NextResponse.json({ enviados });
}
