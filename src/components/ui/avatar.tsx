import { clientColor } from "@/config/client-colors";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? ""))
  ).toUpperCase();
}

const sizes = {
  xs: "size-4 text-[9px]",
  sm: "size-5 text-[10px]",
  md: "size-7 text-xs",
  lg: "size-10 text-base",
};

// Avatar do cliente: iniciais sobre a cor do cliente.
export function ClientAvatar({
  name,
  color,
  size = "sm",
  className,
}: {
  name: string;
  color: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: clientColor(color) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

// Etiqueta do cliente: ponto colorido + nome.
export function ClientTag({ name, color, className }: { name: string; color: number; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-40 items-center gap-1.5 text-sm text-muted", className)}>
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-sm"
        style={{ backgroundColor: clientColor(color) }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function UserAvatar({ name, size = "md" }: { name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-selected font-medium text-ink",
        sizes[size],
      )}
    >
      {initials(name || "?")}
    </span>
  );
}
