import { Banknote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientAvatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodNav } from "@/features/deliverables/components/board-filters";
import { PaymentRow } from "@/features/finance/components/payment-row";
import { getMonthPayments, getOverduePayments } from "@/features/finance/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { daysOverdue, formatBRL, plural, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinancePage({ params, searchParams }: PageProps<"/w/[slug]/financeiro">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  const thisMonth = todayISO().slice(0, 7);
  const mes = typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes) ? query.mes : thisMonth;
  const competencia = `${mes}-01`;

  const supabase = await createClient();
  const [payments, overdue, { data: clients }] = await Promise.all([
    getMonthPayments(workspace.id, competencia),
    getOverduePayments(workspace.id),
    supabase
      .from("clients")
      .select("id, nome, cor, valor_mensal, status")
      .eq("workspace_id", workspace.id)
      .order("nome"),
  ]);

  const sum = (list: typeof payments) => list.reduce((acc, p) => acc + Number(p.valor), 0);
  const previsto = sum(payments);
  const recebido = sum(payments.filter((p) => p.status === "pago"));
  const atrasado = sum(payments.filter((p) => p.status === "atrasado"));
  const aberto = previsto - recebido;
  const pct = previsto ? Math.round((recebido / previsto) * 100) : 0;

  // Inadimplentes: total em atraso por cliente (todos os meses).
  const byClient = new Map<string, { nome: string; total: number; count: number; oldest: string }>();
  for (const p of overdue) {
    const c = byClient.get(p.client_id) ?? { nome: p.clienteNome, total: 0, count: 0, oldest: p.vencimento };
    c.total += Number(p.valor);
    c.count += 1;
    if (p.vencimento < c.oldest) c.oldest = p.vencimento;
    byClient.set(p.client_id, c);
  }
  const clientColor = new Map((clients ?? []).map((c) => [c.id, c.cor ?? 0]));
  const monthByClient = new Map(payments.map((p) => [p.client_id, p]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Mensalidades geradas pela rotina do mês. Para criar as do mês, use Gerar mês em Clientes."
      />

      <PeriodNav
        param="mes"
        prev={shiftMonth(mes, -1)}
        next={shiftMonth(mes, 1)}
        todayValue={thisMonth}
        label={monthLabel(mes)}
      />

      {/* Receita do mês */}
      <section aria-label="Receita do mês" className="rounded-lg border border-border bg-surface p-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Figure label="Previsto" value={formatBRL(previsto)} />
          <Figure label="Recebido" value={formatBRL(recebido)} />
          <Figure label="Em aberto" value={formatBRL(aberto)} />
          <Figure label="Atrasado" value={formatBRL(atrasado)} late={atrasado > 0} />
        </dl>
        <div
          role="meter"
          aria-label="Recebido do previsto"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-hover"
        >
          <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
        </div>
        <p className="tabular mt-1.5 text-xs text-muted">{pct}% do previsto recebido</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Cobranças do mês"
            description={payments.length ? plural(payments.length, "cobrança", "cobranças") : undefined}
          />
          {payments.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Nenhuma cobrança neste mês"
              description="Gere o mês em Clientes para criar as mensalidades."
            />
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

        <div className="space-y-5">
          <Card>
            <CardHeader title="Inadimplentes" description="Vencidas e não pagas, de qualquer mês." />
            {byClient.size === 0 ? (
              <p className="text-sm text-muted">Ninguém em atraso.</p>
            ) : (
              <ul className="divide-y divide-border">
                {[...byClient.entries()].map(([clientId, c]) => (
                  <li key={clientId}>
                    <Link
                      href={`/w/${slug}/clientes/${clientId}?aba=financeiro`}
                      className="flex items-center gap-2.5 py-2 text-sm hover:bg-hover"
                    >
                      <ClientAvatar name={c.nome} color={clientColor.get(clientId) ?? 0} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.nome}</span>
                        <span className="block text-xs text-muted">
                          {plural(c.count, "cobrança", "cobranças")}, a mais antiga com{" "}
                          {plural(daysOverdue(c.oldest), "dia", "dias")} de atraso
                        </span>
                      </span>
                      <span className="tabular font-medium text-late">{formatBRL(c.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Por cliente" description={`Situação de ${monthLabel(mes).toLowerCase()}`} />
            <ul className="divide-y divide-border">
              {(clients ?? [])
                .filter((c) => c.status !== "encerrado")
                .map((c) => {
                  const p = monthByClient.get(c.id);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/w/${slug}/clientes/${c.id}?aba=financeiro`}
                        className="flex items-center gap-2.5 py-2 text-sm hover:bg-hover"
                      >
                        <ClientAvatar name={c.nome} color={c.cor ?? 0} />
                        <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                        <span
                          className={cn(
                            "text-xs",
                            !p
                              ? "text-muted"
                              : p.status === "pago"
                                ? "text-ok"
                                : p.status === "atrasado"
                                  ? "text-late"
                                  : "text-muted",
                          )}
                        >
                          {!p
                            ? c.status === "pausado"
                              ? "pausado"
                              : "sem cobrança"
                            : p.status === "pago"
                              ? "pago"
                              : p.status === "atrasado"
                                ? "atrasado"
                                : "em aberto"}
                        </span>
                        <span className="tabular w-24 text-right">
                          {p ? formatBRL(p.valor) : c.valor_mensal ? formatBRL(c.valor_mensal) : "-"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value, late }: { label: string; value: string; late?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("tabular text-lg font-semibold", late && "text-late")}>{value}</dd>
    </div>
  );
}
