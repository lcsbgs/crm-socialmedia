import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Relatórios" };

export default async function Page({ params }: PageProps<"/w/[slug]/relatorios">) {
  await params;
  return (
    <div className="space-y-5">
      <PageHeader title="Relatórios" description="Relatório mensal de cada cliente, com métricas e leitura da IA." />
      <EmptyState title="Nada por aqui ainda" description="Este módulo entra nas próximas fases." />
    </div>
  );
}
