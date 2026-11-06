import { NextResponse, type NextRequest } from "next/server";
import { chatgptOidcConfig, pkcePair } from "@/features/auth/chatgpt-oidc";
import { publicEnv } from "@/lib/env";

// Consentimento de uso do plano do ChatGPT (separado do login).
// TODO(oauth-setup): definir OPENAI_CHATGPT_USAGE_SCOPES com os escopos de uso da OpenAI
// e implementar /api/ai/chatgpt/callback (troca do code e gravação cifrada em ai_connections).
export async function GET(request: NextRequest) {
  const back = request.nextUrl.searchParams.get("back") ?? "/w";
  const config = chatgptOidcConfig();
  const scopes = process.env.OPENAI_CHATGPT_USAGE_SCOPES;
  if (!config || !scopes) return NextResponse.redirect(new URL(`${back}?erro=chatgpt`, request.nextUrl.origin));
  const { verifier, challenge, state } = pkcePair();
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", `${publicEnv.NEXT_PUBLIC_APP_URL}/api/ai/chatgpt/callback`);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  const res = NextResponse.redirect(url);
  res.cookies.set("chatgpt_uso", JSON.stringify({ verifier, state, back }), { httpOnly: true, sameSite: "lax", path: "/api/ai", maxAge: 600 });
  return res;
}
