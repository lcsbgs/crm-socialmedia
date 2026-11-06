import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "success" | "warning" | "danger" | "accent" | "today";

const tones: Record<Tone, string> = {
  neutral: "bg-hover text-ink-2",
  success: "bg-ok-tonal text-ok-ink",
  warning: "bg-today-tonal text-today-ink",
  danger: "bg-late-tonal text-late-ink",
  accent: "bg-accent-tonal text-accent-tonal-ink",
  today: "bg-today text-today-ink",
};

const dots: Record<Tone, string> = {
  neutral: "bg-muted",
  success: "bg-ok",
  warning: "bg-today-strong",
  danger: "bg-late",
  accent: "bg-accent",
  today: "bg-today-strong",
};

// Selo de estado em pílula tonal.
export function Badge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} /> : null}
      {children}
    </span>
  );
}

// Contador numérico (ex.: navegação).
export function CountBadge({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={cn(
        "tabular text-xs",
        strong ? "rounded-full bg-accent px-2 py-0.5 font-bold text-white" : "text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", dots[tone], className)} />;
}
