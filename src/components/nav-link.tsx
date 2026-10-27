"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="shrink-0 rounded-md px-3 py-1.5 text-muted hover:bg-border/50 hover:text-foreground aria-[current=page]:bg-border/60 aria-[current=page]:text-foreground"
    >
      {children}
    </Link>
  );
}
