import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ClientTag, UserAvatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { signOut } from "@/features/auth/actions";
import { ProviderButton } from "@/features/auth/components/provider-buttons";
import { EmailAccess } from "@/features/auth/components/email-access";
import { AcceptInvitationForm } from "@/features/workspaces/components/accept-invitation-form";
import { tokenSchema } from "@/features/workspaces/schemas";
import { getSessionUser } from "@/lib/auth";
import { optionalServerEnv } from "@/lib/env.server";
import { isMockMode } from "@/lib/integrations/mode";
import { roleLabels } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Convite para a equipe" };

type Preview = {
  workspace_nome: string;
  convidado_por: string;
  email: string;
  role: "owner" | "admin" | "member";
  clientes: string[];
  expirado: boolean;
  aceito: boolean;
};

// A prévia passa pelo servidor (service role); sem a chave, só aparece depois do login.
async function loadPreview(token: string, logged: boolean): Promise<Preview | null> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return null;
  if (optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    const { data } = await createAdminClient().rpc("get_invitation_preview", { p_token: parsed.data }).maybeSingle();
    return data;
  }
  if (!logged) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: parsed.data }).maybeSingle();
  return data ? { ...data, convidado_por: "", clientes: [] } : null;
}

export default async function InvitationPage({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const path = `/convite/${token}`;
  const user = await getSessionUser();
  const invite = await loadPreview(token, !!user);

  const quem = invite?.convidado_por?.split(" ")[0];
  const pessoa = invite?.email.split("@")[0];
  const membro = invite?.role === "member";
  const problem = !invite
    ? null
    : invite.aceito
      ? "Este convite já foi usado."
      : invite.expirado
        ? "Este convite expirou. Peça um novo para quem convidou você."
        : user && invite.email.toLowerCase() !== user.email.toLowerCase()
          ? `Este convite foi enviado para ${invite.email}, mas você entrou como ${user.email}.`
          : null;

  return (
    <main className="flex min-h-dvh flex-wrap items-center justify-center gap-6 bg-background px-4 py-10">
      <Card aria-labelledby="h-conv" className="flex w-full max-w-[520px] flex-col gap-5 p-7">
        {invite ? (
          <>
            <div className="flex items-center">
              <UserAvatar name={invite.convidado_por || invite.workspace_nome} size="xl" ring />
              <UserAvatar name={pessoa ?? "?"} size="xl" ring className="-ml-4" />
            </div>
            <h1 id="h-conv" className="font-display text-3xl">
              {quem ? `${pessoa}, ${quem} te chamou para o ${invite.workspace_nome}` : `Convite para o ${invite.workspace_nome}`}
            </h1>
            <dl className="grid gap-3 text-md">
              <div>
                <dt className="text-sm text-muted">Seu papel</dt>
                <dd className="font-bold">{roleLabels[invite.role]}</dd>
              </div>
              {invite.clientes.length ? (
                <div>
                  <dt className="mb-1 text-sm text-muted">Seus clientes</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {invite.clientes.map((c, i) => (
                      <ClientTag key={c} name={c} color={i} />
                    ))}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm text-muted">Convite para</dt>
                <dd>{invite.email}</dd>
              </div>
            </dl>
            <p className="text-md text-ink-2">
              {membro
                ? `Você vai ver a pauta desses clientes, criar posts e falar com eles pelo link de aprovação.${quem ? ` O financeiro fica com ${quem}.` : ""}`
                : "Como admin, você vê todos os clientes, o financeiro e pode convidar pessoas."}
            </p>
          </>
        ) : (
          <>
            <h1 id="h-conv" className="font-display text-3xl">
              Você recebeu um convite
            </h1>
            <p className="text-md text-ink-2">Entre com o e-mail que recebeu o convite para ver os detalhes e participar.</p>
          </>
        )}
      </Card>

      <Card aria-labelledby="h-aceitar" className="flex w-full max-w-[420px] flex-col gap-4 p-7">
        <h2 id="h-aceitar" className="font-display text-xl">
          {user ? "Aceitar convite" : "Entre para aceitar"}
        </h2>
        {problem ? <Alert tone="error">{problem}</Alert> : null}
        {user ? (
          problem ? (
            <form action={signOut}>
              <button type="submit" className={buttonClasses("outline", "md") + " w-full"}>
                Entrar com outra conta
              </button>
            </form>
          ) : invite || user ? (
            <AcceptInvitationForm token={token} />
          ) : null
        ) : (
          <>
            {isMockMode() ? <DemoBadge className="self-start" /> : null}
            <ProviderButton provider="google" next={path} note="mesmo e-mail" />
            <ProviderButton provider="chatgpt" next={path} />
            <ProviderButton provider="apple" next={path} />
            <EmailAccess next={path} mode="entrar" allowPassword={process.env.NODE_ENV !== "production"} defaultEmail={invite?.email} />
          </>
        )}
        <p className="text-sm text-muted">
          Já tem conta no Pauta com seu próprio estúdio? Tudo bem: este espaço aparece junto dos seus, no seletor do topo.
        </p>
        {user ? (
          <Link href="/w" className="text-sm font-semibold text-muted underline">
            Ir para minha pauta
          </Link>
        ) : null}
      </Card>
    </main>
  );
}
