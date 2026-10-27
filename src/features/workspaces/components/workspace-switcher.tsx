import Link from "next/link";
import { Menu } from "@/components/ui/menu";
import { planLabels, type PlanTier } from "@/lib/labels";

type Item = { id: string; nome: string; slug: string; plano: PlanTier };

export function WorkspaceSwitcher({ current, workspaces }: { current: Item; workspaces: Item[] }) {
  return (
    <Menu
      summaryClassName="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-border/50"
      summary={
        <>
          <span className="max-w-[40vw] truncate font-semibold sm:max-w-xs">{current.nome}</span>
          <span className="rounded bg-border/60 px-1.5 py-0.5 text-xs text-muted">
            {planLabels[current.plano]}
          </span>
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-muted transition group-open:rotate-180">
            <path
              fill="currentColor"
              d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
            />
          </svg>
          <span className="sr-only">Trocar de workspace</span>
        </>
      }
    >
      <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-border bg-surface p-1 shadow-lg">
        <p className="px-2 py-1.5 text-xs font-medium text-muted">Seus workspaces</p>
        <ul>
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <Link
                href={`/w/${ws.slug}`}
                aria-current={ws.id === current.id ? "page" : undefined}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-border/50 aria-[current=page]:font-medium"
              >
                <span className="truncate">{ws.nome}</span>
                {ws.id === current.id ? <span className="text-xs text-muted">atual</span> : null}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-border pt-1">
          <Link href="/w/novo" className="block rounded px-2 py-1.5 text-sm hover:bg-border/50">
            Criar workspace
          </Link>
        </div>
      </div>
    </Menu>
  );
}
