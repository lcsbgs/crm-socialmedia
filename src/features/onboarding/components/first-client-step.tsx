"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/checkbox";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveFirstClientStep } from "../actions";

type Person = { id: string; nome: string; convite?: boolean };

export function FirstClientStep({
  workspaceId,
  packages,
  people,
  mock,
}: {
  workspaceId: string;
  packages: { id: string; nome: string; resumo: string }[];
  people: Person[];
  mock: boolean;
}) {
  const [state, action] = useActionState(saveFirstClientStep, null);
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormAlert state={state} />
      <Card aria-labelledby="h-dados" className="flex flex-col gap-4">
        <h2 id="h-dados" className="font-display text-xl">
          Quem é
        </h2>
        <Field label="Nome da marca" name="marca" required errors={state?.fieldErrors?.marca} placeholder="Padaria Pão Quente" />
        <Field label="WhatsApp de quem aprova" name="aprovador" placeholder="(54) 99999-0000, Mariana" />
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-sm font-semibold">Pacote</legend>
          {packages.map((p, i) => (
            <RadioCard key={p.id} name="pacote" value={p.id} defaultChecked={i === 0} title={p.nome} description={p.resumo} />
          ))}
          <RadioCard
            name="pacote"
            value="novo"
            defaultChecked={packages.length === 0}
            title={packages.length ? "Criar o pacote Essencial" : "Essencial"}
            description="3 posts por semana, 1 reunião e 1 relatório por mês. Você ajusta depois em Pacotes."
          />
        </fieldset>
        {people.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Quem cuida desse cliente</legend>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <label
                  key={p.id}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-border bg-surface pr-3.5 pl-1.5 text-base has-[:checked]:border-accent has-[:checked]:bg-accent-tonal has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                >
                  <input type="checkbox" name={p.convite ? "convidado" : "responsavel"} value={p.id} defaultChecked className="sr-only" />
                  <UserAvatar name={p.nome} size="sm" />
                  {p.nome}
                  {p.convite ? <span className="text-muted">, convidada</span> : null}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </Card>
      <Card aria-labelledby="h-redes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="h-redes" className="font-display text-xl">
            Onde publica
          </h2>
          {mock ? <DemoBadge /> : null}
        </div>
        <p className="text-sm text-muted">
          Você conecta o Instagram e a página do Facebook na página do cliente, em Visão geral. Não achou a conta? Peça ao
          cliente para te adicionar como parceira no Meta Business.
        </p>
      </Card>
      <SubmitButton size="lg" className="self-end" pendingText="Montando o mês...">
        Montar o mês e abrir minha pauta
      </SubmitButton>
    </form>
  );
}
