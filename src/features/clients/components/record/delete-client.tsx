"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteClient } from "../../actions";

export function DeleteClientForm({
  workspaceId,
  clientId,
  slug,
  nome,
}: {
  workspaceId: string;
  clientId: string;
  slug: string;
  nome: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Excluir cliente
      </Button>
    );
  }
  return (
    <form action={deleteClient} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="id" value={clientId} />
      <input type="hidden" name="slug" value={slug} />
      <span className="text-sm">Excluir {nome} e todo o histórico?</span>
      <SubmitButton variant="danger" size="sm" pendingText="Excluindo">
        Sim, excluir
      </SubmitButton>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </form>
  );
}
