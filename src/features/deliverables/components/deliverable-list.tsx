"use client";

import { clientColor } from "@/config/client-colors";
import { formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardDeliverable } from "../queries";
import { deliverableLabel, formatLabels, statusColumns } from "../schemas";
import { useDeliverableSheet } from "./deliverable-sheet";

const statusLabel = Object.fromEntries(statusColumns.map((c) => [c.id, c.label])) as Record<string, string>;

// Lista compacta de entregas (clique abre o painel).
export function DeliverableList({ items, empty }: { items: BoardDeliverable[]; empty: string }) {
  const sheet = useDeliverableSheet();
  const today = todayISO();
  if (!items.length) return <p className="py-2 text-sm text-muted">{empty}</p>;
  return (
    <ul>
      {items.map((i) => {
        const late =
          !!i.data_publicacao &&
          i.data_publicacao < today &&
          i.status !== "publicado" &&
          i.status !== "aprovado";
        return (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => sheet.open(i.id)}
              className="flex min-h-9 w-full items-center gap-3 border-b border-border py-1.5 text-left last:border-0 hover:bg-hover"
            >
              <span
                aria-hidden
                className="h-4 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: clientColor(i.client.cor) }}
              />
              <span className={cn("min-w-0 flex-1 truncate", !i.titulo && "text-muted italic")}>
                {deliverableLabel(i)}
              </span>
              <span className="hidden text-sm text-muted sm:inline">{formatLabels[i.formato]}</span>
              <span className="w-24 text-sm text-muted max-sm:hidden">{statusLabel[i.status]}</span>
              <time
                className={cn("tabular w-20 shrink-0 text-right text-sm", late ? "text-late" : "text-muted")}
              >
                {i.data_publicacao ? formatRelativeDay(i.data_publicacao) : "sem data"}
              </time>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
