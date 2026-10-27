"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: ReactNode; textValue?: string };

// Valor vazio não é aceito pelo Radix; usamos um sentinela e traduzimos.
const EMPTY = "__vazio__";

export function Select({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Selecione",
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  size = "md",
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  size?: "sm" | "md";
}) {
  const toInner = (v: string | undefined) => (v === undefined ? undefined : v === "" ? EMPTY : v);
  // Input oculto próprio: o do Radix enviaria o sentinela no lugar de "".
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  return (
    <SelectPrimitive.Root
      // Sem opção vazia, "" faz o Radix mostrar o placeholder.
      value={current === "" && !options.some((o) => o.value === "") ? "" : toInner(current)}
      onValueChange={(v) => {
        const out = v === EMPTY ? "" : v;
        if (value === undefined) setInner(out);
        onValueChange?.(out);
      }}
      disabled={disabled}
    >
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 text-left text-base text-ink",
          "hover:bg-hover focus-visible:border-accent focus-visible:outline-none data-[placeholder]:text-muted disabled:opacity-60 aria-[invalid=true]:border-late",
          size === "sm" ? "h-7 text-sm" : "h-8",
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-muted" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="anim-pop z-50 max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface shadow-pop"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value || EMPTY}
                value={o.value === "" ? EMPTY : o.value}
                textValue={o.textValue}
                className="relative flex h-8 cursor-default items-center rounded-md pr-8 pl-2 text-base outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-hover"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-4 text-accent" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
