import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const icons = { error: CircleAlert, success: CircleCheck, info: Info };
const iconColor = { error: "text-late", success: "text-ok", info: "text-muted" };

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-inner border border-border bg-surface px-3.5 py-2.5 text-sm",
        className,
      )}
    >
      <Icon className={cn("mt-px size-4 shrink-0", iconColor[tone])} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function FormAlert({ state }: { state: { error?: string; message?: string } | null | undefined }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}
