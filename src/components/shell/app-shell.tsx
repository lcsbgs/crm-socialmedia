"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NewDeliverableDialog } from "@/features/deliverables/components/new-deliverable-dialog";
import { NewTaskDialog } from "@/features/tasks/components/new-task-dialog";
import type { PlanTier } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { ShellContext, type ShellClient } from "./shell-context";
import { Sidebar } from "./sidebar";

type Workspace = { id: string; nome: string; slug: string; plano: PlanTier };
type Defaults = { clientId?: string; date?: string };

export const SIDEBAR_COOKIE = "sidebar_recolhida";

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
  todayCount,
  user,
  initialCollapsed,
  children,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  clients: ShellClient[];
  todayCount: number;
  user: { nome: string; email: string };
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [newTask, setNewTask] = useState<Defaults | null>(null);
  const [newDeliverable, setNewDeliverable] = useState<Defaults | null>(null);
  const pendingG = useRef<number | null>(null);

  function toggleCollapsed() {
    setCollapsed((c) => {
      document.cookie = `${SIDEBAR_COOKIE}=${c ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
      return !c;
    });
  }

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
        if (key === "e") return void (e.preventDefault(), router.push(`${base}/entregas`));
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

  const sidebarProps = {
    workspace,
    workspaces,
    clients,
    todayCount,
    user,
    onOpenPalette: () => {
      setDrawer(false);
      setPalette(true);
    },
  };

  return (
    <ShellContext value={ctx}>
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-dvh">
          {/* Sidebar fixa (desktop) */}
          <aside
            className={cn(
              "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-background transition-[width] duration-150 lg:block",
              collapsed ? "w-14" : "w-60",
            )}
          >
            <Sidebar {...sidebarProps} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
          </aside>

          {/* Drawer (mobile) */}
          <DialogPrimitive.Root open={drawer} onOpenChange={setDrawer}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden" />
              <DialogPrimitive.Content className="anim-drawer fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-background lg:hidden">
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Navegação do workspace
                </DialogPrimitive.Description>
                <Sidebar {...sidebarProps} collapsed={false} onNavigate={() => setDrawer(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Barra superior só no mobile */}
            <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setDrawer(true)}
                className="rounded-md p-1.5 hover:bg-hover"
              >
                <Menu className="size-5" />
              </button>
              <span className="min-w-0 flex-1 truncate font-semibold">{workspace.nome}</span>
              <button
                type="button"
                aria-label="Buscar"
                onClick={() => setPalette(true)}
                className="rounded-md p-1.5 hover:bg-hover"
              >
                <Search className="size-5" />
              </button>
            </header>
            <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
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
