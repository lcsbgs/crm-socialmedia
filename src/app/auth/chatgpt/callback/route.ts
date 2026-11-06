import { NextResponse, type NextRequest } from "next/server";
import { chatgptOidcConfig } from "@/features/auth/chatgpt-oidc";
import { signInVerifiedEmail } from "@/features/auth/session-bridge";
import { safeNext } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

// Retorno do login com ChatGPT: troca o code (PKCE), lê o e-mail verificado e abre a sessão do Supabase.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fail = NextResponse.redirect(new URL("/login?erro=provedor", origin));
  const config = chatgptOidcConfig();
  const raw = request.cookies.get("chatgpt_oauth")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!config || !raw || !code) return fail;

  let saved: { verifier: string; state: string; next: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return fail;
  }
  if (saved.state !== state) return fail;

  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/chatgpt/callback`,
      client_id: config.clientId,
      code_verifier: saved.verifier,
      ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
    }),
  });
  if (!tokenRes.ok) return fail;
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail;

  // TODO(oauth-setup): validar a assinatura do id_token (JWKS do emissor) além do userinfo.
  const infoRes = await fetch(config.userinfoUrl, { headers: { authorization: `Bearer ${tokens.access_token}` } });
  if (!infoRes.ok) return fail;
  const info = (await infoRes.json()) as { email?: string; email_verified?: boolean; name?: string };
  if (!info.email || info.email_verified === false) return fail;

  const result = await signInVerifiedEmail({ email: info.email, nome: info.name ?? info.email, provider: "chatgpt" });
  if (!result.ok) return fail;

  const res = NextResponse.redirect(new URL(safeNext(saved.next), origin));
  res.cookies.delete("chatgpt_oauth");
  return res;
}
