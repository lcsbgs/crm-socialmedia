import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { InviteDialogButton } from "@/features/workspaces/components/invite-dialog";
import { TeamTable } from "@/features/workspaces/components/team-table";
import {
  getClientAssignments,
  getPendingInvitations,
  getWorkspaceBySlug,
  getWorkspaceMembers,
  getWorkspaceUsage,
} from "@/features/workspaces/queries";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { planLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Equipe" };


export default async function TeamSettingsPage({ params }: PageProps<"/w/[slug]/ajustes/equipe">) {
  const { slug } = await params;
  const [user, workspace] = await Promise.all([requireUser(), getWorkspaceBySlug(slug)]);
  const supabase = await createClient();
  const [usage, members, invitations, assignments, { data: clients }, { data: ws }] = await Promise.all([
    getWorkspaceUsage(workspace.id),
    getWorkspaceMembers(workspace.id),
    workspace.canManage ? getPendingInvitations(workspace.id) : Promise.resolve([]),
    getClientAssignments(workspace.id),
    supabase.from("clients").select("id, nome, cor").eq("workspace_id", workspace.id).neq("status", "encerrado").order("nome"),
    supabase.from("workspaces").select("ai_mode").eq("id", workspace.id).single(),
  ]);
  const { data: aiConns } = await supabase.rpc("workspace_ai_connections", { p_workspace_id: workspace.id });

  const max = usage?.max_members ?? 1;
  const free = Math.max(0, max - members.length);
  const clientList = (clients ?? []).map((c) => ({ ...c, cor: c.cor ?? 0 }));
  const teamMembers = members.map((m) => ({
    userId: m.user_id,
    nome: m.profile.nome || "Sem nome",
    email: m.profile.email,
    role: m.role,
    provider: m.profile.auth_provider,
    joinedAt: m.created_at,
    clientIds: assignments.filter((a) => a.user_id === m.user_id).map((a) => a.client_id),
    ai:
      ws?.ai_mode === "chatgpt" && (aiConns ?? []).some((c) => c.user_id === m.user_id && c.status === "ativa")
        ? "Plano ChatGPT"
        : "Créditos do Pauta",
  }));
  const invites = invitations.map((inv, i) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    link: `${publicEnv.NEXT_PUBLIC_APP_URL}/convite/${inv.token}`,
    clientIds: inv.client_ids ?? [],
    waiting: i >= free,
  }));
  const waiting = invites.filter((i) => i.waiting);

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Equipe"
        description={`Quem trabalha no ${workspace.nome} e o que cada pessoa vê.`}
        action={
          workspace.canManage ? (
            <InviteDialogButton workspaceId={workspace.id} clients={clientList}>
              <UserPlus aria-hidden />
              Convidar pessoa
            </InviteDialogButton>
          ) : null
        }
      />
      {usage ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-inner bg-surface px-[22px] py-4 text-md">
          <b>
            {members.length} de {max} {max === 1 ? "lugar" : "lugares"} do plano {planLabels[usage.plano]} em uso
          </b>
          {waiting.length ? (
            <span className="text-ink-2">
              {waiting.length === 1
                ? `O convite de ${waiting[0].email.split("@")[0]} fica esperando um lugar livre.`
                : `${waiting.length} convites ficam esperando lugar livre.`}
            </span>
          ) : null}
          {usage.plano !== "estudio" ? (
            <Link href={`/w/${slug}/ajustes/plano`} className="ml-auto font-semibold text-accent-tonal-ink underline">
              Ver plano {usage.plano === "free" ? "Pro" : "Estúdio"}
            </Link>
          ) : null}
        </div>
      ) : null}
      <Card>
        <TeamTable
          workspaceId={workspace.id}
          currentUserId={user.id}
          canManage={workspace.canManage}
          members={teamMembers}
          invites={invites}
          clients={clientList}
        />
      </Card>
      <Card aria-labelledby="h-ia-time">
        <CardHeader id="h-ia-time" title="IA da equipe" />
        <p className="text-md text-ink-2">
          Quem conecta o próprio ChatGPT usa o plano dele. Quem não conecta usa os créditos do estúdio. Veja o uso em{" "}
          <Link href={`/w/${slug}/ajustes/ia`} className="font-semibold text-accent-tonal-ink underline">
            IA e ChatGPT
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
