"use client";

import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Filter,
  KanbanSquare,
  LogOut,
  Plus,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ClientAvatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { planLabels, type PlanTier } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ShellClient } from "./shell-context";

type Workspace = { id: string; nome: string; slug: string; plano: PlanTier };

function TodayIcon(props: { className?: string }) {
  return <CalendarDays {...props} />;
}

export function Sidebar({
  workspace,
  workspaces,
  clients,
  counts,
  memberCount,
  canSeeFinance,
  user,
  onNew,
  onNavigate,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  clients: ShellClient[];
  counts: { today: number; approvals: number };
  memberCount: number;
  canSeeFinance: boolean;
  user: { nome: string; email: string };
  onNew: (kind: "post" | "tarefa" | "cliente" | "reuniao") => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/w/${workspace.slug}`;
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav: { href: string; label: string; icon: LucideIcon | typeof TodayIcon; exact?: boolean; count?: number; strong?: boolean }[] = [
    { href: base, label: "Em pauta hoje", icon: TodayIcon, exact: true, count: counts.today, strong: true },
    { href: `${base}/calendario`, label: "Calendário", icon: CalendarDays },
    { href: `${base}/producao`, label: "Produção", icon: KanbanSquare },
    { href: `${base}/aprovacoes`, label: "Aprovações", icon: Check, count: counts.approvals },
    { href: `${base}/reunioes`, label: "Reuniões", icon: Video },
    { href: `${base}/comercial`, label: "Comercial", icon: Filter },
    ...(canSeeFinance ? [{ href: `${base}/financeiro`, label: "Financeiro", icon: CreditCard }] : []),
    { href: `${base}/relatorios`, label: "Relatórios", icon: BarChart3 },
  ];
  const activeClients = clients.filter((c) => c.status !== "encerrado");
  const pessoas = memberCount === 1 ? "1 pessoa" : `${memberCount} pessoas`;

  return (
    <nav aria-label="Navegação principal" className="flex h-full flex-col gap-5 overflow-y-auto px-3.5 py-5">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-input border border-border bg-surface px-3 py-2.5 text-left hover:bg-hover">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent font-display text-[17px] font-extrabold text-white">
            {workspace.nome.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-bold">{workspace.nome}</span>
            <span className="truncate text-xs text-muted">
              Plano {planLabels[workspace.plano]}, {pessoas}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel>Seus espaços</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} asChild>
              <Link href={`/w/${w.slug}`} onClick={onNavigate}>
                <span className="flex size-6 items-center justify-center rounded-md bg-accent-tonal text-xs font-bold text-accent-tonal-ink">
                  {w.nome.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{w.nome}</span>
                <span className="text-xs text-muted">{w.id === workspace.id ? "atual" : planLabels[w.plano]}</span>
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/w/novo" onClick={onNavigate}>
              <Plus />
              Criar outro espaço
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
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

      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-11 items-center justify-center gap-2 rounded-full bg-accent text-base font-bold text-white hover:bg-accent-hover">
          <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden />
          Novo
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem onSelect={() => onNew("post")}>Post</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onNew("tarefa")}>Tarefa</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onNew("reuniao")}>Reunião</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onNew("cliente")}>Cliente</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ul className="flex flex-col gap-0.5">
        {nav.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              icon={item.icon}
              active={isActive(item.href, item.exact)}
              onNavigate={onNavigate}
              trailing={item.count ? <CountBadge strong={item.strong}>{item.count}</CountBadge> : null}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="flex min-h-0 flex-col gap-0.5">
        <div className="flex items-center justify-between px-3 pb-1.5">
          <Link href={`${base}/clientes`} onClick={onNavigate} className="text-xs font-semibold text-muted hover:text-ink">
            Clientes
          </Link>
          <Link
            href={`${base}/clientes/novo`}
            onClick={onNavigate}
            aria-label="Novo cliente"
            title="Novo cliente"
            className="rounded-md p-0.5 text-muted hover:bg-hover hover:text-ink"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>
        <ul className="flex flex-col gap-0.5">
          {activeClients.map((c) => {
            const href = `${base}/clientes/${c.id}`;
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive(href) ? "page" : undefined}
                  className="flex h-9 items-center gap-2.5 rounded-xl px-3 text-base text-ink hover:bg-hover aria-[current=page]:bg-accent-tonal aria-[current=page]:font-bold aria-[current=page]:text-accent-tonal-ink"
                >
                  <ClientAvatar name={c.nome} color={c.cor} size="sm" />
                  <span className="truncate">{c.nome}</span>
                  {c.status === "pausado" ? <span className="ml-auto text-xs text-muted">pausado</span> : null}
                </Link>
              </li>
            );
          })}
          {activeClients.length === 0 ? (
            <li className="px-3 py-1 text-sm text-muted">Nenhum cliente ainda</li>
          ) : null}
        </ul>
      </div>

      <ul className="mt-auto flex flex-col gap-0.5">
        <li>
          <NavLink href={`${base}/pacotes`} active={isActive(`${base}/pacotes`)} onNavigate={onNavigate} compact>
            Pacotes
          </NavLink>
        </li>
        <li>
          <NavLink href={`${base}/ajustes`} active={isActive(`${base}/ajustes`)} onNavigate={onNavigate} compact>
            Ajustes e integrações
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

function NavLink({
  href,
  icon: Icon,
  active,
  onNavigate,
  trailing,
  compact,
  children,
}: {
  href: string;
  icon?: LucideIcon | typeof TodayIcon;
  active: boolean;
  onNavigate?: () => void;
  trailing?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 text-base text-ink hover:bg-hover",
        compact ? "h-9" : "h-10",
        active && "bg-accent-tonal font-bold text-accent-tonal-ink hover:bg-accent-tonal",
      )}
    >
      {Icon ? (
        <Icon className={cn("size-[18px] shrink-0", active ? "text-accent-tonal-ink" : "text-muted")} aria-hidden />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </Link>
  );
}
