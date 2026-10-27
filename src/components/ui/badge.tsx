import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

// Estados aparecem num ponto colorido, nunca em fundo grande.
const dots: Record<Tone, string> = {
  neutral: "bg-muted",
  success: "bg-ok",
  warning: "bg-waiting",
  danger: "bg-late",
  accent: "bg-accent",
};

export function Badge({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className="inline-flex h-5 items-center gap-1.5 rounded-md border border-border px-1.5 text-xs font-medium whitespace-nowrap text-ink">
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} /> : null}
      {children}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", dots[tone], className)} />
  );
}
