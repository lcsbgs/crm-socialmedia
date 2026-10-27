"use client";

import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ClientAvatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ShellClient } from "./shell-context";

// Seletor de cliente com busca (popover). Envia o id num input oculto.
export function ClientPicker({
  clients,
  name,
  value,
  onChange,
  allowNone = false,
  noneLabel = "Sem cliente",
  size = "md",
  className,
}: {
  clients: ShellClient[];
  name?: string;
  value: string;
  onChange: (id: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <PopoverTrigger
        aria-label="Cliente"
        className={cn(
          "inline-flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-left text-base hover:bg-hover",
          size === "sm" ? "h-7 text-sm" : "h-8",
          className,
        )}
      >
        {selected ? <ClientAvatar name={selected.nome} color={selected.cor} size="xs" /> : null}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>
          {selected?.nome ?? noneLabel}
        </span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command loop>
          <Command.Input
            placeholder="Buscar cliente"
            className="h-9 w-full border-b border-border bg-transparent px-3 text-base outline-none placeholder:text-muted focus-visible:outline-none"
          />
          <Command.List className="max-h-64 overflow-y-auto p-1">
            <Command.Empty className="px-2 py-3 text-sm text-muted">Nenhum cliente.</Command.Empty>
            {allowNone ? (
              <Command.Item
                value="__nenhum"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex h-8 items-center gap-2 rounded-md px-2 text-base data-[selected=true]:bg-hover"
              >
                <span className="flex-1 text-muted">{noneLabel}</span>
                {!value ? <Check className="size-4 text-accent" /> : null}
              </Command.Item>
            ) : null}
            {clients
              .filter((c) => c.status !== "encerrado")
              .map((c) => (
                <Command.Item
                  key={c.id}
                  value={c.nome}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className="flex h-8 items-center gap-2 rounded-md px-2 text-base data-[selected=true]:bg-hover"
                >
                  <ClientAvatar name={c.nome} color={c.cor} size="xs" />
                  <span className="flex-1 truncate">{c.nome}</span>
                  {c.id === value ? <Check className="size-4 text-accent" /> : null}
                </Command.Item>
              ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
