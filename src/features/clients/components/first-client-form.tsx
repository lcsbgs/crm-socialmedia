"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field, SelectField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PackageItemsEditor } from "@/features/packages/components/package-items-editor";
import { suggestedItems } from "@/features/packages/schemas";
import { setupFirstClient } from "../actions";

export function FirstClientForm({
  workspaceId,
  slug,
  packages,
}: {
  workspaceId: string;
  slug: string;
  packages: { id: string; nome: string }[];
}) {
  const [state, action] = useActionState(setupFirstClient, null);
  const [pacote, setPacote] = useState(packages[0]?.id ?? "novo");
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-6">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="contatos" value="[]" />
      <input type="hidden" name="links" value="[]" />

      <section className="space-y-4">
        <h2 className="font-medium">1. Seu primeiro cliente</h2>
        <Field label="Nome do cliente" name="nome" required errors={errors?.nome} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Valor mensal (R$)"
            name="valor_mensal"
            inputMode="decimal"
            placeholder="1.500,00"
            errors={errors?.valor_mensal}
          />
          <Field
            label="Dia de vencimento"
            name="dia_vencimento"
            type="number"
            min={1}
            max={31}
            defaultValue={10}
            errors={errors?.dia_vencimento}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">2. O que você entrega para ele</h2>
        <SelectField label="Pacote" name="pacote" value={pacote} onChange={(e) => setPacote(e.target.value)}>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
          <option value="novo">Criar um pacote novo</option>
          <option value="">Sem pacote por enquanto</option>
        </SelectField>
        {pacote === "novo" ? (
          <div className="space-y-4 rounded-md border border-border p-3">
            <Field
              label="Nome do pacote"
              name="pacote_nome"
              defaultValue="Essencial"
              required
              errors={errors?.nome}
            />
            <PackageItemsEditor initial={suggestedItems} error={errors?.itens?.[0]} />
          </div>
        ) : null}
      </section>

      <SubmitButton className="w-full" pendingText="Salvando...">
        Salvar e continuar
      </SubmitButton>
    </form>
  );
}
