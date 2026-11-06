import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Integrações" };

export default async function Page({ params }: PageProps<"/w/[slug]/ajustes/integracoes">) {
  await params;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Integrações" description="Conecte Instagram, Facebook, Google, Canva, Granola e cobrança. Chega nas próximas fases." />
      <EmptyState title="Ainda não configurado" description="Esta área ganha conteúdo nas próximas fases." />
    </div>
  );
}
