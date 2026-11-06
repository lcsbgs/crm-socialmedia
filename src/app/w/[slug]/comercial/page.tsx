import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Comercial" };

export default async function Page({ params }: PageProps<"/w/[slug]/comercial">) {
  await params;
  return (
    <div className="space-y-5">
      <PageHeader title="Comercial" description="Funil de leads, propostas e contratos." />
      <EmptyState title="Nada por aqui ainda" description="Este módulo entra nas próximas fases." />
    </div>
  );
}
