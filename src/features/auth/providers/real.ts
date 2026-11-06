import "server-only";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { LoginProviderAdapter } from "./types";

// Login real.
// Google e Apple: provedores nativos do Supabase Auth (ativar em Authentication > Providers).
// ChatGPT (Sign in with ChatGPT, OAuth 2.0 + OIDC da OpenAI): fluxo no servidor com PKCE em
// /auth/chatgpt/start e /auth/chatgpt/callback, vinculando pelo e-mail verificado.
// Passo a passo de configuração em docs/oauth-setup.md.
export const realLoginAdapter: LoginProviderAdapter = {
  async start(provider, next) {
    if (provider === "chatgpt") {
      return { url: `/auth/chatgpt/start?next=${encodeURIComponent(next)}` };
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
        // Só o necessário para entrar.
        scopes: provider === "google" ? "openid email profile" : "name email",
      },
    });
    if (error || !data.url) return { error: "Não foi possível abrir o login. Tente de novo." };
    return { url: data.url };
  },
};
