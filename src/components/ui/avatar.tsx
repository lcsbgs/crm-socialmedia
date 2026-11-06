import { clientPalette } from "@/config/client-colors";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 1 || /[A-Za-zÀ-ÿ]/.test(p));
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

const squareSizes = {
  xs: "size-4 text-[8px] rounded-[4px]",
  sm: "size-[22px] text-[11px] rounded-[7px]",
  md: "size-8 text-xs rounded-[10px]",
  lg: "size-12 text-base rounded-[14px]",
  xl: "size-16 text-xl rounded-[18px]",
};

// Avatar do cliente: quadrado arredondado com iniciais sobre a cor do cliente.
export function ClientAvatar({
  name,
  color,
  size = "sm",
  className,
}: {
  name: string;
  color: number;
  size?: keyof typeof squareSizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: clientPalette(color).hex }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold text-white",
        squareSizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

// Ponto quadrado na cor do cliente.
export function ClientDot({ color, className }: { color: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)}
      style={{ backgroundColor: clientPalette(color).hex }}
    />
  );
}

// Etiqueta do cliente: fundo tonal e texto escuro na cor do cliente (raio 6).
export function ClientTag({
  name,
  color,
  className,
  variant = "tag",
}: {
  name: string;
  color: number;
  className?: string;
  variant?: "tag" | "dot";
}) {
  const p = clientPalette(color);
  if (variant === "dot") {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm text-ink-2", className)}>
        <ClientDot color={color} />
        <span className="truncate">{name}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center rounded-tag px-2 text-xs font-bold whitespace-nowrap",
        className,
      )}
      style={{ backgroundColor: p.tonal, color: p.ink }}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

// Cores de pessoas: determinísticas pelo nome.
const personTones = [
  { bg: "#FFC93C", fg: "#5A3D00" },
  { bg: "#C9EDE9", fg: "#0F5C58" },
  { bg: "#E3D8F8", fg: "#5A2FB0" },
  { bg: "#F9D4E7", fg: "#9C1F5E" },
  { bg: "#D6E2FB", fg: "#1F4BAF" },
  { bg: "#F7D9B9", fg: "#8A3A06" },
];

export function personTone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return personTones[h % personTones.length];
}

const circleSizes = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-14 text-lg",
};

export function UserAvatar({
  name,
  size = "md",
  online,
  ring,
  className,
}: {
  name: string;
  size?: keyof typeof circleSizes;
  online?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const t = personTone(name || "?");
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        circleSizes[size],
        ring && "border-2 border-background",
        className,
      )}
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      {(name || "?").trim().slice(0, 1).toUpperCase()}
      {online ? (
        <span className="absolute -right-px -bottom-px size-[11px] rounded-full border-2 border-background bg-ok" />
      ) : null}
    </span>
  );
}

// Pilha de avatares sobrepostos, com "+N" quando passa do limite.
export function AvatarStack({
  people,
  max = 3,
  size = "md",
  label,
}: {
  people: { name: string; online?: boolean }[];
  max?: number;
  size?: keyof typeof circleSizes;
  label?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span
      className="inline-flex items-center"
      role="img"
      aria-label={label ?? people.map((p) => p.name).join(", ")}
    >
      {shown.map((p, i) => (
        <UserAvatar key={`${p.name}-${i}`} name={p.name} online={p.online} size={size} ring className={i ? "-ml-2.5" : ""} />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "-ml-2.5 inline-flex items-center justify-center rounded-full border-2 border-background bg-hover font-bold text-ink-2",
            circleSizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
