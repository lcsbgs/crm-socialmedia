"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "./button";

export function CopyButton({
  value,
  label = "Copiar link",
  ...props
}: ButtonProps & { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy} {...props}>
      <span aria-live="polite">{copied ? "Copiado" : label}</span>
    </Button>
  );
}
