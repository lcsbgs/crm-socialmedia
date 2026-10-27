"use client";

import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useShell } from "./shell-context";

// Botões que abrem a criação rápida do shell (mesma ação dos atalhos C e E).
export function NewTaskButton({
  clientId,
  date,
  ...props
}: ButtonProps & { clientId?: string; date?: string }) {
  const { openNewTask } = useShell();
  return (
    <Button variant="secondary" size="sm" onClick={() => openNewTask({ clientId, date })} {...props}>
      <Plus aria-hidden />
      Nova tarefa
      <Kbd>C</Kbd>
    </Button>
  );
}

export function NewDeliverableButton({
  clientId,
  date,
  ...props
}: ButtonProps & { clientId?: string; date?: string }) {
  const { openNewDeliverable } = useShell();
  return (
    <Button variant="secondary" size="sm" onClick={() => openNewDeliverable({ clientId, date })} {...props}>
      <Plus aria-hidden />
      Nova entrega
      <Kbd>E</Kbd>
    </Button>
  );
}
