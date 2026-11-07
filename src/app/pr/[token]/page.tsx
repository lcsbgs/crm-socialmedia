import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { describeItems } from "@/features/packages/schemas";
import { AcceptProposalForm, AutoPrint } from "@/features/sales/components/public-forms";
import { optionalServerEnv } from "@/lib/env.server";
import { formatBRL, formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Proposta", robots: { index: false } };

// Proposta pública: registra a visualização e permite o aceite. Serve também para imprimir em PDF.
export default async function PublicProposalPage({ params, searchParams }: PageProps<"/pr/[token]">) {
  const [{ token }, q] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(token).success || !optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) notFound();
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("proposals")
    .select("*, lead:leads!inner (nome, contato_nome), package:package_templates (nome)")
    .eq("token", token)
    .in("status", ["enviada", "aceita"])
    .maybeSingle();
  if (!p) notFound();
  const { data: ws } = await admin.from("workspaces").select("nome").eq("id", p.workspace_id).single();
  const imprimir = q.imprimir === "1";
  if (!imprimir) {
    const h = await headers();
    await admin.rpc("register_proposal_view", {
      p_token: token,
      p_ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim(),
      p_user_agent: h.get("user-agent") ?? "",
    });
  }
  const vencida = p.validade && p.validade < new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-dvh bg-background px-4 py-10 print:bg-white print:py-0">
      <AutoPrint enabled={imprimir} />
      <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card bg-surface p-7 print:p-0">
        <p className="text-sm font-semibold text-muted">{ws?.nome}</p>
        <h1 className="font-display text-3xl">{p.titulo}</h1>
        <p className="text-md text-ink-2">Para {p.lead.contato_nome ? `${p.lead.contato_nome}, ` : ""}{p.lead.nome}</p>
        {p.diagnostico ? (
          <section>
            <h2 className="mb-2 font-display text-xl">Diagnóstico</h2>
            <p className="text-md whitespace-pre-wrap">{p.diagnostico}</p>
          </section>
        ) : null}
        <section>
          <h2 className="mb-2 font-display text-xl">O que está incluído</h2>
          <p className="text-md">
            {p.package?.nome ? <b>{p.package.nome}: </b> : null}
            {describeItems(p.itens) || "Conforme combinado."}
          </p>
          <ul className="mt-2 list-disc pl-5 text-md text-ink-2">
            <li>Aprovação de cada post pelo celular, sem login</li>
            <li>Publicação agendada no Instagram e no Facebook</li>
            <li>Relatório mensal com a leitura do mês</li>
          </ul>
        </section>
        <section className="grid gap-3 rounded-inner bg-background p-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Investimento</p>
            <p className="tabular font-display text-2xl">{formatBRL(p.valor_mensal)}/mês</p>
          </div>
          <div>
            <p className="text-sm text-muted">Duração</p>
            <p className="font-display text-2xl">{p.duracao_meses} meses</p>
          </div>
          <div>
            <p className="text-sm text-muted">Vencimento</p>
            <p className="font-display text-2xl">dia {p.dia_vencimento}</p>
          </div>
        </section>
        {p.observacoes ? <p className="text-md whitespace-pre-wrap text-ink-2">{p.observacoes}</p> : null}
        {p.validade ? <p className="text-sm text-muted">Válida até {formatDate(p.validade, "long")}.</p> : null}
        <div className="print:hidden">
          {p.status === "aceita" ? (
            <Badge tone="success">Aceita por {p.aceite_nome}</Badge>
          ) : vencida ? (
            <p className="text-md text-late-ink">Esta proposta venceu. Peça uma atualizada.</p>
          ) : (
            <AcceptProposalForm token={token} />
          )}
        </div>
      </article>
    </main>
  );
}
