import { CheckCircle2, Wrench } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { brand } from "@/config/brand";
import { PortalPlan } from "@/features/portal/components/portal-plan";
import { PortalReview } from "@/features/portal/components/portal-review";
import { monthLabel } from "@/lib/dates";
import { getPortal } from "@/features/portal/queries";
import { formatRelativeTime } from "@/lib/format";

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
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[480px] items-center gap-3 px-4">
          {portal.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
            <img src={portal.logoUrl} alt={portal.workspaceNome} className="h-9 w-auto max-w-32 object-contain" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-today font-bold text-today-ink">
              {portal.workspaceNome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate font-bold">{portal.workspaceNome}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[480px] flex-1 space-y-6 px-4 pb-6">
        {portal.items.length ? (
          <PortalReview
            token={token}
            items={portal.items}
            clientNome={portal.clientNome}
            clientCor={portal.clientCor}
            handle={portal.handle}
            contatoNome={portal.contatoNome}
          />
        ) : (
          <div className="space-y-1 pt-2">
            <h1 className="font-display text-[28px] leading-tight">
              {portal.contatoNome ? `Oi, ${portal.contatoNome}!` : "Oi!"} Nada esperando seu ok agora.
            </h1>
            <p className="text-md text-ink-2">Quando tiver post novo, a gente avisa pelo WhatsApp.</p>
          </div>
        )}

        {portal.plan ? (
          <PortalPlan token={token} plan={portal.plan} monthName={monthLabel(portal.plan.competencia.slice(0, 7)).split(" ")[0].toLowerCase()} />
        ) : null}

        {portal.reports.length ? (
          <section aria-labelledby="h-rel" className="space-y-2">
            <h2 id="h-rel" className="font-display text-lg">
              Relatórios
            </h2>
            <ul className="flex flex-wrap gap-2">
              {portal.reports.map((r) => (
                <li key={r.token}>
                  <a href={`/r/${r.token}`} className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-base font-semibold">
                    {monthLabel(r.competencia.slice(0, 7))}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {portal.history.length ? (
          <section aria-labelledby="historico" className="space-y-2">
            <h2 id="historico" className="font-display text-lg">
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
