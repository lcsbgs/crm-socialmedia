"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Dropdown baseado em <details>: acessível por teclado, fecha ao navegar,
// ao clicar fora e com Esc.
export function Menu({
  summary,
  summaryClassName,
  children,
  className,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={cn("group relative", className)}>
      <summary
        className={cn("cursor-pointer list-none [&::-webkit-details-marker]:hidden", summaryClassName)}
      >
        {summary}
      </summary>
      {children}
    </details>
  );
}
