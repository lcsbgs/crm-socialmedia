"use client";

import { X } from "lucide-react";
import { useState } from "react";

// Campo de etiquetas: Enter ou vírgula adiciona; botão remove.
export function TagInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  tone = "accent",
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone?: "accent" | "late";
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim().replace(/,$/, "");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  }
  const cls = tone === "late" ? "bg-late-tonal text-late-ink" : "bg-accent-tonal text-accent-tonal-ink";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-input border border-border-input bg-surface px-2 py-1.5 focus-within:border-accent">
        {value.map((t) => (
          <span key={t} className={`inline-flex h-7 items-center gap-1 rounded-full pr-1 pl-2.5 text-sm font-semibold ${cls}`}>
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remover ${t}`} className="rounded-full p-0.5 hover:bg-black/5">
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? "" : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1.5 text-md outline-none"
        />
      </div>
    </div>
  );
}
