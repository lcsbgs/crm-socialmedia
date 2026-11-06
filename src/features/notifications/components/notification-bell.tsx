"use client";

import { Bell, Check, ThumbsUp, Wrench } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "../actions";
import type { NotificationItem } from "../queries";

export function NotificationBell({
  workspaceId,
  items,
  unread,
}: {
  workspaceId: string;
  items: NotificationItem[];
  unread: number;
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
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink hover:bg-hover"
    >
      <Bell className="size-[18px]" aria-hidden />
      {unread ? (
        <span className="tabular absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-accent px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger}
      <PopoverContent side="bottom" align="end" className="w-80 max-w-[calc(100vw-32px)] p-0">
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
