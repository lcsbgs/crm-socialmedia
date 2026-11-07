"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DemoBadge } from "@/components/ui/demo-badge";
import { toast } from "@/components/ui/toast";
import { assignAccountToClient } from "../actions";

type Account = { id: string; plataforma: string; nome: string; client_id: string | null; clientNome: string | null; simulated: boolean };

// Liga as contas descobertas da Meta a este cliente.
export function ClientAccounts({
  workspaceId,
  clientId,
  accounts,
  canManage,
  settingsHref,
}: {
  workspaceId: string;
  clientId: string;
  accounts: Account[];
  canManage: boolean;
  settingsHref: string;
}) {
  const [, start] = useTransition();
  if (!accounts.length) {
    return (
      <p className="text-sm text-muted">
        Nenhuma conta da Meta conectada.{" "}
        <Link href={settingsHref} className="font-semibold text-accent-tonal-ink underline">
          Conectar em Integrações
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {accounts.some((a) => a.simulated) ? <DemoBadge className="self-start" /> : null}
      {accounts.map((a) => {
        const mine = a.client_id === clientId;
        const other = a.client_id && !mine;
        return (
          <Checkbox
            key={a.id}
            checked={mine}
            disabled={!canManage}
            onChange={(e) => {
              const on = e.currentTarget.checked;
              start(async () => {
                const r = await assignAccountToClient({ workspaceId, accountId: a.id, clientId: on ? clientId : null });
                if ("error" in r) toast.error(r.error);
              });
            }}
            label={<span className="text-base font-semibold">{a.nome}</span>}
            description={`${a.plataforma === "instagram" ? "Instagram, conta profissional" : "Página do Facebook"}${other ? `, hoje ligada a ${a.clientNome}` : ""}`}
          />
        );
      })}
    </div>
  );
}
