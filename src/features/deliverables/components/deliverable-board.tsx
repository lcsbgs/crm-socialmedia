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
import { columnOf, statusColumns, type ColumnId } from "../schemas";
import { DeliverableCard } from "./deliverable-card";
import { useDeliverableSheet } from "./deliverable-sheet";

type Columns = Record<ColumnId, BoardDeliverable[]>;

function group(items: BoardDeliverable[]): Columns {
  const cols = Object.fromEntries(
    statusColumns.map((c) => [c.id, [] as BoardDeliverable[]]),
  ) as unknown as Columns;
  for (const i of [...items].sort((a, b) => a.ordem - b.ordem)) cols[columnOf(i.status)].push(i);
  return cols;
}

function findColumn(cols: Columns, id: string): ColumnId | null {
  if (id in cols) return id as ColumnId;
  return (Object.keys(cols) as ColumnId[]).find((k) => cols[k].some((d) => d.id === id)) ?? null;
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
    const original = items.find((d) => d.id === active.id);
    const list = [...columns[column]];
    const oldIndex = list.findIndex((d) => d.id === active.id);
    const overIndex = list.findIndex((d) => d.id === over.id);
    const newIndex = overIndex >= 0 ? overIndex : list.length - 1;
    const [item] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, item);
    const ordem = orderBetween(list, newIndex);
    // "Aprovado" continua aprovado se só mudou de posição dentro de Agendado.
    const status = column === "agendado" && original?.status === "aprovado" ? "aprovado" : column;
    list[newIndex] = { ...item, status, ordem };
    setColumns({ ...columns, [column]: list });
    void moveDeliverable({ workspaceId: workspace.id, id: item.id, status, ordem }).then((r) => {
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
      <div className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-4 sm:-mx-7 sm:px-7 xl:-mx-10 xl:px-10">
        {statusColumns.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
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
  color,
  items,
  showClient,
  workspaceId,
  onOpen,
  onAdd,
}: {
  id: ColumnId;
  label: string;
  color: string;
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
        "flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col gap-2.5 rounded-card border-2 border-transparent bg-[#EAECF0] p-3 sm:w-[272px]",
        isOver && "border-accent",
      )}
    >
      <h3 className="flex items-center justify-between gap-2 px-1 text-base font-bold">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="flex items-center gap-1">
          <span className="tabular rounded-full bg-surface px-2 text-xs font-bold text-ink-2">{items.length}</span>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              aria-label="Novo post"
              className="rounded-full p-1 text-muted hover:bg-surface hover:text-ink"
            >
              <Plus className="size-3.5" />
            </button>
          ) : null}
        </span>
      </h3>
      <SortableContext items={items.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
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
        className="cursor-grab touch-manipulation rounded-inner active:cursor-grabbing"
      >
        <DeliverableCard item={item} workspaceId={workspaceId} showClient={showClient} />
      </div>
    </li>
  );
}
