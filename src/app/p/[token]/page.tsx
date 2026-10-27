import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { brand } from "@/config/brand";
import { PortalItemCard } from "@/features/portal/components/portal-item";
import { getPortal } from "@/features/portal/queries";

export const metadata: Metadata = {
  title: "Aprovação de conteúdo",
  robots: { index: false, follow: false },
};

export default async function PortalPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) notFound();
  const portal = await getPortal(token);
  if (!portal) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm text-muted">{portal.workspaceNome}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Conteúdos para aprovar · {portal.clientNome}
        </h1>
        <p className="text-sm text-muted">
          Veja cada conteúdo e responda com Aprovar ou Pedir ajuste. Não precisa criar conta.
        </p>
      </header>

      {portal.items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm">
          Nada aguardando sua aprovação agora. Avisaremos quando tiver novidade.
        </p>
      ) : (
        <div className="space-y-4">
          {portal.items.map((item) => (
            <PortalItemCard key={item.id} token={token} item={item} />
          ))}
        </div>
      )}

      <footer className="pt-6 text-center text-xs text-muted">Enviado com {brand.name}</footer>
    </main>
  );
}
