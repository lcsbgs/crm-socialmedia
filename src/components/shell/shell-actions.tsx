"use client";

import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useShell } from "./shell-context";

// Botões que abrem a criação rápida do shell (mesma ação dos atalhos C e E).
export function NewTaskButton({
  clientId,
  date,
  ...props
}: ButtonProps & { clientId?: string; date?: string }) {
  const { openNewTask } = useShell();
  return (
    <Button variant="outline" size="md" onClick={() => openNewTask({ clientId, date })} {...props}>
      <Plus aria-hidden />
      Nova tarefa
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
    <Button variant="primary" size="md" onClick={() => openNewDeliverable({ clientId, date })} {...props}>
      <Plus aria-hidden />
      Novo post
    </Button>
  );
}
