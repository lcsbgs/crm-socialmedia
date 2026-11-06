import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { brand } from "@/config/brand";
import { saveAiStep } from "@/features/onboarding/actions";
import { OnboardingFrame } from "@/features/onboarding/components/onboarding-frame";
import { getOnboardingContext } from "@/features/onboarding/queries";
import { isMockMode } from "@/lib/integrations/mode";

export const metadata: Metadata = { title: "IA" };

const usos = [
  "Legenda no tom da marca",
  "Ata de reunião em tarefas",
  "Rascunho de estratégia",
  "Leitura do relatório",
  "Mensagem de cobrança gentil",
];

export default async function OnboardingAiPage({ searchParams }: PageProps<"/onboarding/ia">) {
  const [{ workspace }, query] = await Promise.all([getOnboardingContext(), searchParams]);
  const conectando = query.conectar === "chatgpt";
  return (
    <OnboardingFrame step={2}>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Já paga o ChatGPT? Use ele aqui dentro.</h1>
        <p className="max-w-[620px] text-md text-ink-2">
          A IA do {brand.name} escreve legendas no tom de cada marca, transforma reuniões em ata e monta a leitura do
          relatório do mês. Com o seu plano do ChatGPT, isso não custa nada a mais.
        </p>
      </div>

      <Card aria-labelledby="h-gpt" className="flex flex-col gap-4 border-[1.5px] border-accent">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="h-gpt" className="font-display text-xl">
            Usar meu plano do ChatGPT
          </h2>
          <Badge tone="accent">Recomendado</Badge>
          {isMockMode() ? <DemoBadge /> : null}
        </div>
        <p className="text-sm text-muted">Para assinantes Plus e Pro. Cada pessoa da equipe conecta a própria conta.</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-md text-ink-2">
          <li>Você entra com o ChatGPT e autoriza o {brand.name} a usar o seu plano.</li>
          <li>No ChatGPT, você define quanto o {brand.name} pode usar por semana.</li>
          <li>Se o limite da semana acabar, o {brand.name} usa os créditos de IA do seu plano e avisa antes.</li>
        </ol>
        {conectando ? (
          <p className="rounded-inner bg-ok-tonal px-4 py-3 text-sm font-semibold text-ok-ink">
            Pronto. Você termina a conexão em Ajustes, IA e ChatGPT, quando abrir a sua pauta.
          </p>
        ) : null}
        <form action={saveAiStep} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <input type="hidden" name="ai_mode" value="chatgpt" />
          <button type="submit" className={buttonClasses("chatgpt", "lg")}>
            Conectar com ChatGPT
          </button>
          <a
            href="https://chatgpt.com/#settings"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-accent-tonal-ink underline"
          >
            Gerenciar uso no ChatGPT
          </a>
        </form>
      </Card>

      <Card aria-labelledby="h-creditos" className="flex flex-col gap-3">
        <h2 id="h-creditos" className="font-display text-xl">
          Usar só os créditos do {brand.name}
        </h2>
        <p className="text-sm text-muted">Todo plano já vem com créditos de IA por mês. Dá para conectar o ChatGPT depois em Ajustes.</p>
        <form action={saveAiStep}>
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <input type="hidden" name="ai_mode" value="creditos" />
          <button type="submit" className={buttonClasses("outline", "md")}>
            Seguir com créditos
          </button>
        </form>
      </Card>

      <ul className="flex flex-wrap gap-2">
        {usos.map((u) => (
          <li key={u} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-ink-2">
            <Check className="size-3.5 text-ok" aria-hidden />
            {u}
          </li>
        ))}
      </ul>

      <div className="flex justify-between">
        <Link href="/onboarding/espaco" className={buttonClasses("ghost", "md")}>
          Voltar
        </Link>
        <Link href="/onboarding/cliente" className={buttonClasses("primary", "lg")}>
          Continuar
        </Link>
      </div>
    </OnboardingFrame>
  );
}
