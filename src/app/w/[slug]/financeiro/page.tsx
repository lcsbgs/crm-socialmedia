import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PaymentRow } from "@/features/finance/components/payment-row";
import { getMonthPayments, getOverduePayments } from "@/features/finance/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { currentMonthISO, formatBRL, formatMonth, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Financeiro" };

function shiftMonth(competencia: string, delta: number) {
  const d = new Date(`${competencia}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export default async function FinancePage({ params, searchParams }: PageProps<"/w/[slug]/financeiro">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  const mes =
    typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes)
      ? query.mes
      : currentMonthISO().slice(0, 7);
  const competencia = `${mes}-01`;

  const [payments, overdue] = await Promise.all([
    getMonthPayments(workspace.id, competencia),
    getOverduePayments(workspace.id),
  ]);

  const sum = (list: typeof payments) => list.reduce((acc, p) => acc + Number(p.valor), 0);
  const previsto = sum(payments);
  const recebido = sum(payments.filter((p) => p.status === "pago"));
  const atrasado = sum(payments.filter((p) => p.status === "atrasado"));
  const aberto = previsto - recebido;

  // Inadimplentes: total em atraso por cliente (todos os meses).
  const byClient = new Map<string, { nome: string; total: number; count: number }>();
  for (const p of overdue) {
    const c = byClient.get(p.client_id) ?? { nome: p.clienteNome, total: 0, count: 0 };
    c.total += Number(p.valor);
    c.count += 1;
    byClient.set(p.client_id, c);
  }
  const base = `/w/${slug}/financeiro`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Cobranças geradas pela rotina do mês. Para criar as do mês, use Gerar mês em Clientes."
      />

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`${base}?mes=${shiftMonth(competencia, -1)}`}
          className={buttonClasses("secondary", "sm")}
        >
          Mês anterior
        </Link>
        <h2 className="font-semibold">{formatMonth(competencia)}</h2>
        <Link href={`${base}?mes=${shiftMonth(competencia, 1)}`} className={buttonClasses("secondary", "sm")}>
          Próximo mês
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Previsto" value={formatBRL(previsto)} />
        <Stat label="Recebido" value={formatBRL(recebido)} />
        <Stat label="Em aberto" value={formatBRL(aberto)} />
        <Stat label="Atrasado" value={formatBRL(atrasado)} danger={atrasado > 0} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Cobranças do mês" />
          {payments.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma cobrança neste mês.</p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  workspaceId={workspace.id}
                  payment={p}
                  clientHref={`/w/${slug}/clientes/${p.client_id}?aba=financeiro`}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Inadimplentes" description="Cobranças vencidas e não pagas, de qualquer mês." />
          {byClient.size === 0 ? (
            <p className="text-sm text-muted">Ninguém em atraso.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...byClient.entries()].map(([clientId, c]) => (
                <li key={clientId} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/w/${slug}/clientes/${clientId}?aba=financeiro`} className="hover:underline">
                    {c.nome}
                    <span className="block text-xs text-muted">
                      {plural(c.count, "cobrança", "cobranças")}
                    </span>
                  </Link>
                  <span className="font-medium text-danger">{formatBRL(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={danger ? "mt-1 text-lg font-semibold text-danger" : "mt-1 text-lg font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
