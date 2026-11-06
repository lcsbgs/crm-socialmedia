import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-inner border-[1.5px] border-dashed border-border-dashed text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-1 inline-flex size-11 items-center justify-center rounded-full bg-accent-tonal text-accent-tonal-ink">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-md font-bold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
