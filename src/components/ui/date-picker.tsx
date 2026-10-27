"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale/pt-BR";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeDay, todayISO } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromISO(v: string | null | undefined) {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDaysISO(iso: string, n: number) {
  const d = fromISO(iso)!;
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function Calendar({
  selected,
  onSelect,
}: {
  selected?: string | null;
  onSelect: (iso: string) => void;
}) {
  const date = fromISO(selected);
  return (
    <DayPicker
      mode="single"
      locale={ptBR}
      selected={date}
      defaultMonth={date}
      onSelect={(d) => d && onSelect(toISO(d))}
      showOutsideDays
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      classNames={{
        root: "p-2 text-sm",
        months: "relative",
        month_caption: "flex h-8 items-center px-2 font-medium first-letter:uppercase",
        caption_label: "first-letter:uppercase",
        nav: "absolute top-0 right-0 flex gap-1",
        button_previous:
          "inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-hover",
        button_next: "inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-hover",
        weekdays: "flex",
        weekday: "flex size-8 items-center justify-center text-xs text-muted",
        week: "flex",
        day: "size-8 p-0",
        day_button:
          "tabular flex size-8 items-center justify-center rounded-md text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent",
        selected: "[&>button]:bg-accent [&>button]:text-accent-ink [&>button]:hover:bg-accent",
        today: "[&>button]:font-semibold [&>button]:text-accent",
        outside: "text-muted/60",
        disabled: "opacity-40",
      }}
    />
  );
}

// Seletor de data com atalhos. Envia "YYYY-MM-DD" num input oculto (name).
export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Sem data",
  clearable = true,
  size = "md",
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  showRelative = false,
}: {
  id?: string;
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  showRelative?: boolean;
}) {
  const [inner, setInner] = useState<string | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const current = value !== undefined ? value : inner;

  function set(v: string | null) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
  }

  const today = todayISO();
  const shortcuts = [
    { label: "Hoje", value: today },
    { label: "Amanhã", value: addDaysISO(today, 1) },
    { label: "Próxima semana", value: addDaysISO(today, 7) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "inline-flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-left text-base hover:bg-hover focus-visible:border-accent focus-visible:outline-none aria-[invalid=true]:border-late",
          size === "sm" ? "h-7 text-sm" : "h-8",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />
        <span className={cn("tabular flex-1 truncate", !current && "text-muted")}>
          {current ? (showRelative ? formatRelativeDay(current) : formatDate(current, "long")) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex gap-1 border-b border-border p-2">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => set(s.value)}
              className="rounded-md px-2 py-1 text-sm hover:bg-hover"
            >
              {s.label}
            </button>
          ))}
          {clearable && current ? (
            <button
              type="button"
              onClick={() => set(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-hover"
            >
              <X className="size-3.5" aria-hidden />
              Limpar
            </button>
          ) : null}
        </div>
        <Calendar selected={current} onSelect={(v) => set(v)} />
      </PopoverContent>
    </Popover>
  );
}

// Data + hora (Brasília). Envia "YYYY-MM-DDTHH:MM".
export function DateTimePicker({
  id,
  name,
  defaultValue,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name: string;
  defaultValue: string;
  "aria-label"?: string;
}) {
  const [date, setDate] = useState<string | null>(defaultValue.slice(0, 10));
  const [time, setTime] = useState(defaultValue.slice(11, 16));
  const valid = /^\d{2}:\d{2}$/.test(time);
  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={date && valid ? `${date}T${time}` : ""} />
      <DatePicker id={id} value={date} onChange={setDate} clearable={false} aria-label={ariaLabel} />
      <input
        aria-label="Horário"
        inputMode="numeric"
        placeholder="14:00"
        maxLength={5}
        value={time}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
          setTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
        }}
        className="tabular h-8 w-20 shrink-0 rounded-md border border-border bg-surface px-2.5 text-base focus-visible:border-accent focus-visible:outline-none"
      />
    </div>
  );
}

const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Seletor de mês. Envia "YYYY-MM".
export function MonthPicker({
  name,
  defaultValue,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue: string;
  "aria-label"?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [year, setYear] = useState(Number(defaultValue.slice(0, 4)));
  const [open, setOpen] = useState(false);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}-01T00:00:00Z`),
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger
        aria-label={ariaLabel}
        className="inline-flex h-8 min-w-44 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-base hover:bg-hover"
      >
        <CalendarDays className="size-4 text-muted" aria-hidden />
        <span className="first-letter:uppercase">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Ano anterior"
            onClick={() => setYear((y) => y - 1)}
            className="rounded-md p-1.5 hover:bg-hover"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular text-sm font-medium">{year}</span>
          <button
            type="button"
            aria-label="Próximo ano"
            onClick={() => setYear((y) => y + 1)}
            className="rounded-md p-1.5 hover:bg-hover"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {months.map((m, i) => {
            const v = `${year}-${String(i + 1).padStart(2, "0")}`;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setValue(v);
                  setOpen(false);
                }}
                className={cn(
                  "h-8 rounded-md text-sm hover:bg-hover",
                  v === value && "bg-accent text-accent-ink hover:bg-accent",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
