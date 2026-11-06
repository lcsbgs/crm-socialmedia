"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { ClientTag, UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { roleLabels } from "@/lib/labels";
import { changeMemberRole, removeMember, revokeInvitation, saveMemberClients } from "../actions";

type Client = { id: string; nome: string; cor: number };
export type TeamMember = {
  userId: string;
  nome: string;
  email: string | null;
  role: "owner" | "admin" | "member";
  provider: string | null;
  joinedAt: string;
  clientIds: string[];
  ai: string;
};
export type TeamInvite = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  link: string;
  clientIds: string[];
  waiting: boolean;
};

const providerText: Record<string, string> = {
  google: "entra com Google",
  apple: "entra com Apple",
  chatgpt: "entra com ChatGPT",
  "google-simulado": "entra com Google (simulado)",
  "apple-simulado": "entra com Apple (simulado)",
  "chatgpt-simulado": "entra com ChatGPT (simulado)",
};

function ClientsCell({ ids, clients, role }: { ids: string[]; clients: Client[]; role: TeamMember["role"] }) {
  if (role !== "member") return <span className="text-ink-2">Todos ({clients.length})</span>;
  const list = clients.filter((c) => ids.includes(c.id));
  if (!list.length) return <span className="text-muted">Nenhum</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((c) => (
        <ClientTag key={c.id} name={c.nome.split(" ")[0]} color={c.cor} />
      ))}
    </span>
  );
}

export function TeamTable({
  workspaceId,
  currentUserId,
  canManage,
  members,
  invites,
  clients,
}: {
  workspaceId: string;
  currentUserId: string;
  canManage: boolean;
  members: TeamMember[];
  invites: TeamInvite[];
  clients: Client[];
}) {
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function openEditor(m: TeamMember) {
    setEditing(m);
    setSelected(m.clientIds);
  }

  return (
    <>
      <div className="-mx-[22px] overflow-x-auto px-[22px]">
        <table className="w-full min-w-[720px] text-left text-base">
          <thead>
            <tr className="text-sm text-muted">
              <th scope="col" className="pb-3 font-semibold">Pessoa</th>
              <th scope="col" className="pb-3 font-semibold">Papel</th>
              <th scope="col" className="pb-3 font-semibold">Clientes</th>
              <th scope="col" className="pb-3 font-semibold">IA</th>
              <th scope="col" className="pb-3 text-right font-semibold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => {
              const self = m.userId === currentUserId;
              return (
                <tr key={m.userId}>
                  <td className="py-3.5 pr-3">
                    <span className="flex items-center gap-3">
                      <UserAvatar name={m.nome} size="lg" />
                      <span className="min-w-0">
                        <b className="block">
                          {m.nome} {self ? <span className="font-normal text-muted">(você)</span> : null}
                        </b>
                        <span className="block text-sm text-muted">
                          {[m.email, m.provider ? providerText[m.provider] : null].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3.5 pr-3">
                    {m.role === "owner" ? (
                      <Badge tone="today">Dona</Badge>
                    ) : canManage && !self ? (
                      <form action={changeMemberRole}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="userId" value={m.userId} />
                        <label className="sr-only" htmlFor={`papel-${m.userId}`}>
                          Papel de {m.nome}
                        </label>
                        <select
                          id={`papel-${m.userId}`}
                          name="role"
                          defaultValue={m.role}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="h-9 rounded-full border border-border-input bg-surface px-3 text-base"
                        >
                          <option value="member">Membro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </form>
                    ) : (
                      roleLabels[m.role]
                    )}
                  </td>
                  <td className="py-3.5 pr-3">
                    <ClientsCell ids={m.clientIds} clients={clients} role={m.role} />
                  </td>
                  <td className="py-3.5 pr-3">
                    <Badge tone={m.ai === "Plano ChatGPT" ? "neutral" : "accent"}>{m.ai}</Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    {(canManage && m.role !== "owner") || (self && m.role !== "owner") ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Mais opções para ${m.nome}`}
                          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-hover"
                        >
                          <MoreHorizontal className="size-[18px]" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManage && m.role === "member" ? (
                            <DropdownMenuItem onSelect={() => openEditor(m)}>Escolher clientes</DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onSelect={() => {
                              const fd = new FormData();
                              fd.set("workspaceId", workspaceId);
                              fd.set("userId", m.userId);
                              start(async () => void (await removeMember(fd)));
                            }}
                          >
                            {self ? "Sair do espaço" : "Remover do espaço"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {invites.map((inv) => (
              <tr key={inv.id}>
                <td className="py-3.5 pr-3">
                  <span className="flex items-center gap-3">
                    <UserAvatar name={inv.email} size="lg" />
                    <span className="min-w-0">
                      <b className="block truncate">{inv.email}</b>
                      <span className="block text-sm text-muted">
                        {inv.waiting ? "Convite esperando lugar no plano" : "Convite enviado, ainda não entrou"}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="py-3.5 pr-3">{roleLabels[inv.role]}</td>
                <td className="py-3.5 pr-3">
                  <ClientsCell ids={inv.clientIds} clients={clients} role={inv.role} />
                </td>
                <td className="py-3.5 pr-3 text-muted">Ainda não entrou</td>
                <td className="py-3.5 text-right">
                  <span className="inline-flex gap-1.5">
                    <CopyButton value={inv.link} label="Copiar link" />
                    {canManage ? (
                      <form action={revokeInvitation}>
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Revogar
                        </Button>
                      </form>
                    ) : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Clientes de ${editing.nome}` : ""}
        description="Membros só veem os clientes marcados aqui."
      >
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {clients.map((c) => (
            <Checkbox
              key={c.id}
              label={<ClientTag name={c.nome} color={c.cor} />}
              checked={selected.includes(c.id)}
              onChange={(e) =>
                setSelected((s) => (e.currentTarget.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))
              }
            />
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              editing &&
              start(async () => {
                const r = await saveMemberClients({ workspaceId, userId: editing.userId, clientIds: selected });
                if ("error" in r) toast.error(r.error);
                else {
                  toast.success("Clientes atualizados.");
                  setEditing(null);
                }
              })
            }
          >
            Salvar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
