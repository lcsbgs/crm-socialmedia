"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { respondToPlan } from "../actions";

export function PortalPlan({
  token,
  plan,
  monthName,
}: {
  token: string;
  plan: { competencia: string; posts: { id: string; titulo: string; formato: string; data: string; pilar: string | null }[] };
  monthName: string;
}) {
  const [nome, setNome] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("pauta:portal:nome") ?? "";
    } catch {
      return "";
    }
  });
  const [ajuste, setAjuste] = useState(false);
  const [comentario, setComentario] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(decisao: "aprovado" | "ajuste") {
    setError(null);
    start(async () => {
      try {
        localStorage.setItem("pauta:portal:nome", nome);
      } catch {}
      const r = await respondToPlan({ token, competencia: plan.competencia, decisao, comentario, autorNome: nome });
      if (!r.ok) return void setError(r.error);
      setMsg(r.message);
    });
  }

  return (
    <section aria-labelledby="h-plano" className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <h2 id="h-plano" className="font-display text-xl">
        Planejamento de {monthName}
      </h2>
      <ol className="flex flex-col divide-y divide-border">
        {plan.posts.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <span className="tabular w-14 shrink-0 text-sm font-bold text-ink-2">{formatDate(p.data)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.titulo}</span>
              <span className="text-xs text-muted">{[p.formato, p.pilar].filter(Boolean).join(", ")}</span>
            </span>
          </li>
        ))}
      </ol>
      {msg ? (
        <p role="status" className="rounded-inner bg-ok-tonal px-4 py-3 text-sm font-semibold text-ok-ink">
          {msg}
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="nome-plano">Seu nome</Label>
            <Input id="nome-plano" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          </div>
          {ajuste ? (
            <div className="space-y-1.5">
              <Label htmlFor="coment-plano">O que quer mudar?</Label>
              <Textarea id="coment-plano" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-late">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            {ajuste ? (
              <Button className="flex-1" size="lg" disabled={pending || !nome.trim() || !comentario.trim()} onClick={() => send("ajuste")}>
                Enviar ajuste
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setAjuste(true)}>
                  Pedir ajuste
                </Button>
                <Button size="lg" className="flex-1" disabled={pending || !nome.trim()} onClick={() => send("aprovado")}>
                  Aprovar o mês
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
