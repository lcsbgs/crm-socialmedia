"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { savePackage } from "../actions";
import type { PackageItem } from "../schemas";
import { PackageItemsEditor } from "./package-items-editor";

export function PackageForm({
  workspaceId,
  slug,
  pkg,
}: {
  workspaceId: string;
  slug: string;
  pkg?: { id: string; nome: string; itens: PackageItem[]; preco?: number | null; limite_rodadas?: number };
}) {
  const [state, action] = useActionState(savePackage, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="slug" value={slug} />
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <Field
        label="Nome do pacote"
        name="nome"
        defaultValue={pkg?.nome}
        placeholder="Ex.: Essencial"
        required
        errors={state?.fieldErrors?.nome}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Preço por mês"
          name="preco"
          inputMode="decimal"
          placeholder="R$ 1.200"
          defaultValue={pkg?.preco ?? ""}
          errors={state?.fieldErrors?.preco}
          hint="Usado nas propostas. O valor de cada cliente fica na ficha dele."
        />
        <Field
          label="Rodadas de ajuste por post"
          name="limite_rodadas"
          type="number"
          min={0}
          max={10}
          defaultValue={pkg?.limite_rodadas ?? 2}
          errors={state?.fieldErrors?.limite_rodadas}
          hint="Passou disso, o Pauta sugere escopo extra."
        />
      </div>
      <PackageItemsEditor initial={pkg?.itens ?? []} error={state?.fieldErrors?.itens?.[0]} />
      <SubmitButton>{pkg ? "Salvar pacote" : "Criar pacote"}</SubmitButton>
    </form>
  );
}
