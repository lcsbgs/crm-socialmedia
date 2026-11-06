"use client";

import { Toaster as Sonner, toast } from "sonner";

export { toast };

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        className:
          "!rounded-inner !border !border-border !bg-surface !text-ink !shadow-pop !font-sans !text-base",
      }}
    />
  );
}
