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
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useActionState, useMemo, useState } from "react";
import { Alert, FormAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createDeliverable, moveDeliverable } from "../actions";
import type { Deliverable } from "../queries";
import { formatLabels, statusColumns, type DeliverableStatus } from "../schemas";
import { DeliverableEditor } from "./deliverable-editor";

type Columns = Record<DeliverableStatus, Deliverable[]>;

function groupByStatus(items: Deliverable[]): Columns {
  const columns = Object.fromEntries(
    statusColumns.map((c) => [c.id, [] as Deliverable[]]),
  ) as unknown as Columns;
  for (const item of [...items].sort((a, b) => a.ordem - b.ordem)) columns[item.status].push(item);
  return columns;
}

function findColumn(columns: Columns, id: string): DeliverableStatus | null {
  if (id in columns) return id as DeliverableStatus;
  return (
    (Object.keys(columns) as DeliverableStatus[]).find((k) => columns[k].some((d) => d.id === id)) ?? null
  );
}

// Posição entre os vizinhos, sem renumerar a coluna.
function orderBetween(list: Deliverable[], index: number) {
  const prev = list[index - 1]?.ordem;
  const next = list[index + 1]?.ordem;
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

export function KanbanBoard({
  workspaceId,
  clientId,
  deliverables,
}: {
  workspaceId: string;
  clientId: string;
  deliverables: Deliverable[];
}) {
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(deliverables));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dados novos do servidor (após salvar, upload, etc.) substituem o estado local.
  const [source, setSource] = useState(deliverables);
  if (source !== deliverables) {
    setSource(deliverables);
    setColumns(groupByStatus(deliverables));
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const all = useMemo(() => Object.values(columns).flat(), [columns]);
  const active = all.find((d) => d.id === activeId) ?? null;
  const editing = deliverables.find((d) => d.id === editingId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  // Move entre colunas durante o arraste, para o card "entrar" na coluna nova.
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
    const moved = { ...item, status: column, ordem };
    list[newIndex] = moved;

    setColumns({ ...columns, [column]: list });
    void moveDeliverable({ workspaceId, id: moved.id, status: column, ordem }).then((result) => {
      if (result.error) {
        setError(result.error);
        setColumns(groupByStatus(deliverables));
      }
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <p className="text-xs text-muted">
        Arraste os cards entre as colunas. No teclado: foque um card, Espaço para pegar, setas para mover e
        Espaço para soltar.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setColumns(groupByStatus(deliverables));
        }}
      >
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {statusColumns.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} items={columns[col.id]} onOpen={setEditingId}>
              {col.id === "planejar" ? (
                <NewDeliverableForm workspaceId={workspaceId} clientId={clientId} />
              ) : null}
            </Column>
          ))}
        </div>
        <DragOverlay>{active ? <CardBody item={active} dragging /> : null}</DragOverlay>
      </DndContext>

      <Dialog open={!!editing} onClose={() => setEditingId(null)} title={editing?.titulo ?? "Entrega"}>
        {editing ? (
          <DeliverableEditor
            workspaceId={workspaceId}
            deliverable={editing}
            onDone={() => setEditingId(null)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function Column({
  id,
  label,
  items,
  onOpen,
  children,
}: {
  id: DeliverableStatus;
  label: string;
  items: Deliverable[];
  onOpen: (id: string) => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      aria-label={label}
      className={cn(
        "flex w-[78vw] max-w-xs shrink-0 snap-start flex-col rounded-lg bg-border/30 p-2 sm:w-64 lg:w-auto lg:max-w-none",
        isOver && "ring-2 ring-foreground/20",
      )}
    >
      <h3 className="flex items-center justify-between px-1 pb-2 text-sm font-medium">
        {label}
        <span className="text-xs text-muted">{items.length}</span>
      </h3>
      <SortableContext items={items.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2">
          {items.map((item) => (
            <SortableCard key={item.id} item={item} onOpen={onOpen} />
          ))}
        </ul>
      </SortableContext>
      {children}
    </section>
  );
}

function SortableCard({ item, onOpen }: { item: Deliverable; onOpen: (id: string) => void }) {
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
        aria-roledescription="card arrastável"
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === "Enter") onOpen(item.id);
        }}
        className="cursor-grab touch-manipulation active:cursor-grabbing"
      >
        <CardBody item={item} />
      </div>
    </li>
  );
}

function CardBody({ item, dragging }: { item: Deliverable; dragging?: boolean }) {
  const thumb = item.midia.find((m) => m.kind === "image" && m.url);
  return (
    <article
      className={cn(
        "space-y-2 rounded-md border border-border bg-surface p-3 text-sm",
        dragging && "shadow-lg",
      )}
    >
      {thumb?.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
        <img src={thumb.url} alt="" className="aspect-video w-full rounded object-cover" />
      ) : null}
      <p className="font-medium leading-snug">{item.titulo}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge>{formatLabels[item.formato]}</Badge>
        {item.data_publicacao ? <span>{formatDate(item.data_publicacao)}</span> : null}
        {item.midia.length ? <span>{item.midia.length} arquivo(s)</span> : null}
      </div>
    </article>
  );
}

function NewDeliverableForm({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const [state, action] = useActionState(createDeliverable, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-border/50"
      >
        + Nova entrega
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2 rounded-md border border-border bg-surface p-2">
      <FormAlert state={state?.error ? state : null} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="titulo"
        aria-label="Título da entrega"
        placeholder="Título"
        required
        autoFocus
        className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          name="formato"
          aria-label="Formato"
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        >
          {Object.entries(formatLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="data_publicacao"
          type="date"
          aria-label="Data de publicação"
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <SubmitButton size="sm">Adicionar</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          Cancelar
        </button>
      </div>
    </form>
  );
}
