import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { integrationScopes } from "@/features/integrations/catalog";
import { publicEnv } from "@/lib/env";

// Facebook Login for Business. TODO(oauth-setup): META_APP_ID e META_CONFIG_ID.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const back = request.nextUrl.searchParams.get("back") ?? `/w/${slug}/ajustes/integracoes`;
  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(new URL(`${back}?erro=meta`, request.nextUrl.origin));
  const state = randomBytes(16).toString("base64url");
  const url = new URL(`https://www.facebook.com/${process.env.META_GRAPH_VERSION ?? "v23.0"}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", `${publicEnv.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (process.env.META_CONFIG_ID) url.searchParams.set("config_id", process.env.META_CONFIG_ID);
  else url.searchParams.set("scope", integrationScopes.meta.join(","));
  const res = NextResponse.redirect(url);
  res.cookies.set("meta_oauth", JSON.stringify({ state, slug, back }), { httpOnly: true, sameSite: "lax", path: "/api/integrations", maxAge: 600 });
  return res;
}
