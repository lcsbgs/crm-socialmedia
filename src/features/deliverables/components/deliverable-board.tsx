"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useShell } from "@/components/shell/shell-context";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { moveDeliverable } from "../actions";
import type { BoardDeliverable } from "../queries";
import { statusColumns, type DeliverableStatus } from "../schemas";
import { DeliverableCard } from "./deliverable-card";
import { useDeliverableSheet } from "./deliverable-sheet";

type Columns = Record<DeliverableStatus, BoardDeliverable[]>;

function group(items: BoardDeliverable[]): Columns {
  const cols = Object.fromEntries(
    statusColumns.map((c) => [c.id, [] as BoardDeliverable[]]),
  ) as unknown as Columns;
  for (const i of [...items].sort((a, b) => a.ordem - b.ordem)) cols[i.status].push(i);
  return cols;
}

function findColumn(cols: Columns, id: string): DeliverableStatus | null {
  if (id in cols) return id as DeliverableStatus;
  return (Object.keys(cols) as DeliverableStatus[]).find((k) => cols[k].some((d) => d.id === id)) ?? null;
}

function orderBetween(list: BoardDeliverable[], index: number) {
  const prev = list[index - 1]?.ordem;
  const next = list[index + 1]?.ordem;
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

// Quadro por etapa (Trello): arrastar entre colunas e reordenar.
export function DeliverableBoard({
  items,
  showClient = true,
  clientId,
}: {
  items: BoardDeliverable[];
  showClient?: boolean;
  clientId?: string;
}) {
  const { workspace, openNewDeliverable } = useShell();
  const sheet = useDeliverableSheet();
  const [columns, setColumns] = useState<Columns>(() => group(items));
  const [source, setSource] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  if (source !== items) {
    setSource(items);
    setColumns(group(items));
  }

  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const all = useMemo(() => Object.values(columns).flat(), [columns]);
  const active = all.find((d) => d.id === activeId) ?? null;

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findColumn(columns, String(active.id));
    const to = findColumn(columns, String(over.id));
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const item = prev[from].find((d) => d.id === active.id);
      if (!item) return prev;
      const target = prev[to];
      const overIndex = target.findIndex((d) => d.id === over.id);
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...prev,
        [from]: prev[from].filter((d) => d.id !== active.id),
        [to]: [...target.slice(0, index), { ...item, status: to }, ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const column = findColumn(columns, String(active.id));
    if (!column) return;
    const list = [...columns[column]];
    const oldIndex = list.findIndex((d) => d.id === active.id);
    const overIndex = list.findIndex((d) => d.id === over.id);
    const newIndex = overIndex >= 0 ? overIndex : list.length - 1;
    const [item] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, item);
    const ordem = orderBetween(list, newIndex);
    list[newIndex] = { ...item, status: column, ordem };
    setColumns({ ...columns, [column]: list });
    void moveDeliverable({ workspaceId: workspace.id, id: item.id, status: column, ordem }).then((r) => {
      if (r.error) {
        toast.error(r.error);
        setColumns(group(items));
      }
    });
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setColumns(group(items));
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Para pegar o cartão, aperte Espaço. Use as setas para mover e Espaço para soltar. Esc cancela.",
        },
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {statusColumns.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            items={columns[col.id]}
            showClient={showClient}
            workspaceId={workspace.id}
            onOpen={sheet.open}
            onAdd={col.id === "planejar" ? () => openNewDeliverable({ clientId }) : undefined}
          />
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

function Column({
  id,
  label,
  items,
  showClient,
  workspaceId,
  onOpen,
  onAdd,
}: {
  id: DeliverableStatus;
  label: string;
  items: BoardDeliverable[];
  showClient: boolean;
  workspaceId: string;
  onOpen: (id: string) => void;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      aria-label={label}
      className={cn(
        "flex w-[80vw] max-w-72 shrink-0 snap-start flex-col rounded-lg border border-transparent bg-[color-mix(in_srgb,var(--border)_45%,transparent)] p-1.5 sm:w-64 lg:w-auto lg:max-w-none",
        isOver && "border-[color-mix(in_srgb,var(--accent)_35%,transparent)]",
      )}
    >
      <h3 className="flex items-center justify-between px-1.5 pt-0.5 pb-1.5 text-sm font-medium">
        {label}
        <span className="flex items-center gap-1">
          <span className="tabular text-xs text-muted">{items.length}</span>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              aria-label="Nova entrega"
              className="rounded p-0.5 text-muted hover:bg-hover hover:text-ink"
            >
              <Plus className="size-3.5" />
            </button>
          ) : null}
        </span>
      </h3>
      <SortableContext items={items.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-20 flex-1 flex-col gap-1.5">
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              showClient={showClient}
              workspaceId={workspaceId}
              onOpen={onOpen}
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

function SortableCard({
  item,
  showClient,
  workspaceId,
  onOpen,
}: {
  item: BoardDeliverable;
  showClient: boolean;
  workspaceId: string;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    >
      <div
        {...attributes}
        {...listeners}
        aria-roledescription="cartão arrastável"
        aria-label={`${item.titulo ?? item.slot_label}, ${item.client.nome}`}
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === "Enter") onOpen(item.id);
        }}
        className="cursor-grab touch-manipulation rounded-md active:cursor-grabbing"
      >
        <DeliverableCard item={item} workspaceId={workspaceId} showClient={showClient} />
      </div>
    </li>
  );
}
