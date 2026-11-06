"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { saveChecklist } from "../../hub-actions";

export type ChecklistView = { key: string; label: string; done: boolean; auto: boolean };

// Checklist de onboarding do cliente. Itens automáticos ficam marcados quando o dado existe.
export function OnboardingChecklist({
  workspaceId,
  clientId,
  items: initial,
}: {
  workspaceId: string;
  clientId: string;
  items: ChecklistView[];
}) {
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  const done = items.filter((i) => i.done).length;
  const missing = items.filter((i) => !i.done).map((i) => i.label.toLowerCase());

  function toggle(key: string, value: boolean) {
    const next = items.map((i) => (i.key === key ? { ...i, done: value } : i));
    setItems(next);
    start(async () => {
      const r = await saveChecklist({
        workspaceId,
        clientId,
        items: next.filter((i) => !i.auto).map(({ key, label, done }) => ({ key, label, done })),
      });
      if ("error" in r) {
        toast.error(r.error);
        setItems(items);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-inner border border-dashed border-border-dashed p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">Onboarding</span>
        <span className="tabular text-sm text-muted">
          {done} de {items.length}
        </span>
      </div>
      <ProgressBar value={done} max={items.length} label="Onboarding do cliente" />
      {missing.length ? <p className="text-sm text-muted">Falta: {missing.join(", ")}.</p> : <p className="text-sm text-ok-ink">Tudo pronto.</p>}
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.key}>
            <Checkbox
              label={<span className="text-base font-medium">{i.label}</span>}
              description={i.auto ? "Marcado sozinho quando acontece." : undefined}
              checked={i.done}
              disabled={i.auto}
              onChange={(e) => toggle(i.key, e.currentTarget.checked)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
