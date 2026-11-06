"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveStudioStep } from "../actions";

export function StudioForm({
  workspaceId,
  nome,
  estudio,
  modo,
}: {
  workspaceId: string;
  nome: string;
  estudio: string;
  modo: string;
}) {
  const [state, action] = useActionState(saveStudioStep, null);
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormAlert state={state} />
      <Card className="flex flex-col gap-4">
        <Field label="Seu nome" name="nome" defaultValue={nome} autoComplete="name" required errors={state?.fieldErrors?.nome} />
        <Field
          label="Nome do estúdio ou agência"
          name="estudio"
          defaultValue={estudio}
          required
          hint="Aparece para os seus clientes no link de aprovação, nas propostas e nos relatórios."
          errors={state?.fieldErrors?.estudio}
        />
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-sm font-semibold">Você trabalha sozinha ou com alguém?</legend>
          <RadioCard name="modo" value="solo" defaultChecked={modo === "solo"} title="Só eu" description="Dá para chamar alguém depois." />
          <RadioCard name="modo" value="equipe" defaultChecked={modo === "equipe"} title="Com equipe" description="Designer, redatora, sócia, estagiária." />
          <RadioCard name="modo" value="agencia" defaultChecked={modo === "agencia"} title="Agência com 6 ou mais" description="A gente te mostra o plano Estúdio." />
        </fieldset>
      </Card>
      <Card aria-labelledby="h-convite" className="flex flex-col gap-4">
        <h2 id="h-convite" className="font-display text-xl">
          Chame quem trabalha com você
        </h2>
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1.5">
              <Label htmlFor={`convite-${i}`}>E-mail</Label>
              <Input id={`convite-${i}`} name="convite_email" type="email" placeholder={i ? "e-mail de mais alguém" : "nome@email.com"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`papel-${i}`}>Papel</Label>
              <select id={`papel-${i}`} name="convite_role" className="h-11 w-full rounded-input border border-border-input bg-surface px-3 text-md">
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        ))}
        <p className="text-sm text-muted">
          <b className="text-ink">Admin</b> convida pessoas, vê financeiro e conecta contas. <b className="text-ink">Membro</b>{" "}
          trabalha nos clientes atribuídos, sem ver o financeiro. O plano grátis é para 1 pessoa. Os convites ficam guardados e
          são liberados quando você escolher o Pro ou o Estúdio.
        </p>
      </Card>
      <SubmitButton size="lg" className="self-end" pendingText="Salvando...">
        Enviar convite e continuar
      </SubmitButton>
    </form>
  );
}
