"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClientPicker } from "@/components/shell/client-picker";
import { useShell } from "@/components/shell/shell-context";
import { buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatLabels } from "../schemas";

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return {
    params,
    href: (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete("entrega");
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    set(patch: Record<string, string | null>) {
      router.replace(this.href(patch), { scroll: false });
    },
  };
}

export function BoardFilters({
  members,
  showClient = true,
  showFormat = true,
  showMember = true,
}: {
  members: { id: string; nome: string }[];
  showClient?: boolean;
  showFormat?: boolean;
  showMember?: boolean;
}) {
  const { clients } = useShell();
  const p = useParamSetter();
  const cliente = p.params.get("cliente") ?? "";
  const formato = p.params.get("formato") ?? "";
  const responsavel = p.params.get("responsavel") ?? "";
  const active = !!(cliente || formato || responsavel);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showClient ? (
        <ClientPicker
          clients={clients}
          value={cliente}
          onChange={(v) => p.set({ cliente: v || null })}
          allowNone
          noneLabel="Todos os clientes"
          size="sm"
          className="w-44"
        />
      ) : null}
      {showFormat ? (
        <Select
          size="sm"
          aria-label="Formato"
          className="w-36"
          value={formato}
          onValueChange={(v) => p.set({ formato: v || null })}
          options={[
            { value: "", label: "Todos os formatos" },
            ...Object.entries(formatLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
      ) : null}
      {showMember ? (
        <Select
          size="sm"
          aria-label="Responsável"
          className="w-40"
          value={responsavel}
          onValueChange={(v) => p.set({ responsavel: v || null })}
          options={[
            { value: "", label: "Qualquer responsável" },
            { value: "ninguem", label: "Sem responsável" },
            ...members.map((m) => ({ value: m.id, label: m.nome })),
          ]}
        />
      ) : null}
      {active ? (
        <button
          type="button"
          onClick={() => p.set({ cliente: null, formato: null, responsavel: null })}
          className="inline-flex h-7 items-center gap-1 rounded-xl px-2 text-sm text-muted hover:bg-hover hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}

export function ViewSwitch({ views, current }: { views: { id: string; label: string }[]; current: string }) {
  const p = useParamSetter();
  return (
    <div
      role="tablist"
      aria-label="Visualização"
      className="inline-flex rounded-xl border border-border bg-surface p-0.5"
    >
      {views.map((v) => (
        <Link
          key={v.id}
          role="tab"
          aria-selected={current === v.id}
          href={p.href({ visao: v.id === views[0].id ? null : v.id })}
          scroll={false}
          className={cn(
            "rounded px-2.5 py-1 text-sm",
            current === v.id ? "bg-selected font-medium text-ink" : "text-muted hover:text-ink",
          )}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

export function PeriodNav({
  param,
  prev,
  next,
  todayValue,
  label,
}: {
  param: string;
  prev: string;
  next: string;
  todayValue: string;
  label: string;
}) {
  const p = useParamSetter();
  return (
    <div className="flex items-center gap-1">
      <Link
        href={p.href({ [param]: prev })}
        scroll={false}
        aria-label="Anterior"
        className={buttonClasses("ghost", "icon")}
      >
        <ChevronLeft aria-hidden />
      </Link>
      <Link
        href={p.href({ [param]: todayValue })}
        scroll={false}
        className={buttonClasses("secondary", "sm")}
      >
        Hoje
      </Link>
      <Link
        href={p.href({ [param]: next })}
        scroll={false}
        aria-label="Próximo"
        className={buttonClasses("ghost", "icon")}
      >
        <ChevronRight aria-hidden />
      </Link>
      <span className="ml-1 text-base font-medium">{label}</span>
    </div>
  );
}
