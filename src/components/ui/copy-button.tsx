"use client";

import { Copy } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { toast } from "./toast";

export function CopyButton({
  value,
  label = "Copiar link",
  ...props
}: ButtonProps & { value: string; label?: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }
  return (
    <Button variant="secondary" size="sm" onClick={copy} {...props}>
      <Copy aria-hidden />
      {label}
    </Button>
  );
}
