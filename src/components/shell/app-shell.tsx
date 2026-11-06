"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeliverableSheetHost } from "@/features/deliverables/components/deliverable-sheet";
import { NewDeliverableDialog } from "@/features/deliverables/components/new-deliverable-dialog";
import { NewTaskDialog } from "@/features/tasks/components/new-task-dialog";
import type { NotificationItem } from "@/features/notifications/queries";
import type { PlanTier } from "@/lib/labels";
import { CommandPalette } from "./command-palette";
import { ShellContext, type ShellClient } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

type Workspace = { id: string; nome: string; slug: string; plano: PlanTier };
type Defaults = { clientId?: string; date?: string };


function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const el = target;
  return (
    el.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    !!el.closest("[role=dialog]")
  );
}

export function AppShell({
  workspace,
  workspaces,
  clients,
  counts,
  team,
  canSeeFinance,
  notifications,
  user,
  children,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  clients: ShellClient[];
  counts: { today: number; approvals: number };
  team: { name: string }[];
  canSeeFinance: boolean;
  notifications: { items: NotificationItem[]; unread: number };
  user: { nome: string; email: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [newTask, setNewTask] = useState<Defaults | null>(null);
  const [newDeliverable, setNewDeliverable] = useState<Defaults | null>(null);
  const pendingG = useRef<number | null>(null);

  const openNewTask = useCallback((d?: Defaults) => setNewTask(d ?? {}), []);
  const openNewDeliverable = useCallback((d?: Defaults) => setNewDeliverable(d ?? {}), []);
  const base = `/w/${workspace.slug}`;

  // Atalhos globais: ⌘K e /, C, E, G+H, G+C.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (key === "h") return void (e.preventDefault(), router.push(base));
        if (key === "c") return void (e.preventDefault(), router.push(`${base}/clientes`));
        if (key === "p") return void (e.preventDefault(), router.push(`${base}/producao`));
        if (key === "a") return void (e.preventDefault(), router.push(`${base}/calendario`));
        if (key === "f") return void (e.preventDefault(), router.push(`${base}/financeiro`));
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1000);
        return;
      }
      if (key === "/") return void (e.preventDefault(), setPalette(true));
      if (key === "c") return void (e.preventDefault(), openNewTask());
      if (key === "e") return void (e.preventDefault(), openNewDeliverable());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [base, router, openNewTask, openNewDeliverable]);

  const ctx = useMemo(
    () => ({
      workspace: { id: workspace.id, nome: workspace.nome, slug: workspace.slug },
      clients,
      openPalette: () => setPalette(true),
      openNewTask,
      openNewDeliverable,
    }),
    [workspace.id, workspace.nome, workspace.slug, clients, openNewTask, openNewDeliverable],
  );

  const onNew = useCallback(
    (kind: "post" | "tarefa" | "cliente" | "reuniao") => {
      setDrawer(false);
      if (kind === "post") openNewDeliverable();
      else if (kind === "tarefa") openNewTask();
      else if (kind === "cliente") router.push(`${base}/clientes/novo`);
      else router.push(`${base}/reunioes?nova=1`);
    },
    [base, openNewDeliverable, openNewTask, router],
  );

  const sidebarProps = {
    workspace,
    workspaces,
    clients,
    counts,
    memberCount: Math.max(1, team.length),
    canSeeFinance,
    user,
    onNew,
  };

  return (
    <ShellContext value={ctx}>
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-dvh w-full">
          <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-border bg-surface lg:block">
            <Sidebar {...sidebarProps} />
          </aside>

          <DialogPrimitive.Root open={drawer} onOpenChange={setDrawer}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden" />
              <DialogPrimitive.Content className="anim-drawer fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-surface lg:hidden">
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Navegação do espaço</DialogPrimitive.Description>
                <Sidebar {...sidebarProps} onNavigate={() => setDrawer(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <div className="flex min-w-0 flex-1 flex-col gap-7 px-4 pt-4 pb-12 sm:px-7 sm:pt-7 xl:px-10">
            <Suspense fallback={<div className="h-11" />}>
              <TopBar
                slug={workspace.slug}
                workspaceId={workspace.id}
                notifications={notifications}
                team={team}
                onOpenPalette={() => setPalette(true)}
                onOpenMenu={() => setDrawer(true)}
              />
            </Suspense>
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>

        <CommandPalette
          open={palette}
          onOpenChange={setPalette}
          workspaceId={workspace.id}
          slug={workspace.slug}
          clients={clients.filter((c) => c.status !== "encerrado")}
          onNewTask={() => openNewTask()}
          onNewDeliverable={() => openNewDeliverable()}
        />
        <Suspense fallback={null}>
          <DeliverableSheetHost />
        </Suspense>
        <NewTaskDialog
          open={newTask !== null}
          onClose={() => setNewTask(null)}
          workspaceId={workspace.id}
          clients={clients}
          defaults={newTask ?? undefined}
        />
        <NewDeliverableDialog
          open={newDeliverable !== null}
          onClose={() => setNewDeliverable(null)}
          workspaceId={workspace.id}
          clients={clients}
          defaults={newDeliverable ?? undefined}
        />
      </TooltipProvider>
    </ShellContext>
  );
}
