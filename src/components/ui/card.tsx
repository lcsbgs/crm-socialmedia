import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Card de seção: fundo branco, raio 24, sem sombra.
export function Card({
  children,
  className,
  as: Tag = "section",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-card bg-surface p-[22px]", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  count,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  count?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id={id} className="font-display text-xl">
            {title}
          </h2>
          {count !== undefined ? <span className="text-sm text-muted">{count}</span> : null}
        </div>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

// Card interno (dentro de um card de seção): raio 16, fundo cinza claro.
export function InnerCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-inner bg-background p-3.5", className)}>{children}</div>;
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-lg">
      {children}
      {count !== undefined ? <span className="tabular font-sans text-sm font-normal text-muted">{count}</span> : null}
    </h2>
  );
}
