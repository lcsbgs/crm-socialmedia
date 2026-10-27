"use client";

import { useEffect, useRef, type ReactNode } from "react";

// <dialog> nativo: foco preso, Esc fecha, acessível sem dependências.
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-xl bg-surface p-0 text-foreground backdrop:bg-black/40 sm:m-auto sm:max-w-2xl sm:rounded-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="dialog-title" className="font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-muted hover:bg-border/50"
        >
          Fechar
        </button>
      </div>
      <div className="max-h-[calc(92dvh-56px)] overflow-y-auto p-4">{open ? children : null}</div>
    </dialog>
  );
}
