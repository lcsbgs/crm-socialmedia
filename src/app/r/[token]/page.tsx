import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { ReportSummary } from "@/features/reports/build";
import { ReportView } from "@/features/reports/components/report-view";
import { AutoPrint } from "@/features/sales/components/public-forms";
import { monthLabel } from "@/lib/dates";
import { optionalServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Relatório do mês", robots: { index: false } };

export default async function PublicReportPage({ params, searchParams }: PageProps<"/r/[token]">) {
  const [{ token }, q] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(token).success || !optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) notFound();
  const { data: r } = await createAdminClient()
    .from("reports")
    .select("competencia, resumo, leitura, client:clients!inner (nome, workspace:workspaces!inner (nome))")
    .eq("token", token)
    .eq("status", "publicado")
    .maybeSingle();
  if (!r) notFound();
  return (
    <main className="min-h-dvh bg-background px-4 py-10 print:bg-white print:py-0">
      <AutoPrint enabled={q.imprimir === "1"} />
      <article className="mx-auto flex max-w-3xl flex-col gap-5 rounded-card bg-surface p-7 print:p-0">
        <p className="text-sm font-semibold text-muted">{r.client.workspace.nome}</p>
        <h1 className="font-display text-3xl">
          {r.client.nome}, {monthLabel(r.competencia.slice(0, 7)).toLowerCase()}
        </h1>
        <ReportView resumo={r.resumo as unknown as ReportSummary} leitura={r.leitura} />
      </article>
    </main>
  );
}
