import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Minha conta" };

export default async function Page({ params }: PageProps<"/w/[slug]/ajustes/conta">) {
  await params;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Minha conta" description="Seu nome, e-mail e forma de entrar." />
      <EmptyState title="Ainda não configurado" description="Esta área ganha conteúdo nas próximas fases." />
    </div>
  );
}
