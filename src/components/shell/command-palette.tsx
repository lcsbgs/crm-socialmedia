"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  Banknote,
  CalendarDays,
  CircleCheck,
  FileText,
  KanbanSquare,
  ListTodo,
  Package,
  Plus,
  Settings,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ClientAvatar, ClientTag } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { searchWorkspace, type SearchResult } from "@/features/search/actions";
import { formatRelativeDay } from "@/lib/format";
import type { ShellClient } from "./shell-context";

const itemClass =
  "flex h-9 cursor-default items-center gap-2.5 rounded-md px-2 text-base text-ink select-none data-[selected=true]:bg-hover [&>svg]:size-4 [&>svg]:text-muted";
const groupClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted";

export function CommandPalette({
  open,
  onOpenChange,
  workspaceId,
  slug,
  clients,
  onNewTask,
  onNewDeliverable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  slug: string;
  clients: ShellClient[];
  onNewTask: () => void;
  onNewDeliverable: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ deliverables: [], tasks: [] });
  const [, startTransition] = useTransition();

  // Busca no servidor com pequeno atraso enquanto digita.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => {
      startTransition(async () => setResults(await searchWorkspace(workspaceId, query)));
    }, 180);
    return () => clearTimeout(t);
  }, [query, workspaceId]);

  const shown = query.trim().length < 2 ? { deliverables: [], tasks: [] } : results;
  const base = `/w/${slug}`;

  function run(fn: () => void) {
    onOpenChange(false);
    setQuery("");
    fn();
  }
  const go = (href: string) => run(() => router.push(href));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-[var(--overlay)]" />
        <DialogPrimitive.Content className="anim-pop fixed top-[12vh] left-1/2 z-50 w-[calc(100%-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-pop outline-none">
          <DialogPrimitive.Title className="sr-only">Buscar e executar ações</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Busque clientes, entregas e tarefas, ou escolha uma ação.
          </DialogPrimitive.Description>
          <Command label="Buscar" loop shouldFilter={true}>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar clientes, entregas, tarefas ou ações"
              className="h-12 w-full border-b border-border bg-transparent px-4 text-md outline-none placeholder:text-muted focus-visible:outline-none"
            />
            <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                Nada encontrado.
              </Command.Empty>

              <Command.Group heading="Ações" className={groupClass}>
                <Command.Item className={itemClass} onSelect={() => run(onNewTask)}>
                  <ListTodo />
                  <span className="flex-1">Nova tarefa</span>
                  <Kbd>C</Kbd>
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => run(onNewDeliverable)}>
                  <Plus />
                  <span className="flex-1">Nova entrega</span>
                  <Kbd>E</Kbd>
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/clientes/novo`)}>
                  <UserPlus />
                  Novo cliente
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Ir para" className={groupClass}>
                <Command.Item className={itemClass} onSelect={() => go(base)}>
                  <CircleCheck />
                  <span className="flex-1">Hoje</span>
                  <Kbd>G</Kbd>
                  <Kbd>H</Kbd>
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/clientes`)}>
                  <FileText />
                  <span className="flex-1">Clientes</span>
                  <Kbd>G</Kbd>
                  <Kbd>C</Kbd>
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/entregas`)}>
                  <KanbanSquare />
                  Entregas
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/calendario`)}>
                  <CalendarDays />
                  Calendário
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/financeiro`)}>
                  <Banknote />
                  Financeiro
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/pacotes`)}>
                  <Package />
                  Pacotes
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go(`${base}/configuracoes`)}>
                  <Settings />
                  Ajustes
                </Command.Item>
              </Command.Group>

              {clients.length ? (
                <Command.Group heading="Clientes" className={groupClass}>
                  {clients.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`cliente ${c.nome}`}
                      className={itemClass}
                      onSelect={() => go(`${base}/clientes/${c.id}`)}
                    >
                      <ClientAvatar name={c.nome} color={c.cor} />
                      {c.nome}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {shown.deliverables.length ? (
                <Command.Group heading="Entregas" className={groupClass}>
                  {shown.deliverables.map((d) => (
                    <Command.Item
                      key={d.id}
                      value={`entrega ${d.titulo ?? ""} ${d.id}`}
                      keywords={[query]}
                      className={itemClass}
                      onSelect={() => go(`${base}/clientes/${d.client_id}?aba=entregas&entrega=${d.id}`)}
                    >
                      <KanbanSquare />
                      <span className="min-w-0 flex-1 truncate">{d.titulo ?? "Sem título"}</span>
                      <ClientTag name={d.clientNome} color={d.cor} />
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {shown.tasks.length ? (
                <Command.Group heading="Tarefas" className={groupClass}>
                  {shown.tasks.map((t) => (
                    <Command.Item
                      key={t.id}
                      value={`tarefa ${t.titulo} ${t.id}`}
                      keywords={[query]}
                      className={itemClass}
                      onSelect={() => go(base)}
                    >
                      <ListTodo />
                      <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                      {t.due_date ? (
                        <span className="tabular text-sm text-muted">{formatRelativeDay(t.due_date)}</span>
                      ) : null}
                      {t.clientNome && t.cor !== null ? (
                        <ClientTag name={t.clientNome} color={t.cor} />
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
