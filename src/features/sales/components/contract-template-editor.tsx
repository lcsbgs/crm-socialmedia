"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { saveContractTemplate } from "../actions";

export function ContractTemplateEditor({ workspaceId, initial }: { workspaceId: string; initial: string }) {
  const [texto, setTexto] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <details className="rounded-card bg-surface p-[22px]">
      <summary className="cursor-pointer font-display text-lg">Modelo do contrato</summary>
      <p className="my-2 text-sm text-muted">
        Variáveis: {"{{cliente}} {{contato}} {{estudio}} {{pacote}} {{itens}} {{valor}} {{vencimento}} {{duracao}} {{inicio}} {{fim}} {{rodadas}} {{data}}"}
      </p>
      <Textarea aria-label="Modelo do contrato" rows={14} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <Button
        className="mt-3"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveContractTemplate({ workspaceId, texto });
            if ("error" in r) toast.error(r.error);
            else toast.success("Modelo salvo.");
          })
        }
      >
        Salvar modelo
      </Button>
    </details>
  );
}
