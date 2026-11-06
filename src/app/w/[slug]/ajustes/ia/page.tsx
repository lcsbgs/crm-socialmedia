import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "IA e ChatGPT" };

export default async function Page({ params }: PageProps<"/w/[slug]/ajustes/ia">) {
  await params;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="IA e ChatGPT" description="Escolha entre o seu plano do ChatGPT e os créditos do Pauta." />
      <EmptyState title="Ainda não configurado" description="Esta área ganha conteúdo nas próximas fases." />
    </div>
  );
}
