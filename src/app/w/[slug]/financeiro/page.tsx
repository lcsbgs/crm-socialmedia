import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ClientTag } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { contactSchema } from "@/features/clients/schemas";
import { readFinanceConfig } from "@/features/finance/billing-actions";
import { AutoBillingForm, FinanceButton, NewChargeButton, NewExpenseButton } from "@/features/finance/components/finance-ui";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { daysOverdue, formatBRL, formatDate, formatRelativeTime, plural, todayISO } from "@/lib/format";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";
import { firstName, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Financeiro" };

const categoriaLabel: Record<string, string> = {
  freelancer: "Freelancer",
  ferramentas: "Ferramentas",
  impostos: "Impostos",
  anuncios: "Anúncios",
  equipe: "Equipe",
  outros: "Outros",
};

export default async function FinancePage({ params, searchParams }: PageProps<"/w/[slug]/financeiro">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspaceBySlug(slug);
  // Financeiro é só para owner e admin (o banco também barra pelo RLS).
  if (!workspace.canManage) notFound();
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const mes = typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes) ? query.mes : thisMonth;
  const aba = typeof query.aba === "string" ? query.aba : "recebimentos";
  const start = `${mes}-01`;
  const end = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).toISOString().slice(0, 10);
  const base = `/w/${slug}/financeiro`;

  const supabase = await createClient();
  const [{ data: ws }, { data: payments }, { data: expenses }, { data: scope }, { data: clients }, { data: closings }, { data: asaas }] = await Promise.all([
    supabase.from("workspaces").select("finance_config").eq("id", workspace.id).single(),
    supabase
      .from("payments")
      .select("*, client:clients!inner (id, nome, cor, contatos)")
      .eq("workspace_id", workspace.id)
      .or(`competencia.eq.${start},and(status.neq.pago,vencimento.lt.${start})`)
      .order("vencimento"),
    supabase.from("expenses").select("*, client:clients (nome)").eq("workspace_id", workspace.id).gte("data", start).lte("data", end).order("data", { ascending: false }),
    supabase.from("scope_requests").select("id, descricao, valor_sugerido, client:clients!inner (nome)").eq("workspace_id", workspace.id).eq("status", "pendente").not("valor_sugerido", "is", null),
    supabase.from("clients").select("id, nome, cor, valor_mensal, status").eq("workspace_id", workspace.id).neq("status", "encerrado").order("nome"),
    supabase.from("accounting_closings").select("competencia, enviado_em, enviado_para, simulated").eq("workspace_id", workspace.id).order("competencia", { ascending: false }).limit(3),
    supabase.from("integration_connections").select("simulated").eq("workspace_id", workspace.id).eq("provider", "asaas").maybeSingle(),
  ]);
  const cfg = await readFinanceConfig(ws?.finance_config);
  const pays = payments ?? [];
  const doMes = pays.filter((p) => p.competencia === start);
  const sum = (l: { valor: number }[]) => l.reduce((s, p) => s + Number(p.valor), 0);
  const recebido = doMes.filter((p) => p.status === "pago");
  const aReceber = pays.filter((p) => p.status !== "pago" && p.vencimento >= today);
  const atrasadas = pays.filter((p) => p.status !== "pago" && p.vencimento < today);
  const venceHoje = aReceber.filter((p) => p.vencimento === today).length;
  const despesas = sum(expenses ?? []);
  const mock = isMockMode();

  const kpi = (label: string, value: string, hint: string, tone?: "late") => (
    <div className="flex flex-col gap-1 rounded-card bg-surface p-[22px]">
      <span className="text-sm text-muted">{label}</span>
      <span className={`tabular font-display text-3xl ${tone === "late" ? "text-late" : ""}`}>{value}</span>
      <span className="text-sm text-muted">{hint}</span>
    </div>
  );

  const cobrancaTexto = (p: (typeof pays)[number]) => {
    if (p.status === "pago") return `Pago ${p.pago_em ? formatDate(p.pago_em) : ""}${p.metodo ? `, ${p.metodo}` : ""}`;
    if (p.vencimento < today) return `Atrasada ${plural(daysOverdue(p.vencimento), "dia", "dias")}${p.boleto_url ? ", boleto gerado" : ""}`;
    if (p.boleto_url) return `Boleto e Pix gerados${p.cobranca_gerada_em ? ` em ${formatDate(p.cobranca_gerada_em.slice(0, 10))}` : ""}`;
    return p.provider === "asaas" ? "Boleto ainda não gerado" : "Cobrança manual";
  };
  const notaTexto = (p: (typeof pays)[number]) =>
    p.nfse_status === "emitida" ? `NFS-e ${p.nfse_numero ?? ""} emitida` : p.nfse_status === "erro" ? "Erro na emissão" : p.nfse_status === "pendente" ? "Emitindo" : p.status === "pago" ? "Não emitida" : "Emite ao pagar";

  // Rentabilidade por cliente no mês: recebido menos custos diretos.
  const rent = (clients ?? []).map((c) => {
    const rec = sum(recebido.filter((p) => p.client.id === c.id));
    const custo = sum((expenses ?? []).filter((e) => e.client_id === c.id));
    return { ...c, rec, custo, margem: rec - custo };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">Financeiro</h1>
        <div className="flex items-center gap-1">
          <Link href={`${base}?mes=${shiftMonth(mes, -1)}&aba=${aba}`} aria-label="Mês anterior" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-surface">
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <span className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-base font-semibold">{monthLabel(mes)}</span>
          <Link href={`${base}?mes=${shiftMonth(mes, 1)}&aba=${aba}`} aria-label="Próximo mês" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-surface">
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <NewExpenseButton workspaceId={workspace.id} clients={clients ?? []} />
          <NewChargeButton workspaceId={workspace.id} clients={clients ?? []} />
        </div>
      </div>

      <Tabs
        label="Seções do financeiro"
        value={aba}
        items={[
          { value: "recebimentos", label: "Recebimentos" },
          { value: "notas", label: "Notas fiscais" },
          { value: "despesas", label: "Despesas" },
          { value: "rentabilidade", label: "Rentabilidade" },
          { value: "contador", label: "Contador" },
        ].map((t) => ({ ...t, href: `${base}?mes=${mes}&aba=${t.value}` }))}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpi("Previsto no mês", formatBRL(sum(doMes)), plural(new Set(doMes.map((p) => p.client.id)).size, "cliente", "clientes"))}
        {kpi("Recebido", formatBRL(sum(recebido)), plural(recebido.length, "pagamento", "pagamentos"))}
        {kpi("A receber", formatBRL(sum(aReceber)), venceHoje ? `${venceHoje} vence hoje` : "em dia")}
        {kpi("Em atraso", formatBRL(sum(atrasadas)), atrasadas[0] ? `${atrasadas[0].client.nome}, ${plural(daysOverdue(atrasadas[0].vencimento), "dia", "dias")}` : "nenhum", atrasadas.length ? "late" : undefined)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {aba === "recebimentos" ? (
            <Card aria-labelledby="h-cob">
              <CardHeader id="h-cob" title={`Cobranças de ${monthLabel(mes).split(" ")[0].toLowerCase()}`} />
              {pays.length === 0 ? (
                <EmptyState compact title="Nenhuma cobrança neste mês" description="Cobranças mensais saem do valor de cada cliente quando o mês é planejado." />
              ) : (
                <div className="-mx-[22px] overflow-x-auto px-[22px]">
                  <table className="w-full min-w-[760px] text-left text-base">
                    <thead>
                      <tr className="text-sm text-muted">
                        <th scope="col" className="pb-3 font-semibold">Cliente</th>
                        <th scope="col" className="pb-3 font-semibold">Valor</th>
                        <th scope="col" className="pb-3 font-semibold">Vence</th>
                        <th scope="col" className="pb-3 font-semibold">Cobrança</th>
                        <th scope="col" className="pb-3 font-semibold">Nota fiscal</th>
                        <th scope="col" className="pb-3 text-right font-semibold">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pays.map((p) => {
                        const late = p.status !== "pago" && p.vencimento < today;
                        const contato = z.array(contactSchema).catch([]).parse(p.client.contatos)[0];
                        const nome = contato?.nome ? firstName(contato.nome) : "";
                        const msg = late
                          ? `${nome ? `Oi, ${nome}!` : "Oi!"} Tudo bem? A cobrança de ${formatBRL(p.valor)} venceu em ${formatDate(p.vencimento)} e ainda não identifiquei o pagamento.${p.pix_code ? ` Pix copia e cola: ${p.pix_code}` : ""}${p.boleto_url && !p.boleto_url.startsWith("/") ? ` Boleto: ${p.boleto_url}` : ""}`
                          : `${nome ? `Oi, ${nome}!` : "Oi!"} Segue a cobrança de ${formatBRL(p.valor)}, com vencimento em ${formatDate(p.vencimento)}.${p.pix_code ? ` Pix copia e cola: ${p.pix_code}` : ""}`;
                        return (
                          <tr key={p.id}>
                            <td className="py-3 pr-3">
                              <ClientTag name={p.client.nome} color={p.client.cor ?? 0} />
                              {p.origem !== "mensalidade" ? <span className="mt-1 block text-xs text-muted">{p.descricao}</span> : null}
                            </td>
                            <td className="tabular py-3 pr-3 font-semibold">{formatBRL(p.valor)}</td>
                            <td className="tabular py-3 pr-3">{p.vencimento === today ? "Hoje" : formatDate(p.vencimento)}</td>
                            <td className="py-3 pr-3">
                              <Badge tone={p.status === "pago" ? "success" : late ? "danger" : "neutral"}>{cobrancaTexto(p)}</Badge>
                              {p.simulated ? <DemoBadge className="mt-1" /> : null}
                            </td>
                            <td className="py-3 pr-3">
                              <span className={p.nfse_status === "erro" ? "font-semibold text-late" : "text-ink-2"}>{notaTexto(p)}</span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="inline-flex flex-wrap justify-end gap-1.5">
                                {p.status !== "pago" && cfg.provider === "asaas" && !p.provider_id ? (
                                  <FinanceButton act="boleto" workspaceId={workspace.id} id={p.id}>
                                    Gerar boleto
                                  </FinanceButton>
                                ) : null}
                                {p.status !== "pago" ? (
                                  <a href={whatsappLink(contato?.telefone, msg)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-sm font-semibold hover:bg-hover">
                                    {late ? "Cobrar no WhatsApp" : p.provider_id ? "Reenviar boleto" : "Mandar no WhatsApp"}
                                  </a>
                                ) : null}
                                {p.status !== "pago" ? (
                                  p.simulated && mock ? (
                                    <FinanceButton act="simular" workspaceId={workspace.id} id={p.id} variant="tonal">
                                      Simular pagamento
                                    </FinanceButton>
                                  ) : (
                                    <FinanceButton act="pagar" workspaceId={workspace.id} id={p.id} variant="tonal">
                                      Marcar paga
                                    </FinanceButton>
                                  )
                                ) : p.nfse_status === "erro" || (p.nfse_status === "nao_emitida" && p.provider_id) ? (
                                  <FinanceButton act="nota" workspaceId={workspace.id} id={p.id}>
                                    {p.nfse_status === "erro" ? "Corrigir e emitir" : "Emitir nota"}
                                  </FinanceButton>
                                ) : p.nfse_pdf_url ? (
                                  <a href={p.nfse_pdf_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-full border border-border px-3 text-sm font-semibold">
                                    Ver nota
                                  </a>
                                ) : null}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {(scope ?? []).length ? (
                <ul className="mt-4 flex flex-col gap-2 rounded-inner bg-today-tonal p-3.5 text-md text-today-ink">
                  {(scope ?? []).map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2">
                      <span className="flex-1">
                        <b>Escopo extra a cobrar:</b> {s.descricao}, {s.client.nome}, {formatBRL(s.valor_sugerido)}.
                      </span>
                      <FinanceButton act="escopo" workspaceId={workspace.id} id={s.id}>
                        Somar na próxima cobrança
                      </FinanceButton>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}

          {aba === "notas" ? (
            <Card>
              <CardHeader title="Notas fiscais" description="Emitidas pelo Asaas quando o cliente paga." />
              {recebido.length === 0 ? (
                <EmptyState compact title="Nenhum pagamento no mês" />
              ) : (
                <ul className="divide-y divide-border">
                  {recebido.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                      <ClientTag name={p.client.nome} color={p.client.cor ?? 0} />
                      <span className="tabular">{formatBRL(p.valor)}</span>
                      <span className={`flex-1 text-sm ${p.nfse_status === "erro" ? "text-late" : "text-ink-2"}`}>
                        {notaTexto(p)}
                        {p.nfse_erro ? `: ${p.nfse_erro}` : ""}
                      </span>
                      {p.nfse_xml_url ? (
                        <a href={p.nfse_xml_url} className="text-sm font-semibold underline" target="_blank" rel="noreferrer">
                          XML
                        </a>
                      ) : null}
                      {p.nfse_status !== "emitida" && p.nfse_status !== "pendente" ? (
                        <FinanceButton act="nota" workspaceId={workspace.id} id={p.id}>
                          {p.nfse_status === "erro" ? "Corrigir e emitir" : "Emitir nota"}
                        </FinanceButton>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {aba === "despesas" ? (
            <Card>
              <CardHeader title="Despesas do mês" count={(expenses ?? []).length} action={<NewExpenseButton workspaceId={workspace.id} clients={clients ?? []} label="Lançar" />} />
              {(expenses ?? []).length === 0 ? (
                <EmptyState compact title="Nenhuma despesa lançada" description="Freelancer, ferramentas e impostos entram aqui e no fechamento do contador." />
              ) : (
                <ul className="divide-y divide-border">
                  {(expenses ?? []).map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <b className="block">{e.descricao}</b>
                        <span className="text-sm text-muted">
                          {categoriaLabel[e.categoria]}, {formatDate(e.data)}
                          {e.client ? `, ${e.client.nome}` : ""}
                        </span>
                      </span>
                      <span className="tabular font-semibold">{formatBRL(e.valor)}</span>
                      <FinanceButton act="despesa-apagar" workspaceId={workspace.id} id={e.id} variant="ghost">
                        Apagar
                      </FinanceButton>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {aba === "rentabilidade" ? (
            <Card>
              <CardHeader title="Rentabilidade por cliente" description="Recebido no mês menos custos lançados para o cliente." />
              <ul className="divide-y divide-border">
                {rent.map((r) => (
                  <li key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-3 text-base">
                    <ClientTag name={r.nome} color={r.cor ?? 0} />
                    <span className="tabular text-ink-2">{formatBRL(r.rec)}</span>
                    <span className="tabular text-late-ink">{r.custo ? `- ${formatBRL(r.custo)}` : ""}</span>
                    <b className={`tabular ${r.margem < 0 ? "text-late" : ""}`}>{formatBRL(r.margem)}</b>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">Despesas gerais do estúdio (sem cliente) entram só no resultado do mês.</p>
            </Card>
          ) : null}

          {aba === "contador" ? (
            <Card>
              <CardHeader title="Fechamentos enviados" />
              {(closings ?? []).length ? (
                <ul className="flex flex-col gap-2 text-md">
                  {(closings ?? []).map((c) => (
                    <li key={c.competencia}>
                      {monthLabel(c.competencia.slice(0, 7))}: enviado {formatRelativeTime(c.enviado_em)} para {c.enviado_para}
                      {c.simulated ? " (simulado)" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-md text-muted">Nenhum fechamento ainda.</p>
              )}
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5">
          <Card aria-labelledby="h-auto">
            <CardHeader id="h-auto" title="Cobrança automática" action={asaas?.simulated ? <DemoBadge /> : undefined} />
            <AutoBillingForm workspaceId={workspace.id} config={cfg} asaasConnected={!!asaas} />
            <p className="mt-3 text-sm text-muted">A nota sai pelo seu cadastro na prefeitura, configurado no Asaas.</p>
          </Card>
          <Card aria-labelledby="h-contador">
            <CardHeader id="h-contador" title="Para o contador" />
            <p className="text-md text-ink-2">
              {closings?.[0] ? `${monthLabel(closings[0].competencia.slice(0, 7))} foi enviado ${formatRelativeTime(closings[0].enviado_em)} para ${closings[0].enviado_para}.` : "Nenhum mês enviado ainda."}
            </p>
            <ul className="my-3 list-disc pl-5 text-sm text-ink-2">
              <li>XML e PDF das notas emitidas</li>
              <li>Extrato de recebimentos por cliente</li>
              <li>Despesas do mês</li>
            </ul>
            <FinanceButton act="fechar" workspaceId={workspace.id} month={mes} variant="primary">
              Fechar {monthLabel(mes).split(" ")[0].toLowerCase()} e enviar
            </FinanceButton>
          </Card>
          <Card aria-labelledby="h-desp">
            <CardHeader id="h-desp" title="Despesas" />
            <p className="tabular font-display text-2xl">{formatBRL(despesas)}</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
              {Object.entries(
                (expenses ?? []).reduce<Record<string, number>>((acc, e) => ((acc[e.categoria] = (acc[e.categoria] ?? 0) + Number(e.valor)), acc), {}),
              ).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{categoriaLabel[k]}</span>
                  <span className="tabular">{formatBRL(v)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-border pt-3 text-md">
              <span>Resultado previsto do mês</span>
              <b className="tabular">{formatBRL(sum(doMes) - despesas)}</b>
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
