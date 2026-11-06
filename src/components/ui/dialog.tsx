"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Diálogo centrado (no celular vira folha inferior).
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-[var(--overlay)]" />
        <DialogPrimitive.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            "anim-pop fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-card bg-surface shadow-pop outline-none",
            "sm:inset-x-auto sm:top-[12vh] sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-card",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 px-[22px] pt-5 pb-1">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-xl">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="rounded-full p-2 text-muted hover:bg-hover" aria-label="Fechar">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="px-[22px] pt-3 pb-[22px]">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Painel lateral à direita: detalhe sem trocar de página.
export function Sheet({
  open,
  onClose,
  title,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-[var(--overlay)] lg:bg-transparent" />
        <DialogPrimitive.Content className="anim-sheet fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-surface shadow-pop sm:rounded-l-card outline-none">
          <div className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-[22px]">
            <DialogPrimitive.Title className="min-w-0 truncate font-display text-lg">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Detalhe</DialogPrimitive.Description>
            <div className="flex items-center gap-1">
              {actions}
              <DialogPrimitive.Close
                className="rounded-full p-2 text-muted hover:bg-hover"
                aria-label="Fechar painel"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-[22px]">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Drawer: nome do design system para o painel lateral.
export { Sheet as Drawer };
