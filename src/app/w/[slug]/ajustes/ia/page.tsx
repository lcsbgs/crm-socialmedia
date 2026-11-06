import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/checkbox";
import { DemoBadge } from "@/components/ui/demo-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { connectChatgpt, disconnectChatgpt, setWorkspaceAiMode, simulateChatgptLimit } from "@/features/ai/actions";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "IA e ChatGPT" };

const statusText: Record<string, string> = {
  ativa: "Conectado",
  limite: "Limite da semana acabou",
  inelegivel: "Conta não elegível",
  revogada: "Desconectado",
};

export default async function AiSettingsPage({ params }: PageProps<"/w/[slug]/ajustes/ia">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const supabase = await createClient();
  const [{ data: ws }, { data: conn }, { data: credits }, { data: usage }] = await Promise.all([
    supabase.from("workspaces").select("ai_mode").eq("id", workspace.id).single(),
    supabase.from("ai_connections").select("status, conta, simulated, created_at").eq("provider", "chatgpt").maybeSingle(),
    supabase.rpc("ai_credits_status", { p_workspace_id: workspace.id }).maybeSingle(),
    supabase
      .from("ai_usage")
      .select("tarefa, provider, creditos, fallback, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const mock = isMockMode();
  const back = `/w/${slug}/ajustes/ia`;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="IA e ChatGPT" description="Quem conecta o próprio ChatGPT usa o plano dele. Quem não conecta usa os créditos do estúdio." />

      <Card>
        <CardHeader title="Créditos do estúdio neste mês" />
        {credits ? (
          <div className="space-y-2">
            <p className="text-md">
              <b className="tabular">{credits.usados}</b> de <span className="tabular">{credits.limite}</span> usados
            </p>
            <ProgressBar value={credits.usados} max={credits.limite} label="Créditos de IA usados" tone={credits.usados / credits.limite > 0.85 ? "late" : "accent"} />
            <p className="text-sm text-muted">Legenda gasta 3 créditos; encurtar, mudar tom e chamada, 1; rascunho de estratégia, 5.</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Seu ChatGPT"
          description="Conexão pessoal: vale para você em todos os espaços."
          action={mock ? <DemoBadge /> : undefined}
        />
        {conn ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={conn.status === "ativa" ? "success" : "danger"}>{statusText[conn.status] ?? conn.status}</Badge>
              {conn.conta ? <span className="text-sm text-muted">{conn.conta}</span> : null}
            </div>
            {conn.status !== "ativa" ? (
              <p className="text-sm text-ink-2">Enquanto isso, o Pauta usa os créditos do estúdio e avisa antes de cada uso.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <a href="https://chatgpt.com/#settings" target="_blank" rel="noreferrer" className={buttonClasses("outline", "sm")}>
                Gerenciar uso no ChatGPT
              </a>
              <form action={disconnectChatgpt}>
                <button type="submit" className={buttonClasses("ghost", "sm")}>
                  Desconectar
                </button>
              </form>
              {mock ? (
                <form action={simulateChatgptLimit}>
                  <input type="hidden" name="status" value={conn.status === "limite" ? "ativa" : "limite"} />
                  <button type="submit" className={buttonClasses("ghost", "sm")}>
                    {conn.status === "limite" ? "Simular limite renovado" : "Simular fim do limite semanal"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <form action={connectChatgpt} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="back" value={back} />
            <button type="submit" className={buttonClasses("chatgpt", "md")}>
              Conectar com ChatGPT
            </button>
            <span className="text-sm text-muted">Para assinantes Plus e Pro.</span>
          </form>
        )}
      </Card>

      {workspace.canManage ? (
        <Card>
          <CardHeader title="Padrão do estúdio" />
          <form action={setWorkspaceAiMode} className="flex flex-col gap-2.5">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <RadioCard name="ai_mode" value="chatgpt" defaultChecked={ws?.ai_mode === "chatgpt"} title="Usar o ChatGPT de cada pessoa" description="Quem não conectou usa os créditos." />
            <RadioCard name="ai_mode" value="creditos" defaultChecked={ws?.ai_mode !== "chatgpt"} title="Usar só os créditos do Pauta" />
            <button type="submit" className={buttonClasses("primary", "sm") + " self-end"}>
              Salvar
            </button>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Últimos usos" />
        {usage?.length ? (
          <ul className="divide-y divide-border">
            {usage.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-2 text-base">
                <span>
                  {u.tarefa}
                  {u.fallback ? <span className="text-sm text-late-ink"> (caiu para créditos)</span> : null}
                </span>
                <span className="text-sm text-muted">
                  {u.provider === "chatgpt" ? "ChatGPT" : u.provider === "anthropic" ? "Créditos" : "Demonstração"}
                  {u.creditos ? `, ${u.creditos} créditos` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum uso ainda.</p>
        )}
      </Card>
    </div>
  );
}
