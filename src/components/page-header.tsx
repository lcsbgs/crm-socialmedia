import type { ReactNode } from "react";

// Cabeçalho de página: H1 em Bricolage Grotesque, descrição e ações à direita.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-3xl">{title}</h1>
        {description ? <p className="text-md text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
