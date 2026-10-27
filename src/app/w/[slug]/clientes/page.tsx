import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { ClientAvatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { GenerateMonthForm } from "@/features/clients/components/generate-month-form";
import { ClientStatusBadge } from "@/features/clients/components/status-badge";
import { getClients } from "@/features/clients/queries";
import { getWorkspaceBySlug, getWorkspaceUsage } from "@/features/workspaces/queries";
import { currentMonthISO, formatBRL, formatDate, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ params }: PageProps<"/w/[slug]/clientes">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const [clients, usage] = await Promise.all([getClients(workspace.id), getWorkspaceUsage(workspace.id)]);
  const atLimit = !!usage && usage.max_clients !== null && usage.clients >= usage.max_clients;
  const base = `/w/${slug}/clientes`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={
          usage?.max_clients
            ? `${usage.clients} de ${usage.max_clients} clientes ativos no seu plano.`
            : `${plural(clients.length, "cliente", "clientes")}.`
        }
        action={
          atLimit ? null : (
            <Link href={`${base}/novo`} className={buttonClasses()}>
              Novo cliente
            </Link>
          )
        }
      />

      {atLimit ? (
        <Alert>
          Você atingiu o limite de clientes do seu plano. Encerre um cliente ou{" "}
          <Link href={`/w/${slug}/configuracoes`} className="font-medium underline">
            veja as opções de upgrade
          </Link>
          .
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Rotina do mês"
          description="Planeja as entregas do pacote de cada cliente ativo, com datas sugeridas no mês, e cria as cobranças. Pode rodar mais de uma vez sem duplicar."
        />
        <GenerateMonthForm workspaceId={workspace.id} defaultMonth={currentMonthISO().slice(0, 7)} />
      </Card>

      {clients.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nenhum cliente ainda. Cadastre o primeiro para começar.</p>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`${base}/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover">
                <ClientAvatar name={c.nome} color={c.cor ?? 0} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{c.nome}</span>
                    <ClientStatusBadge status={c.status} />
                  </p>
                  <p className="text-sm text-muted">
                    {[c.segmento, c.package?.nome, c.valor_mensal ? `${formatBRL(c.valor_mensal)}/mês` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="tabular shrink-0 text-right text-sm">
                  {c.proximoVencimento ? (
                    <>
                      <p className={cn(c.proximoVencimento.atrasado ? "text-late" : "text-muted")}>
                        {c.proximoVencimento.atrasado ? "Atrasado desde " : "Vence "}
                        {formatDate(c.proximoVencimento.vencimento)}
                      </p>
                      <p className="text-muted">{formatBRL(c.proximoVencimento.valor)}</p>
                    </>
                  ) : (
                    <p className="text-muted">Em dia</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
