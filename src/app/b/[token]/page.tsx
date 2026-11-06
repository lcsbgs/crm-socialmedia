import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { BriefingForm } from "@/features/public/briefing-form";
import { optionalServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Briefing", robots: { index: false } };

// Briefing público por token: o cliente responde pelo celular, sem login.
export default async function BriefingPage({ params }: PageProps<"/b/[token]">) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) notFound();
  if (!optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Alert tone="error">Este link ainda não está disponível. Avise quem te mandou.</Alert>
      </main>
    );
  }
  const { data } = await createAdminClient().rpc("get_briefing_form", { p_token: token }).maybeSingle();
  if (!data) notFound();
  const initial = z.record(z.string(), z.string()).catch({}).parse(data.respostas ?? {});
  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <p className="text-sm font-semibold text-muted">{data.workspace_nome}</p>
        <h1 className="font-display text-3xl">Briefing da {data.client_nome}</h1>
        <p className="text-md text-ink-2">
          Com isso a gente acerta o tom e o conteúdo desde o primeiro post. Responda com calma, do jeito que você
          falaria.{data.respondido_em ? " Você já respondeu; se mudar algo, é só enviar de novo." : ""}
        </p>
        <div className="rounded-card bg-surface p-[22px]">
          <BriefingForm token={token} initial={initial} />
        </div>
      </div>
    </main>
  );
}
