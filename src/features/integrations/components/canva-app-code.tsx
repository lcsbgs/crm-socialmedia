"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { toast } from "@/components/ui/toast";
import { generateCanvaAppCode } from "../actions";

export function CanvaAppCode({ workspaceId }: { workspaceId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return code ? (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-lg bg-background px-2 py-1 text-xs">{code}</code>
      <CopyButton value={code} label="Copiar código" />
    </div>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await generateCanvaAppCode({ workspaceId });
          if ("error" in r) toast.error(r.error);
          else setCode(r.code ?? null);
        })
      }
    >
      Gerar código do app
    </Button>
  );
}
