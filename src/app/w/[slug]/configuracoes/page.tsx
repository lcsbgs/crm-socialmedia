import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { revokeInvitation, removeMember } from "@/features/workspaces/actions";
import { DeleteWorkspaceForm } from "@/features/workspaces/components/danger-zone";
import { BrandForm } from "@/features/workspaces/components/brand-form";
import { InviteForm } from "@/features/workspaces/components/invite-form";
import { PlanCard } from "@/features/workspaces/components/plan-card";
import { RenameWorkspaceForm } from "@/features/workspaces/components/rename-form";
import {
  getPendingInvitations,
  getWorkspaceLogoUrl,
  getWorkspaceBySlug,
  getWorkspaceMembers,
  getWorkspaceUsage,
} from "@/features/workspaces/queries";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { plural } from "@/lib/format";
import { roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Configurações" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export default async function SettingsPage({ params }: PageProps<"/w/[slug]/configuracoes">) {
  const { slug } = await params;
  const [user, workspace] = await Promise.all([requireUser(), getWorkspaceBySlug(slug)]);
  const [usage, members, invitations] = await Promise.all([
    getWorkspaceUsage(workspace.id),
    getWorkspaceMembers(workspace.id),
    workspace.canManage ? getPendingInvitations(workspace.id) : Promise.resolve([]),
  ]);
  const isOwner = workspace.role === "owner";
  const logoUrl = await getWorkspaceLogoUrl(workspace.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold">Configurações</h1>

      <Card>
        <CardHeader title="Workspace" />
        <RenameWorkspaceForm
          workspaceId={workspace.id}
          nome={workspace.nome}
          disabled={!workspace.canManage}
        />
      </Card>

      <Card>
        <CardHeader
          title="Marca no portal"
          description="O logo aparece no topo do portal de aprovação dos seus clientes."
        />
        <BrandForm workspaceId={workspace.id} logoUrl={logoUrl} canEdit={workspace.canManage} />
      </Card>

      {usage ? <PlanCard usage={usage} canUpgrade={isOwner} /> : null}

      <Card>
        <CardHeader
          title="Equipe"
          description={`${plural(members.length, "pessoa", "pessoas")} neste workspace.`}
        />
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const isSelf = m.user_id === user.id;
            const canRemove = m.role !== "owner" && (workspace.canManage || isSelf);
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {m.profile.nome} {isSelf ? <span className="text-muted">(você)</span> : null}
                  </p>
                  <p className="text-xs text-muted">{roleLabels[m.role]}</p>
                </div>
                {canRemove ? (
                  <form action={removeMember}>
                    <input type="hidden" name="workspaceId" value={workspace.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {isSelf ? "Sair do workspace" : "Remover"}
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
            title="Convidar pessoas"
            description="Gere um link de convite e envie para a pessoa. Ele vale por 7 dias e só funciona para o e-mail informado."
          />
          <InviteForm
            workspaceId={workspace.id}
            atLimit={!!usage && usage.members + usage.pending_invitations >= usage.max_members}
          />
          {invitations.length ? (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium">Convites pendentes</h3>
              <ul className="divide-y divide-border">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{inv.email}</p>
                      <p className="text-xs text-muted">
                        {roleLabels[inv.role]} · expira em {dateFormat.format(new Date(inv.expires_at))}
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
            </div>
          ) : null}
        </Card>
      ) : null}

      {isOwner ? (
        <Card className="border-danger/40">
          <CardHeader
            title="Excluir workspace"
            description="Apaga o workspace e todos os dados dele para todos os membros. Não dá para desfazer."
          />
          <DeleteWorkspaceForm workspaceId={workspace.id} nome={workspace.nome} />
        </Card>
      ) : null}
    </div>
  );
}
