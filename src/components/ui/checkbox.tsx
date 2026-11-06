import { Check } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Checkbox nativo (acessível por padrão) com aparência própria: quadrado de 22px, raio 7.
export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: ReactNode; description?: ReactNode }
>(function Checkbox({ label, description, className, ...props }, ref) {
  const box = (
    <span className="relative inline-flex size-[22px] shrink-0">
      <input
        ref={ref}
        type="checkbox"
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[7px] border-2 border-border-input bg-surface transition-colors checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute inset-0 m-auto size-3.5 text-white opacity-0 peer-checked:opacity-100"
      />
    </span>
  );
  if (!label) return <span className={className}>{box}</span>;
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      {box}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-md font-semibold">{label}</span>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </span>
    </label>
  );
});

// Cartão de opção (rádio): borda que vira violeta quando escolhido.
export function RadioCard({
  name,
  value,
  defaultChecked,
  checked,
  onChange,
  title,
  description,
  aside,
  className,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (value: string) => void;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-inner border-[1.5px] border-border bg-surface p-4 transition-colors hover:border-border-input",
        "has-[:checked]:border-accent has-[:checked]:bg-accent-tonal/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? () => onChange(value) : undefined}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-md font-bold">{title}</span>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </span>
      {aside ? <span className="shrink-0 text-sm font-semibold text-ink-2">{aside}</span> : null}
    </label>
  );
}
