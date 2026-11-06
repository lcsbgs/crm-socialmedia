import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

// Selo discreto para conexões simuladas (INTEGRATIONS_MODE=mock).
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Conexão simulada: os dados são de exemplo até a integração real ser configurada."
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border border-dashed border-border-dashed px-2 text-[11px] font-semibold text-muted",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      modo demonstração
    </span>
  );
}
