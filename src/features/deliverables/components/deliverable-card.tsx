"use client";

import { CalendarDays, Paperclip } from "lucide-react";
import { useTransition } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { clientColor } from "@/config/client-colors";
import { formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setDeliverableDate } from "../actions";
import type { BoardDeliverable } from "../queries";
import { deliverableLabel, formatLabels } from "../schemas";

// Cartão de entrega: faixa na cor do cliente, título (ou rascunho), formato,
// data editável em popover e responsável.
export function DeliverableCard({
  item,
  workspaceId,
  showClient = true,
  dragging = false,
  compact = false,
}: {
  item: BoardDeliverable;
  workspaceId: string;
  showClient?: boolean;
  dragging?: boolean;
  compact?: boolean;
}) {
  const [, start] = useTransition();
  const draft = !item.titulo;
  const late =
    !!item.data_publicacao &&
    item.data_publicacao < todayISO() &&
    item.status !== "publicado" &&
    item.status !== "aprovado";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface text-sm transition-colors hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))]",
        dragging && "shadow-pop",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: clientColor(item.client.cor) }}
      />
      {item.thumb && !compact ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
        <img src={item.thumb} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : null}
      <div className="space-y-1.5 py-2 pr-2.5 pl-3">
        {showClient ? <p className="truncate text-xs text-muted">{item.client.nome}</p> : null}
        <p className={cn("leading-snug", draft ? "text-muted italic" : "font-medium text-ink")}>
          {deliverableLabel(item)}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{formatLabels[item.formato]}</span>
          <Popover>
            <PopoverTrigger
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Mudar data de publicação"
              className={cn(
                "tabular inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-hover",
                late && "text-late",
              )}
            >
              <CalendarDays className="size-3" aria-hidden />
              {item.data_publicacao ? formatRelativeDay(item.data_publicacao) : "Sem data"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
              <Calendar
                selected={item.data_publicacao}
                onSelect={(date) =>
                  start(async () => {
                    const r = await setDeliverableDate({ workspaceId, id: item.id, date });
                    if (r.error) toast.error(r.error);
                  })
                }
              />
            </PopoverContent>
          </Popover>
          {item.midiaCount ? (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="size-3" aria-hidden />
              <span className="tabular">{item.midiaCount}</span>
            </span>
          ) : null}
          {item.responsavel ? (
            <span className="ml-auto" title={item.responsavel.nome}>
              <UserAvatar name={item.responsavel.nome} size="xs" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
