import { CheckCircle2, Wrench } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { brand } from "@/config/brand";
import { PortalItemCard } from "@/features/portal/components/portal-item";
import { getPortal } from "@/features/portal/queries";
import { formatRelativeTime, plural } from "@/lib/format";

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
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4">
          {portal.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
            <img
              src={portal.logoUrl}
              alt={portal.workspaceNome}
              className="h-8 w-auto max-w-32 object-contain"
            />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-surface">
              {portal.workspaceNome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate font-semibold">{portal.workspaceNome}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <div className="space-y-1">
          <h1 className="font-display text-xl">Olá, {portal.clientNome}</h1>
          <p className="text-sm text-muted">
            {portal.items.length
              ? `${plural(portal.items.length, "conteúdo esperando", "conteúdos esperando")} sua aprovação. Veja cada um e responda com Aprovar ou Pedir ajuste. Não precisa criar conta.`
              : "Nada esperando sua aprovação agora. Avisaremos quando tiver novidade."}
          </p>
        </div>

        {portal.items.length ? (
          <div className="space-y-4">
            {portal.items.map((item) => (
              <PortalItemCard key={item.id} token={token} item={item} />
            ))}
          </div>
        ) : null}

        {portal.history.length ? (
          <section aria-labelledby="historico" className="space-y-2">
            <h2 id="historico" className="text-sm font-semibold">
              Suas respostas recentes
            </h2>
            <ul className="divide-y divide-border rounded-card bg-surface">
              {portal.history.map((h) => (
                <li key={h.id} className="flex gap-2.5 px-3 py-2.5 text-sm">
                  {h.decisao === "aprovado" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Aprovado" />
                  ) : (
                    <Wrench className="mt-0.5 size-4 shrink-0 text-waiting" aria-label="Ajuste pedido" />
                  )}
                  <div className="min-w-0">
                    <p>
                      <span className="font-medium">{h.titulo}</span>
                      <span className="text-muted">
                        {" "}
                        · {h.decisao === "aprovado" ? "aprovado" : "ajuste pedido"} por {h.autor_nome},{" "}
                        {formatRelativeTime(h.created_at)}
                      </span>
                    </p>
                    {h.comentario ? <p className="text-muted">“{h.comentario}”</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer className="py-6 text-center text-xs text-muted">Enviado com {brand.name}</footer>
    </div>
  );
}
