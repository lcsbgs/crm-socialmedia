import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { disconnectMeta, startIntegration } from "@/features/integrations/actions";
import { integrations } from "@/features/integrations/catalog";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Integrações" };

export default async function IntegrationsPage({ params, searchParams }: PageProps<"/w/[slug]/ajustes/integracoes">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  const supabase = await createClient();
  const [{ data: social }, { data: accounts }, { data: others }] = await Promise.all([
    supabase.from("social_connections").select("id, provider, status, conta_nome, simulated, expires_at").eq("workspace_id", workspace.id),
    supabase.from("social_accounts").select("id, plataforma, nome, client_id").eq("workspace_id", workspace.id),
    supabase.from("integration_connections").select("provider, status, conta, simulated").eq("workspace_id", workspace.id),
  ]);
  const mock = isMockMode();

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Integrações"
        description="Conecte as contas que o Pauta usa para publicar, marcar reuniões e cobrar."
        action={mock ? <DemoBadge /> : undefined}
      />
      {query.erro ? (
        <p role="alert" className="rounded-inner bg-late-tonal px-4 py-3 text-sm text-late-ink">
          Não foi possível concluir a conexão. Tente de novo.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((i) => {
          const metaConn = i.id === "meta" ? social?.find((s) => s.provider === "facebook") : i.id === "instagram" ? social?.find((s) => s.provider === "instagram") : null;
          const other = others?.find((o) => o.provider === i.id);
          const conn = metaConn ?? other;
          const canConnect = i.quem === "pessoa" || workspace.canManage;
          const contas = metaConn ? (accounts ?? []).filter((a) => i.id === "meta" || a.plataforma === "instagram") : [];
          return (
            <Card key={i.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl">{i.nome}</h2>
                  <p className="text-sm text-muted">{i.descricao}</p>
                </div>
                {conn ? (
                  <Badge tone={conn.status === "ativa" ? "success" : "danger"}>{conn.status === "ativa" ? "Conectado" : "Reconectar"}</Badge>
                ) : null}
              </div>
              {conn?.simulated ? <DemoBadge className="self-start" /> : null}
              {contas.length ? (
                <p className="text-sm text-ink-2">
                  {contas.length} contas encontradas: {contas.slice(0, 3).map((a) => a.nome).join(", ")}
                  {contas.length > 3 ? "..." : ""}. Ligue cada uma ao cliente na página dele, em Arquivos.
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2">
                {canConnect ? (
                  <form action={startIntegration}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <button type="submit" className={buttonClasses(conn ? "outline" : "primary", "sm")}>
                      {conn ? "Reconectar" : "Conectar"}
                    </button>
                  </form>
                ) : (
                  <span className="text-sm text-muted">Só owner e admin conectam.</span>
                )}
                {metaConn && workspace.canManage ? (
                  <form action={disconnectMeta}>
                    <input type="hidden" name="connectionId" value={metaConn.id} />
                    <button type="submit" className={buttonClasses("ghost", "sm")}>
                      Desconectar
                    </button>
                  </form>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
