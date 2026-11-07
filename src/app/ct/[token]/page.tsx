import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { buttonClasses } from "@/components/ui/button";
import { AutoPrint, SignContractForm } from "@/features/sales/components/public-forms";
import { optionalServerEnv } from "@/lib/env.server";
import { formatRelativeTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Contrato", robots: { index: false } };

// Contrato público: assinatura simples (nome, data, IP) ou link do provedor.
export default async function PublicContractPage({ params, searchParams }: PageProps<"/ct/[token]">) {
  const [{ token }, q] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(token).success || !optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) notFound();
  const { data: c } = await createAdminClient()
    .from("contracts")
    .select("titulo, corpo, status, provider, provider_sign_url, assinado_em, assinante_nome")
    .eq("token", token)
    .in("status", ["enviado", "assinado"])
    .maybeSingle();
  if (!c) notFound();
  return (
    <main className="min-h-dvh bg-background px-4 py-10 print:bg-white print:py-0">
      <AutoPrint enabled={q.imprimir === "1"} />
      <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card bg-surface p-7 print:p-0">
        <h1 className="font-display text-2xl">{c.titulo}</h1>
        <pre className="font-sans text-md whitespace-pre-wrap">{c.corpo}</pre>
        <div className="print:hidden">
          {c.status === "assinado" ? (
            <p className="rounded-inner bg-ok-tonal p-4 text-md text-ok-ink">
              Assinado por <b>{c.assinante_nome}</b> {c.assinado_em ? formatRelativeTime(c.assinado_em) : ""}.
            </p>
          ) : c.provider !== "simples" && c.provider_sign_url ? (
            <a href={c.provider_sign_url} className={buttonClasses("primary", "lg")}>
              Assinar com {c.provider === "zapsign" ? "ZapSign" : "Clicksign"}
            </a>
          ) : (
            <SignContractForm token={token} />
          )}
        </div>
      </article>
    </main>
  );
}
