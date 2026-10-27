"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cadenceLabels, type Cadence, type PackageItem } from "../schemas";

const inputClasses = "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm";

// Lista editável de itens do pacote. Envia tudo como JSON no campo "itens".
export function PackageItemsEditor({ initial, error }: { initial: PackageItem[]; error?: string }) {
  const [items, setItems] = useState<PackageItem[]>(
    initial.length ? initial : [{ tipo: "", quantidade: 1, cadencia: "semanal" }],
  );

  function update(index: number, patch: Partial<PackageItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium">Itens do pacote</legend>
      <input type="hidden" name="itens" value={JSON.stringify(items)} />
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_72px] gap-2 sm:grid-cols-[1fr_88px_160px_auto]">
          <input
            aria-label={`Tipo do item ${index + 1}`}
            placeholder="Ex.: Post, Reels, Stories"
            className={inputClasses}
            value={item.tipo}
            onChange={(e) => update(index, { tipo: e.target.value })}
          />
          <input
            aria-label={`Quantidade do item ${index + 1}`}
            type="number"
            min={1}
            max={50}
            className={inputClasses}
            value={item.quantidade}
            onChange={(e) => update(index, { quantidade: Number(e.target.value) })}
          />
          <select
            aria-label={`Frequência do item ${index + 1}`}
            className={inputClasses}
            value={item.cadencia}
            onChange={(e) => update(index, { cadencia: e.target.value as Cadence })}
          >
            {Object.entries(cadenceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            className="h-10"
            disabled={items.length === 1}
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
          >
            Remover
          </Button>
        </div>
      ))}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setItems((prev) => [...prev, { tipo: "", quantidade: 1, cadencia: "semanal" }])}
      >
        Adicionar item
      </Button>
    </fieldset>
  );
}
