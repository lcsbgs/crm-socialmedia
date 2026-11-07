import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { AccountForm } from "@/features/settings/components/account-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minha conta" };

const providerText: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  chatgpt: "ChatGPT",
  "google-simulado": "Google (simulado)",
  "apple-simulado": "Apple (simulado)",
  "chatgpt-simulado": "ChatGPT (simulado)",
};

export default async function AccountPage({ params }: PageProps<"/w/[slug]/ajustes/conta">) {
  await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("nome, email, auth_provider, resumo_diario").eq("id", user.id).single();
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Minha conta" description="Seu nome, e-mail e forma de entrar." />
      <Card>
        <CardHeader title="Dados" description={`${p?.email ?? user.email}, entra com ${p?.auth_provider ? providerText[p.auth_provider] ?? p.auth_provider : "e-mail"}`} />
        <AccountForm nome={p?.nome ?? ""} resumoDiario={p?.resumo_diario ?? false} />
      </Card>
    </div>
  );
}
