import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { integrationScopes } from "@/features/integrations/catalog";
import { publicEnv } from "@/lib/env";

// Business Login for Instagram (contas sem página). TODO(oauth-setup): INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const back = request.nextUrl.searchParams.get("back") ?? `/w/${slug}/ajustes/integracoes`;
  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) return NextResponse.redirect(new URL(`${back}?erro=instagram`, request.nextUrl.origin));
  const state = randomBytes(16).toString("base64url");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", `${publicEnv.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", integrationScopes.instagram.join(","));
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.cookies.set("ig_oauth", JSON.stringify({ state, slug, back }), { httpOnly: true, sameSite: "lax", path: "/api/integrations", maxAge: 600 });
  return res;
}
