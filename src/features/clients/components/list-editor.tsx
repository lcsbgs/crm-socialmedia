"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type FieldDef<T> = { key: keyof T & string; label: string; placeholder?: string; type?: string };

const inputClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted";

// Editor genérico de lista (contatos, links). Serializa em JSON no campo `name`.
export function ListEditor<T extends Record<string, string>>({
  name,
  legend,
  fields,
  initial,
  empty,
  addLabel,
}: {
  name: string;
  legend: string;
  fields: FieldDef<T>[];
  initial: T[];
  empty: T;
  addLabel: string;
}) {
  const [items, setItems] = useState<T[]>(initial);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row">
          {fields.map((f) => (
            <input
              key={f.key}
              aria-label={`${f.label} ${index + 1}`}
              placeholder={f.placeholder ?? f.label}
              type={f.type ?? "text"}
              className={inputClasses}
              value={item[f.key] ?? ""}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((it, i) => (i === index ? { ...it, [f.key]: e.target.value } : it)),
                )
              }
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 shrink-0"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
          >
            Remover
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => setItems((prev) => [...prev, { ...empty }])}>
        {addLabel}
      </Button>
    </fieldset>
  );
}
