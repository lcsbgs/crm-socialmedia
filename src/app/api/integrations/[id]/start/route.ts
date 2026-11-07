import { NextResponse, type NextRequest } from "next/server";
import { pkcePair } from "@/features/auth/chatgpt-oidc";
import { oauthConfig } from "@/features/integrations/oauth-config";
import { publicEnv } from "@/lib/env";

export async function GET(request: NextRequest, { params }: RouteContext<"/api/integrations/[id]/start">) {
  const { id } = await params;
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const back = request.nextUrl.searchParams.get("back") ?? `/w/${slug}/ajustes/integracoes`;
  const cfg = oauthConfig(id);
  if (!cfg) return NextResponse.redirect(new URL(`${back}?erro=${id}`, request.nextUrl.origin));
  const { verifier, challenge, state } = pkcePair();
  const url = new URL(cfg.authorize);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", `${publicEnv.NEXT_PUBLIC_APP_URL}/api/integrations/${id}/callback`);
  if (cfg.scope) url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  for (const [k, v] of Object.entries(cfg.extra)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.set(`oauth_${id}`, JSON.stringify({ verifier, state, slug, back }), { httpOnly: true, sameSite: "lax", path: "/api/integrations", maxAge: 600 });
  return res;
}
