"use client";

import Link from "next/link";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = { value: string; label: ReactNode; href?: string; count?: number };

// Abas em pílula. Com href viram links (navegação por URL); sem href, tablist com setas.
export function Tabs({
  items,
  value,
  onValueChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onValueChange?: (v: string) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  const refs = useRef<Array<HTMLElement | null>>([]);
  const isLinks = items.every((i) => i.href);

  function onKey(e: KeyboardEvent, index: number) {
    if (isLinks) return;
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + dir + items.length) % items.length;
    refs.current[next]?.focus();
    onValueChange?.(items[next].value);
  }

  const base =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-base whitespace-nowrap transition-colors";
  const on = "bg-ink font-semibold text-white";
  const off = "text-ink-2 hover:bg-hover";

  return (
    <div
      role={isLinks ? undefined : "tablist"}
      aria-label={label}
      className={cn("-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]", className)}
    >
      {items.map((item, i) => {
        const active = item.value === value;
        const content = (
          <>
            {item.label}
            {item.count !== undefined ? (
              <span className={cn("tabular text-xs", active ? "text-white/80" : "text-muted")}>{item.count}</span>
            ) : null}
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.value}
              href={item.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(base, active ? on : off)}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-${item.value}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onValueChange?.(item.value)}
            className={cn(base, active ? on : off)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
