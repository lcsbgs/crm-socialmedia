import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientTag } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ReportSummary } from "@/features/reports/build";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { monthLabel } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Relatórios" };

export default async function ReportsPage({ params }: PageProps<"/w/[slug]/relatorios">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, competencia, status, resumo, client:clients!inner (id, nome, cor)")
    .eq("workspace_id", workspace.id)
    .order("competencia", { ascending: false })
    .limit(60);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Relatórios" description="Relatório mensal de cada cliente, com métricas e a leitura do mês." />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={BarChart3} title="Nenhum relatório ainda" description="Eles saem sozinhos no dia 1 de cada mês. Para gerar agora, abra o cliente e vá em Relatórios." />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {(data ?? []).map((r) => {
              const s = r.resumo as unknown as ReportSummary;
              return (
                <li key={r.id}>
                  <Link href={`/w/${slug}/clientes/${r.client.id}?aba=relatorios&mes=${r.competencia.slice(0, 7)}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-background">
                    <ClientTag name={r.client.nome} color={r.client.cor ?? 0} />
                    <span className="font-semibold">{monthLabel(r.competencia.slice(0, 7))}</span>
                    <span className="flex-1 text-sm text-muted">
                      {s.postsPublicados} posts, alcance {s.alcance.toLocaleString("pt-BR")}
                    </span>
                    <Badge tone={r.status === "publicado" ? "success" : "neutral"}>{r.status === "publicado" ? "publicado" : "rascunho"}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
