"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { saveAccount } from "../account-actions";

export function AccountForm({ nome, resumoDiario }: { nome: string; resumoDiario: boolean }) {
  const [n, setN] = useState(nome);
  const [r, setR] = useState(resumoDiario);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveAccount({ nome: n, resumoDiario: r });
          if ("error" in res) toast.error(res.error);
          else toast.success("Salvo.");
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="meu-nome">Seu nome</Label>
        <Input id="meu-nome" value={n} onChange={(e) => setN(e.target.value)} autoComplete="name" />
      </div>
      <Checkbox
        checked={r}
        onChange={(e) => setR(e.currentTarget.checked)}
        label="Receber o resumo do dia por e-mail"
        description="Às 7h, com as reuniões, posts e cobranças do dia de cada espaço."
      />
      <Button type="submit" disabled={pending} className="self-start">
        Salvar
      </Button>
    </form>
  );
}
