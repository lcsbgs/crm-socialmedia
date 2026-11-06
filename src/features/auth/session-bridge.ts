import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { optionalServerEnv } from "@/lib/env.server";

// Cria (se preciso) e abre a sessão de um usuário identificado por um provedor externo
// que já verificou o e-mail. Usado pelo login simulado e pelo fluxo real do ChatGPT.
//
// Com SUPABASE_SERVICE_ROLE_KEY: cria o usuário confirmado e abre a sessão com um link mágico
// gerado no servidor (sem senha). Sem a chave (só modo demonstração): usa uma senha derivada
// do e-mail com MOCK_AUTH_SECRET.
export async function signInVerifiedEmail({
  email,
  nome,
  provider,
}: {
  email: string;
  nome: string;
  provider: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const normalized = email.trim().toLowerCase();

  if (optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: { nome, provider },
    });
    if (created.error && created.error.code !== "email_exists") {
      return { ok: false, error: "Não foi possível criar a conta. Tente de novo." };
    }
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email: normalized });
    const hash = link.data?.properties?.hashed_token;
    if (link.error || !hash) return { ok: false, error: "Não foi possível abrir a sessão." };
    const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
    if (error) return { ok: false, error: "Não foi possível abrir a sessão." };
    await rememberProvider(provider);
    return { ok: true };
  }

  const secret = optionalServerEnv("MOCK_AUTH_SECRET") ?? "pauta-demonstracao-local";
  const password = createHmac("sha256", secret).update(normalized).digest("base64url").slice(0, 32);
  let signed = await supabase.auth.signInWithPassword({ email: normalized, password });
  if (signed.error) {
    const up = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { nome, provider } },
    });
    if (up.error) {
      return {
        ok: false,
        error:
          up.error.code === "user_already_exists"
            ? "Já existe uma conta com este e-mail. Entre pelo link no e-mail."
            : "Não foi possível criar a conta de teste.",
      };
    }
    if (!up.data.session) {
      return {
        ok: false,
        error: "Conta de teste criada, mas o Supabase pede confirmação de e-mail. Confirme pelo link enviado.",
      };
    }
    signed = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (signed.error) return { ok: false, error: "Não foi possível abrir a sessão de teste." };
  }
  await rememberProvider(provider);
  return { ok: true };
}

async function rememberProvider(provider: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.from("profiles").update({ auth_provider: provider }).eq("id", data.user.id);
}
