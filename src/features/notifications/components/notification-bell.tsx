"use client";

import { Bell, Check, ThumbsUp, Wrench } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "../actions";
import type { NotificationItem } from "../queries";

export function NotificationBell({
  workspaceId,
  items,
  unread,
  collapsed,
}: {
  workspaceId: string;
  items: NotificationItem[];
  unread: number;
  collapsed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  // Abrir a lista marca tudo como lido (os itens continuam destacados até fechar).
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && unread > 0) start(async () => void (await markAllNotificationsRead({ workspaceId })));
    if (!next) router.refresh();
  }

  const trigger = (
    <PopoverTrigger
      aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"}
      className={cn(
        "relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-muted hover:bg-hover",
        collapsed && "justify-center px-0",
      )}
    >
      <Bell className="size-4 shrink-0" aria-hidden />
      {collapsed ? null : <span className="flex-1">Notificações</span>}
      {unread ? (
        <span
          className={cn(
            "tabular inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink",
            collapsed && "absolute top-0.5 right-1",
          )}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {collapsed ? (
        <Tooltip content="Notificações" side="right">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      <PopoverContent side="right" align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {unread ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Check className="size-3" aria-hidden />
              marcadas como lidas
            </span>
          ) : null}
        </div>
        {items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nada novo"
            description="Quando um cliente responder no portal, você fica sabendo aqui."
          />
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((n) => {
              const Icon = n.tipo === "aprovacao" ? ThumbsUp : Wrench;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (n.deliverable_id)
                        router.push(`${pathname}?entrega=${n.deliverable_id}`, { scroll: false });
                    }}
                    className={cn(
                      "flex w-full gap-2.5 px-3 py-2 text-left hover:bg-hover",
                      !n.lida_em && "bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        n.tipo === "aprovacao" ? "text-ok" : "text-waiting",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm">{n.titulo}</span>
                      {n.corpo ? (
                        <span className="line-clamp-2 block text-sm text-muted">{n.corpo}</span>
                      ) : null}
                      <span className="block text-xs text-muted">{formatRelativeTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
