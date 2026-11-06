import { cn } from "@/lib/utils";

// Barra de progresso simples (valor de 0 a max).
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: "accent" | "ok" | "late" | "today";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = { accent: "bg-accent", ok: "bg-ok", late: "bg-late", today: "bg-today-strong" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-hover", className)}
    >
      <div className={cn("h-full rounded-full transition-[width]", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Barra segmentada (ex.: pilares de conteúdo com percentuais).
export function SegmentedBar({
  segments,
  label,
}: {
  segments: { label: string; value: number; color: string }[];
  label: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-2">
      <div role="img" aria-label={label} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />
            {s.label} <span className="tabular font-semibold text-ink">{s.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
