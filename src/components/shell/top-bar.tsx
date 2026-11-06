"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AvatarStack } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { NotificationItem } from "@/features/notifications/queries";

// Barra superior: busca, Minha pauta/Pauta do time, notificações e equipe.
export function TopBar({
  slug,
  workspaceId,
  notifications,
  team,
  onOpenPalette,
  onOpenMenu,
}: {
  slug: string;
  workspaceId: string;
  notifications: { items: NotificationItem[]; unread: number };
  team: { name: string }[];
  onOpenPalette: () => void;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const base = `/w/${slug}`;
  const scope = params.get("pauta") === "time" ? "time" : "minha";
  const onHome = pathname === base;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-11 min-w-0 flex-[1_1_240px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-left text-base text-muted hover:border-border-input sm:max-w-[520px]"
      >
        <Search className="size-[18px] shrink-0" aria-hidden />
        <span className="flex-1 truncate">Buscar clientes, posts, reuniões</span>
        <Kbd>⌘K</Kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <SegmentedControl
          label="De quem é a pauta"
          value={onHome ? scope : ""}
          className="hidden md:inline-flex"
          options={[
            { value: "minha", label: "Minha pauta", href: base },
            { value: "time", label: "Pauta do time", href: `${base}?pauta=time` },
          ]}
        />
        <NotificationBell workspaceId={workspaceId} items={notifications.items} unread={notifications.unread} />
        <Link href={`${base}/ajustes/equipe`} className="hidden rounded-full sm:inline-flex" aria-label={`Equipe: ${team.map((t) => t.name).join(", ")}`}>
          <AvatarStack people={team} size="lg" max={4} label={`Equipe: ${team.map((t) => t.name).join(", ")}`} />
        </Link>
      </div>
    </div>
  );
}
