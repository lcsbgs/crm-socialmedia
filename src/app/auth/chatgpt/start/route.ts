import { NextResponse, type NextRequest } from "next/server";
import { chatgptOidcConfig, pkcePair } from "@/features/auth/chatgpt-oidc";
import { safeNext } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

// Início do login com ChatGPT: guarda verifier e state em cookie httpOnly e redireciona para a OpenAI.
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const config = chatgptOidcConfig();
  if (!config) return NextResponse.redirect(new URL(`/login?erro=provedor`, request.nextUrl.origin));

  const { verifier, challenge, state } = pkcePair();
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/chatgpt/callback`);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(url);
  res.cookies.set("chatgpt_oauth", JSON.stringify({ verifier, state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/chatgpt",
    maxAge: 600,
  });
  return res;
}
