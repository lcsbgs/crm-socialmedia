import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { Menu } from "@/components/ui/menu";
import { signOut } from "@/features/auth/actions";
import type { PlanTier } from "@/lib/labels";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Item = { id: string; nome: string; slug: string; plano: PlanTier };

export function AppHeader({
  current,
  workspaces,
  userName,
}: {
  current: Item;
  workspaces: Item[];
  userName: string;
}) {
  const base = `/w/${current.slug}`;
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <WorkspaceSwitcher current={current} workspaces={workspaces} />
        <Menu
          summaryClassName="flex size-9 items-center justify-center rounded-full bg-border/60 text-sm font-medium"
          summary={
            <>
              <span aria-hidden>{userName.slice(0, 1).toUpperCase() || "?"}</span>
              <span className="sr-only">Menu da conta</span>
            </>
          }
        >
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-surface p-1 shadow-lg">
            <p className="truncate px-2 py-1.5 text-sm font-medium">{userName}</p>
            <Link
              href={`${base}/configuracoes`}
              className="block rounded px-2 py-1.5 text-sm hover:bg-border/50"
            >
              Configurações do workspace
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-border/50"
              >
                Sair
              </button>
            </form>
          </div>
        </Menu>
      </div>
      <nav aria-label="Principal" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
        <NavLink href={base} exact>
          Hoje
        </NavLink>
        <NavLink href={`${base}/clientes`}>Clientes</NavLink>
        <NavLink href={`${base}/pacotes`}>Pacotes</NavLink>
        <NavLink href={`${base}/configuracoes`}>Configurações</NavLink>
      </nav>
    </header>
  );
}
