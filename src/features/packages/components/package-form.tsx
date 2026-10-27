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
  pkg?: { id: string; nome: string; itens: PackageItem[] };
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
      <PackageItemsEditor initial={pkg?.itens ?? []} error={state?.fieldErrors?.itens?.[0]} />
      <SubmitButton>{pkg ? "Salvar pacote" : "Criar pacote"}</SubmitButton>
    </form>
  );
}
