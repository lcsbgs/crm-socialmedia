"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "estudio", label: "Estúdio" },
  { href: "equipe", label: "Equipe" },
  { href: "plano", label: "Plano" },
  { href: "integracoes", label: "Integrações" },
  { href: "ia", label: "IA e ChatGPT" },
  { href: "conta", label: "Minha conta" },
];

export function SettingsNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Ajustes" className="lg:w-56 lg:shrink-0">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
        {items.map((i) => {
          const href = `/w/${slug}/ajustes/${i.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={i.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-xl px-3 text-base whitespace-nowrap text-ink hover:bg-surface",
                  active && "bg-surface font-bold text-accent-tonal-ink",
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
