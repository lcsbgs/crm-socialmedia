import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { brand } from "@/config/brand";
import { MockConsentForm } from "@/features/auth/components/mock-consent-form";
import { isLoginProvider, providerLabels } from "@/features/auth/providers/types";
import { safeNext } from "@/lib/auth";
import { isMockMode } from "@/lib/integrations/mode";

export const metadata: Metadata = { title: "Entrar (simulado)" };

// Tela de consentimento simulada: aparece no lugar do Google, Apple ou ChatGPT em modo demonstração.
export default async function MockConsentPage({ params, searchParams }: PageProps<"/auth/simulado/[provedor]">) {
  const [{ provedor }, query] = await Promise.all([params, searchParams]);
  if (!isLoginProvider(provedor) || !isMockMode()) notFound();
  const next = safeNext(typeof query.next === "string" ? query.next : null);
  const label = providerLabels[provedor];

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-surface p-7">
        <div className="mb-5 flex items-center justify-between gap-2">
          <span className="font-display text-lg">{label}</span>
          <DemoBadge />
        </div>
        <h1 className="font-display text-2xl">Entrar no {brand.name} com {label}</h1>
        <p className="mt-2 mb-5 text-md text-muted">
          O {brand.name} vai receber seu nome, e-mail e foto de perfil{provedor === "chatgpt" ? ". O uso do plano do ChatGPT é pedido à parte, em Ajustes." : "."}
        </p>
        <MockConsentForm
          provider={provedor}
          next={next}
          defaultEmail={`teste.${provedor}@pauta.dev`}
          defaultName={`Teste ${label}`}
        />
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClasses("ghost", "md") + " mt-2 w-full"}>
          Cancelar
        </Link>
        <p className="mt-4 text-xs text-muted">
          Esta tela é uma simulação. Para usar o login de verdade, configure o provedor e troque INTEGRATIONS_MODE para
          real (veja docs/oauth-setup.md).
        </p>
      </div>
    </main>
  );
}
