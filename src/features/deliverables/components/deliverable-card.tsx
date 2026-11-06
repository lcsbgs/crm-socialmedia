"use client";

import { CalendarDays, Paperclip } from "lucide-react";
import { useTransition } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { clientPalette } from "@/config/client-colors";
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
    !["publicado", "aprovado", "agendado"].includes(item.status);
  const palette = clientPalette(item.client.cor);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-inner border-[1.5px] bg-surface text-sm transition-colors",
        late ? "border-late-soft" : "border-transparent hover:border-border-input",
        dragging && "shadow-pop",
      )}
    >
      {item.thumb && !compact ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
        <img src={item.thumb} alt="" className="aspect-[4/3] w-full object-cover" style={{ backgroundColor: palette.thumb }} />
      ) : null}
      <div className="space-y-2 p-3">
        {showClient ? (
          <span
            className="inline-flex h-[22px] max-w-full items-center rounded-tag px-2 text-xs font-bold"
            style={{ backgroundColor: palette.tonal, color: palette.ink }}
          >
            <span className="truncate">{item.client.nome}</span>
          </span>
        ) : null}
        <p className={cn("text-md leading-snug", draft ? "text-muted italic" : "font-semibold text-ink")}>
          {deliverableLabel(item)}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted">
          {item.status === "aprovado" ? <span className="font-semibold text-ok-ink">aprovado, falta agendar</span> : null}
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
              <UserAvatar name={item.responsavel.nome} size="sm" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
