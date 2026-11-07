"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { acceptProposalPublic, signContractPublic } from "../public-actions";

export function AcceptProposalForm({ token }: { token: string }) {
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (msg) return <p className="rounded-inner bg-ok-tonal p-4 text-md font-semibold text-ok-ink">{msg}</p>;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await acceptProposalPublic({ token, nome });
          if ("error" in r) setError(r.error ?? null);
          else setMsg("Proposta aceita. Em instantes você recebe o contrato para assinar.");
        });
      }}
    >
      <Label htmlFor="nome-aceite">Seu nome</Label>
      <Input id="nome-aceite" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
      {error ? <p role="alert" className="text-sm text-late">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending || !nome.trim()}>
        Aceitar proposta
      </Button>
    </form>
  );
}

export function SignContractForm({ token }: { token: string }) {
  const [nome, setNome] = useState("");
  const [ok, setOk] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) return <p className="rounded-inner bg-ok-tonal p-4 text-md font-semibold text-ok-ink">Contrato assinado. Bem-vindo! A equipe já foi avisada.</p>;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await signContractPublic({ token, nome, concordo: ok });
          if ("error" in r) setError(r.error ?? null);
          else setDone(true);
        });
      }}
    >
      <Label htmlFor="nome-ass">Nome completo de quem assina</Label>
      <Input id="nome-ass" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
      <Checkbox checked={ok} onChange={(e) => setOk(e.currentTarget.checked)} label="Li e concordo com o contrato" description="Registramos seu nome, a data e o IP desta assinatura." />
      {error ? <p role="alert" className="text-sm text-late">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending || !nome.trim() || !ok}>
        Assinar contrato
      </Button>
    </form>
  );
}

export function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled) setTimeout(() => window.print(), 400);
  }, [enabled]);
  return null;
}
