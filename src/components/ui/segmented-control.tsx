"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentOption = { value: string; label: ReactNode; href?: string };

// Escolha exclusiva entre poucas opções (Mês, Semana, Lista; Minha pauta, Pauta do time).
export function SegmentedControl({
  options,
  value,
  onValueChange,
  label,
  className,
  size = "md",
  tone = "light",
}: {
  options: SegmentOption[];
  value: string;
  onValueChange?: (v: string) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
  tone?: "light" | "dark";
}) {
  const item = cn(
    "inline-flex items-center justify-center rounded-full px-3.5 text-base whitespace-nowrap transition-colors",
    size === "sm" ? "h-8" : "h-10",
  );
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        const cls = cn(
          item,
          active
            ? tone === "dark"
              ? "border border-transparent bg-ink font-bold text-white"
              : "border border-border bg-surface font-semibold text-ink"
            : "border border-transparent text-ink-2 hover:text-ink",
        );
        return o.href ? (
          <Link key={o.value} href={o.href} aria-current={active ? "true" : undefined} className={cls} scroll={false}>
            {o.label}
          </Link>
        ) : (
          <button key={o.value} type="button" aria-pressed={active} onClick={() => onValueChange?.(o.value)} className={cls}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
