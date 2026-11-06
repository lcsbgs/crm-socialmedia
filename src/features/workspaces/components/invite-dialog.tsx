"use client";

import { useActionState, useState, type ReactNode } from "react";
import { FormAlert } from "@/components/ui/alert";
import { ClientTag } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, SelectField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { inviteMember } from "../actions";

export function InviteDialogButton({
  workspaceId,
  clients,
  children,
}: {
  workspaceId: string;
  clients: { id: string; nome: string; cor: number }[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("member");
  const [state, action] = useActionState(inviteMember, null);
  const link = state?.data?.link;

  return (
    <>
      <Button onClick={() => setOpen(true)}>{children}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Convidar pessoa" description="O convite vale por 7 dias.">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <FormAlert state={state} />
          {link ? (
            <div className="flex flex-col gap-2 rounded-inner bg-background p-3 sm:flex-row sm:items-center">
              <code className="flex-1 truncate text-xs">{link}</code>
              <CopyButton value={link} />
            </div>
          ) : null}
          <Field label="E-mail" name="email" type="email" required errors={state?.fieldErrors?.email} />
          <SelectField
            label="Papel"
            name="role"
            value={role}
            onValueChange={setRole}
            hint={
              role === "admin"
                ? "Admin convida pessoas, vê financeiro e conecta contas."
                : "Membro trabalha nos clientes atribuídos, sem ver o financeiro."
            }
            options={[
              { value: "member", label: "Membro" },
              { value: "admin", label: "Admin" },
            ]}
          />
          {role === "member" && clients.length ? (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1 text-sm font-semibold">Clientes desta pessoa</legend>
              {clients.map((c) => (
                <Checkbox key={c.id} name="clientIds" value={c.id} label={<ClientTag name={c.nome} color={c.cor} />} />
              ))}
            </fieldset>
          ) : null}
          <SubmitButton pendingText="Convidando..." className="self-end">
            Enviar convite
          </SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
