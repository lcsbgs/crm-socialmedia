"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useId, useState, useTransition } from "react";
import { useShell } from "@/components/shell/shell-context";
import { toast } from "@/components/ui/toast";
import { addDaysISO, dayMonthLabel, weekdayLabel } from "@/lib/dates";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setDeliverableDate } from "../actions";
import type { BoardDeliverable } from "../queries";
import { DeliverableCard } from "./deliverable-card";
import { useDeliverableSheet } from "./deliverable-sheet";

// Visão de semana: uma coluna por dia; arrastar muda a data de publicação.
export function WeekBoard({
  items,
  weekStart,
  showClient = true,
}: {
  items: BoardDeliverable[];
  weekStart: string;
  showClient?: boolean;
}) {
  const { workspace } = useShell();
  const sheet = useDeliverableSheet();
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, start] = useTransition();
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const today = todayISO();

  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const dateOf = (i: BoardDeliverable) => moved[i.id] ?? i.data_publicacao;
  const active = items.find((i) => i.id === activeId) ?? null;

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const id = String(active.id);
    const date = String(over.id);
    const item = items.find((i) => i.id === id);
    if (!item || dateOf(item) === date) return;
    setMoved((m) => ({ ...m, [id]: date }));
    start(async () => {
      const r = await setDeliverableDate({ workspaceId: workspace.id, id, date });
      if (r.error) {
        toast.error(r.error);
        setMoved((m) => {
          const next = { ...m };
          delete next[id];
          return next;
        });
      }
    });
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
        {days.map((day) => (
          <Day key={day} day={day} isToday={day === today}>
            {items
              .filter((i) => dateOf(i) === day)
              .map((i) => (
                <DraggableCard key={i.id} item={i} onOpen={sheet.open}>
                  <DeliverableCard item={i} workspaceId={workspace.id} showClient={showClient} compact />
                </DraggableCard>
              ))}
          </Day>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <DeliverableCard
            item={active}
            workspaceId={workspace.id}
            showClient={showClient}
            dragging
            compact
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Day({ day, isToday, children }: { day: string; isToday: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: day });
  return (
    <section
      aria-label={`${weekdayLabel(day)}, ${dayMonthLabel(day)}`}
      className={cn(
        "flex w-[70vw] max-w-60 shrink-0 snap-start flex-col rounded-lg border border-transparent bg-[color-mix(in_srgb,var(--border)_45%,transparent)] p-1.5 sm:w-52 lg:w-auto lg:max-w-none",
        isOver && "border-[color-mix(in_srgb,var(--accent)_35%,transparent)]",
      )}
    >
      <h3 className="flex items-baseline justify-between px-1.5 pt-0.5 pb-1.5 text-sm">
        <span className={cn("font-medium first-letter:uppercase", isToday && "text-accent")}>
          {weekdayLabel(day)}
        </span>
        <span className={cn("tabular text-xs", isToday ? "font-medium text-accent" : "text-muted")}>
          {dayMonthLabel(day)}
        </span>
      </h3>
      <ul ref={setNodeRef} className="flex min-h-32 flex-1 flex-col gap-1.5">
        {children}
      </ul>
    </section>
  );
}

function DraggableCard({
  item,
  onOpen,
  children,
}: {
  item: BoardDeliverable;
  onOpen: (id: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <li ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <div
        {...attributes}
        {...listeners}
        aria-roledescription="cartão arrastável"
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === "Enter") onOpen(item.id);
        }}
        className="cursor-grab touch-manipulation rounded-md active:cursor-grabbing"
      >
        {children}
      </div>
    </li>
  );
}
