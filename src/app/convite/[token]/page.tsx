import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { AcceptInvitationForm } from "@/features/workspaces/components/accept-invitation-form";
import { tokenSchema } from "@/features/workspaces/schemas";
import { getSessionUser } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Convite" };

export default async function InvitationPage({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const path = `/convite/${token}`;
  const user = await getSessionUser();

  if (!user) {
    return (
      <Shell>
        <h1 className="font-display text-xl">Você recebeu um convite</h1>
        <p className="text-sm text-muted">
          Entre ou crie sua conta com o e-mail que recebeu o convite para participar do workspace.
        </p>
        <div className="flex gap-3">
          <Link href={`/cadastro?next=${encodeURIComponent(path)}`} className={buttonClasses()}>
            Criar conta
          </Link>
          <Link href={`/login?next=${encodeURIComponent(path)}`} className={buttonClasses("secondary")}>
            Já tenho conta
          </Link>
        </div>
      </Shell>
    );
  }

  const parsed = tokenSchema.safeParse(token);
  const supabase = await createClient();
  const { data: invite } = parsed.success
    ? await supabase.rpc("get_invitation", { p_token: parsed.data }).maybeSingle()
    : { data: null };

  if (!invite) {
    return (
      <Shell>
        <h1 className="font-display text-xl">Convite não encontrado</h1>
        <Alert tone="error">Este link de convite é inválido. Peça um novo para quem convidou você.</Alert>
      </Shell>
    );
  }

  const problem = invite.aceito
    ? "Este convite já foi usado."
    : invite.expirado
      ? "Este convite expirou. Peça um novo para quem convidou você."
      : invite.email !== user.email.toLowerCase()
        ? `Este convite foi enviado para ${invite.email}, mas você entrou como ${user.email}.`
        : null;

  return (
    <Shell>
      <h1 className="font-display text-xl">Entrar em {invite.workspace_nome}</h1>
      <p className="text-sm text-muted">Você foi convidado como {roleLabels[invite.role].toLowerCase()}.</p>
      {problem ? <Alert tone="error">{problem}</Alert> : <AcceptInvitationForm token={token} />}
      <Link href="/w" className="text-sm text-muted hover:text-foreground">
        Ir para meus workspaces
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12">
      <p className="text-sm font-semibold">{brand.name}</p>
      {children}
    </main>
  );
}
