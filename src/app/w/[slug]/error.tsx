"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-card bg-surface">
      <EmptyState
        title="Algo deu errado ao carregar esta tela"
        description="Pode ter sido uma instabilidade momentânea. Tente de novo."
        action={
          <Button variant="secondary" onClick={reset}>
            <RotateCw aria-hidden />
            Tentar de novo
          </Button>
        }
      />
    </div>
  );
}
