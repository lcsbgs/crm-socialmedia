import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { revokeInvitation, removeMember } from "@/features/workspaces/actions";
import { InviteForm } from "@/features/workspaces/components/invite-form";
import {
  getPendingInvitations,
  getWorkspaceBySlug,
  getWorkspaceMembers,
  getWorkspaceUsage,
} from "@/features/workspaces/queries";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Equipe" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export default async function TeamSettingsPage({ params }: PageProps<"/w/[slug]/ajustes/equipe">) {
  const { slug } = await params;
  const [user, workspace] = await Promise.all([requireUser(), getWorkspaceBySlug(slug)]);
  const [usage, members, invitations] = await Promise.all([
    getWorkspaceUsage(workspace.id),
    getWorkspaceMembers(workspace.id),
    workspace.canManage ? getPendingInvitations(workspace.id) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="Equipe" description={`Quem trabalha no ${workspace.nome} e o que cada pessoa vê.`} />
      <Card>
        <CardHeader title="Pessoas" count={members.length} />
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const isSelf = m.user_id === user.id;
            const canRemove = m.role !== "owner" && (workspace.canManage || isSelf);
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-base font-bold">
                    {m.profile.nome} {isSelf ? <span className="font-normal text-muted">(você)</span> : null}
                  </p>
                  <p className="text-sm text-muted">{roleLabels[m.role]}</p>
                </div>
                {canRemove ? (
                  <form action={removeMember}>
                    <input type="hidden" name="workspaceId" value={workspace.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <Button type="submit" variant="outline" size="sm">
                      {isSelf ? "Sair do espaço" : "Remover"}
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
      {workspace.canManage ? (
        <Card>
          <CardHeader
            title="Convidar pessoa"
            description="O link vale por 7 dias e só funciona para o e-mail informado."
          />
          <InviteForm
            workspaceId={workspace.id}
            atLimit={!!usage && usage.members + usage.pending_invitations >= usage.max_members}
          />
          {invitations.length ? (
            <ul className="mt-6 divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-base">{inv.email}</p>
                    <p className="text-sm text-muted">
                      {roleLabels[inv.role]}, expira em {dateFormat.format(new Date(inv.expires_at))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <CopyButton value={`${publicEnv.NEXT_PUBLIC_APP_URL}/convite/${inv.token}`} />
                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Revogar
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
