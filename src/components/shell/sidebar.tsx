"use client";

import {
  Banknote,
  CalendarDays,
  ChevronsUpDown,
  CircleCheck,
  KanbanSquare,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClientAvatar, UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { signOut } from "@/features/auth/actions";
import { planLabels, type PlanTier } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ShellClient } from "./shell-context";

type Workspace = { id: string; nome: string; slug: string; plano: PlanTier };

export function Sidebar({
  workspace,
  workspaces,
  clients,
  todayCount,
  user,
  collapsed,
  onToggleCollapse,
  onOpenPalette,
  onNavigate,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  clients: ShellClient[];
  todayCount: number;
  user: { nome: string; email: string };
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onOpenPalette: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/w/${workspace.slug}`;
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = [
    { href: base, label: "Hoje", icon: CircleCheck, exact: true, count: todayCount },
    { href: `${base}/entregas`, label: "Entregas", icon: KanbanSquare },
    { href: `${base}/calendario`, label: "Calendário", icon: CalendarDays },
    { href: `${base}/financeiro`, label: "Financeiro", icon: Banknote },
  ];
  const activeClients = clients.filter((c) => c.status !== "encerrado");

  return (
    <nav aria-label="Navegação principal" className="flex h-full flex-col gap-1 p-2 text-base">
      {/* Workspace */}
      <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-hover",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-semibold text-surface">
              {workspace.nome.slice(0, 1).toUpperCase()}
            </span>
            {collapsed ? (
              <span className="sr-only">{workspace.nome}</span>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate font-semibold">{workspace.nome}</span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted" aria-hidden />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((w) => (
              <DropdownMenuItem key={w.id} asChild>
                <Link href={`/w/${w.slug}`} onClick={onNavigate}>
                  <span className="flex size-5 items-center justify-center rounded bg-selected text-xs font-semibold">
                    {w.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{w.nome}</span>
                  <span className="text-xs text-muted">
                    {w.id === workspace.id ? "atual" : planLabels[w.plano]}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/w/novo" onClick={onNavigate}>
                <Plus />
                Criar workspace
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onToggleCollapse ? (
          <Tooltip content={collapsed ? "Expandir menu" : "Recolher menu"} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="rounded-md p-1.5 text-muted hover:bg-hover"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </Tooltip>
        ) : null}
      </div>

      <SideButton collapsed={collapsed} label="Buscar" icon={Search} onClick={onOpenPalette} kbd="⌘K" />

      <div className="mt-2 space-y-px">
        {nav.map((item) => (
          <SideLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href, item.exact)}
            collapsed={collapsed}
            onNavigate={onNavigate}
            trailing={item.count ? <span className="tabular text-xs text-muted">{item.count}</span> : null}
          />
        ))}
      </div>

      {/* Clientes */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div
          className={cn("flex items-center justify-between px-2 pb-1", collapsed && "justify-center px-0")}
        >
          {collapsed ? (
            <Tooltip content="Clientes" side="right">
              <Link
                href={`${base}/clientes`}
                onClick={onNavigate}
                className="rounded-md p-1.5 text-muted hover:bg-hover"
                aria-label="Clientes"
              >
                <Users className="size-4" />
              </Link>
            </Tooltip>
          ) : (
            <>
              <Link
                href={`${base}/clientes`}
                onClick={onNavigate}
                className="text-xs font-medium text-muted hover:text-ink"
              >
                Clientes
              </Link>
              <Tooltip content="Novo cliente">
                <Link
                  href={`${base}/clientes/novo`}
                  onClick={onNavigate}
                  aria-label="Novo cliente"
                  className="rounded p-0.5 text-muted hover:bg-hover hover:text-ink"
                >
                  <Plus className="size-3.5" />
                </Link>
              </Tooltip>
            </>
          )}
        </div>
        <ul className="min-h-0 flex-1 space-y-px overflow-y-auto">
          {activeClients.map((c) => {
            const href = `${base}/clientes/${c.id}`;
            const link = (
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-md px-2 text-ink hover:bg-hover aria-[current=page]:bg-selected",
                  collapsed && "justify-center px-0",
                )}
              >
                <ClientAvatar name={c.nome} color={c.cor} size="sm" />
                {collapsed ? (
                  <span className="sr-only">{c.nome}</span>
                ) : (
                  <span className="truncate">{c.nome}</span>
                )}
                {!collapsed && c.status === "pausado" ? (
                  <span className="ml-auto text-xs text-muted">pausado</span>
                ) : null}
              </Link>
            );
            return (
              <li key={c.id}>
                {collapsed ? (
                  <Tooltip content={c.nome} side="right">
                    {link}
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
          {activeClients.length === 0 && !collapsed ? (
            <li className="px-2 py-1 text-sm text-muted">Nenhum cliente ainda</li>
          ) : null}
        </ul>
      </div>

      <div className="space-y-px border-t border-border pt-2">
        <SideLink
          href={`${base}/pacotes`}
          label="Pacotes"
          icon={Package}
          active={isActive(`${base}/pacotes`)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <SideLink
          href={`${base}/configuracoes`}
          label="Ajustes"
          icon={Settings}
          active={isActive(`${base}/configuracoes`)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-hover",
              collapsed && "justify-center px-0",
            )}
          >
            <UserAvatar name={user.nome} size="sm" />
            {collapsed ? (
              <span className="sr-only">Conta</span>
            ) : (
              <span className="truncate text-sm">{user.nome}</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-60">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut />
                  Sair
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

function SideLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  trailing,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof CircleCheck;
  active: boolean;
  collapsed: boolean;
  trailing?: ReactNode;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-ink hover:bg-hover aria-[current=page]:bg-selected aria-[current=page]:font-medium",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="flex-1 truncate">{label}</span>
      )}
      {!collapsed ? trailing : null}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function SideButton({
  label,
  icon: Icon,
  onClick,
  collapsed,
  kbd,
}: {
  label: string;
  icon: typeof Search;
  onClick: () => void;
  collapsed: boolean;
  kbd?: string;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-muted hover:bg-hover",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">{label}</span> : <span className="flex-1">{label}</span>}
      {!collapsed && kbd ? <Kbd>{kbd}</Kbd> : null}
    </button>
  );
  return collapsed ? (
    <Tooltip content={label} side="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}
