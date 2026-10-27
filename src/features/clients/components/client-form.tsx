"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Field, SelectField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { saveClient } from "../actions";
import { clientStatusLabels, type ClientLink, type ClientStatus, type Contact } from "../schemas";
import { ListEditor } from "./list-editor";

export type ClientFormValues = {
  id: string;
  nome: string;
  segmento: string | null;
  briefing: string | null;
  tom_de_voz: string | null;
  status: ClientStatus;
  package_template_id: string | null;
  valor_mensal: number | null;
  dia_vencimento: number | null;
  inicio_contrato: string | null;
  contatos: Contact[];
  links: ClientLink[];
};

export function ClientForm({
  workspaceId,
  slug,
  packages,
  client,
}: {
  workspaceId: string;
  slug: string;
  packages: { id: string; nome: string }[];
  client?: ClientFormValues;
}) {
  const [state, action] = useActionState(saveClient, null);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-6">
      <FormAlert state={state} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="slug" value={slug} />
      {client ? <input type="hidden" name="id" value={client.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="nome" defaultValue={client?.nome} required errors={errors?.nome} />
        <Field
          label="Segmento"
          name="segmento"
          defaultValue={client?.segmento ?? ""}
          placeholder="Ex.: Alimentação"
        />
        <SelectField label="Status" name="status" defaultValue={client?.status ?? "ativo"}>
          {Object.entries(clientStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Pacote"
          name="package_template_id"
          defaultValue={client?.package_template_id ?? ""}
          hint="Define as tarefas recorrentes geradas todo mês."
        >
          <option value="">Sem pacote</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </SelectField>
        <Field
          label="Valor mensal (R$)"
          name="valor_mensal"
          inputMode="decimal"
          placeholder="1.500,00"
          defaultValue={client?.valor_mensal?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? ""}
          errors={errors?.valor_mensal}
        />
        <Field
          label="Dia de vencimento"
          name="dia_vencimento"
          type="number"
          min={1}
          max={31}
          defaultValue={client?.dia_vencimento ?? ""}
          errors={errors?.dia_vencimento}
        />
        <Field
          label="Início do contrato"
          name="inicio_contrato"
          type="date"
          defaultValue={client?.inicio_contrato ?? ""}
          errors={errors?.inicio_contrato}
        />
      </div>

      <TextareaField label="Briefing" name="briefing" defaultValue={client?.briefing ?? ""} />
      <TextareaField label="Tom de voz" name="tom_de_voz" rows={2} defaultValue={client?.tom_de_voz ?? ""} />

      <ListEditor<Contact>
        name="contatos"
        legend="Contatos"
        addLabel="Adicionar contato"
        initial={client?.contatos ?? []}
        empty={{ nome: "", cargo: "", telefone: "", email: "" }}
        fields={[
          { key: "nome", label: "Nome" },
          { key: "cargo", label: "Cargo" },
          { key: "telefone", label: "WhatsApp", placeholder: "11 99999-0000", type: "tel" },
          { key: "email", label: "E-mail", type: "email" },
        ]}
      />

      <ListEditor<ClientLink>
        name="links"
        legend="Links"
        addLabel="Adicionar link"
        initial={client?.links ?? []}
        empty={{ label: "", url: "" }}
        fields={[
          { key: "label", label: "Nome", placeholder: "Instagram" },
          { key: "url", label: "URL", placeholder: "https://", type: "url" },
        ]}
      />

      <SubmitButton>{client ? "Salvar alterações" : "Criar cliente"}</SubmitButton>
    </form>
  );
}
