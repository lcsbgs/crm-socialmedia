import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { skipOnboarding } from "../actions";

const steps = [
  { n: 1, label: "Espaço e equipe", href: "/onboarding/espaco" },
  { n: 2, label: "IA", href: "/onboarding/ia" },
  { n: 3, label: "Primeiro cliente", href: "/onboarding/cliente" },
];

// Moldura dos 3 passos: marca, etapas e "Pular por agora".
export function OnboardingFrame({ step, children }: { step: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-4 px-4 py-5 sm:px-10">
        <span className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-accent font-display text-lg font-extrabold text-white">
            P
          </span>
          <span className="font-display text-xl">{brand.name}</span>
        </span>
        <ol aria-label="Etapas" className="mx-auto flex flex-wrap items-center gap-2">
          {steps.map((s) => {
            const done = s.n < step;
            const current = s.n === step;
            return (
              <li key={s.n} aria-current={current ? "step" : undefined}>
                <Link
                  href={s.href}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full px-3 text-base",
                    current ? "bg-surface font-bold text-ink" : "text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      current ? "bg-accent text-white" : done ? "bg-ok text-white" : "bg-hover text-ink-2",
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : s.n}
                  </span>
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ol>
        <form action={skipOnboarding}>
          <button type="submit" className="text-base font-semibold text-muted underline hover:text-ink">
            Pular por agora
          </button>
        </form>
      </header>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pt-4 pb-16">{children}</main>
    </div>
  );
}
