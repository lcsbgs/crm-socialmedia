import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { DemoBadge } from "@/components/ui/demo-badge";
import { devPasswordAllowed } from "@/features/auth/actions";
import { AuthHero } from "@/features/auth/components/auth-hero";
import { EmailAccess } from "@/features/auth/components/email-access";
import { ProviderButton } from "@/features/auth/components/provider-buttons";
import { safeNext } from "@/lib/auth";
import { isMockMode } from "@/lib/integrations/mode";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrar ou criar conta" };

const errors: Record<string, string> = {
  link: "O link expirou ou é inválido. Peça outro.",
  provedor: "Não foi possível entrar com esse provedor. Tente de novo ou use o e-mail.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const modo =
    params.modo === "criar" || params.modo === "entrar"
      ? params.modo
      : next !== "/w"
        ? "entrar"
        : "criar";
  const erro = typeof params.erro === "string" ? errors[params.erro] : undefined;
  const allowPassword = await devPasswordAllowed();
  const mock = isMockMode();
  const tab = (m: "criar" | "entrar", label: string) => (
    <Link
      href={`/login?modo=${m}&next=${encodeURIComponent(next)}`}
      role="tab"
      aria-selected={modo === m}
      className={cn(
        "flex h-10 flex-1 items-center justify-center rounded-full text-base",
        modo === m ? "bg-surface font-bold text-ink" : "text-ink-2",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-wrap">
      <AuthHero />
      <section
        aria-labelledby="h-entrar"
        className="flex flex-[1_1_480px] items-center justify-center px-4 py-10 sm:px-14 sm:py-12"
      >
        <div className="flex w-full max-w-[400px] flex-col gap-[22px]">
          <div role="tablist" aria-label="Criar conta ou entrar" className="flex rounded-full bg-background p-1">
            {tab("criar", "Criar conta")}
            {tab("entrar", "Entrar")}
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 id="h-entrar" className="font-display text-[32px] leading-tight">
              {modo === "criar" ? "Comece grátis" : "Que bom te ver"}
            </h1>
            <p className="text-md text-muted">
              {modo === "criar" ? "Sem cartão. Leva menos de 5 minutos." : "Entre para abrir a sua pauta."}
            </p>
          </div>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          {mock ? <DemoBadge className="self-start" /> : null}
          <div className="flex flex-col gap-2.5">
            <ProviderButton provider="chatgpt" next={next} note="IA sem custo extra" />
            <ProviderButton provider="google" next={next} />
            <ProviderButton provider="apple" next={next} />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-border" />
            ou com e-mail
            <span className="h-px flex-1 bg-border" />
          </div>
          <EmailAccess next={next} mode={modo} allowPassword={allowPassword} />
          <p className="text-[12.5px] leading-normal text-muted">
            Ao continuar, você aceita os Termos de uso e a Política de privacidade. Recebeu um convite? Entre com o
            mesmo e-mail do convite e você cai direto no espaço da equipe.
          </p>
        </div>
      </section>
    </div>
  );
}
