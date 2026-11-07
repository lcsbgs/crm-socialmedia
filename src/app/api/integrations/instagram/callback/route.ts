import { NextResponse, type NextRequest } from "next/server";
import { integrationScopes } from "@/features/integrations/catalog";
import { saveMetaConnection } from "@/features/integrations/meta-store";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { publicEnv } from "@/lib/env";

// Troca o code do Instagram por token de longa duração e registra a conta profissional.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  let saved: { state: string; slug: string; back: string };
  try {
    saved = JSON.parse(request.cookies.get("ig_oauth")?.value ?? "");
  } catch {
    return NextResponse.redirect(new URL("/w", origin));
  }
  const fail = NextResponse.redirect(new URL(`${saved.back}?erro=instagram`, origin));
  const code = request.nextUrl.searchParams.get("code");
  const appId = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!code || !appId || !secret || request.nextUrl.searchParams.get("state") !== saved.state) return fail;
  try {
    const short = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: appId,
        client_secret: secret,
        grant_type: "authorization_code",
        redirect_uri: `${publicEnv.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`,
        code,
      }),
    }).then((r) => r.json() as Promise<{ access_token?: string; user_id?: string | number }>);
    if (!short.access_token) return fail;
    const long = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${secret}&access_token=${short.access_token}`,
    ).then((r) => r.json() as Promise<{ access_token?: string; expires_in?: number }>);
    const token = long.access_token ?? short.access_token;
    const me = await fetch(`https://graph.instagram.com/me?fields=user_id,username,profile_picture_url&access_token=${token}`).then(
      (r) => r.json() as Promise<{ user_id?: string; username?: string; profile_picture_url?: string }>,
    );
    const workspace = await getWorkspaceBySlug(saved.slug);
    const r = await saveMetaConnection({
      workspaceId: workspace.id,
      provider: "instagram",
      accessToken: token,
      expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null,
      simulated: false,
      contaNome: me.username ? `@${me.username}` : "Instagram",
      accounts: [
        {
          plataforma: "instagram",
          externalId: String(me.user_id ?? short.user_id),
          nome: me.username ? `@${me.username}` : "Instagram",
          username: me.username,
          avatarUrl: me.profile_picture_url,
        },
      ],
      scopes: integrationScopes.instagram,
    });
    if ("error" in r) return fail;
  } catch {
    return fail;
  }
  return NextResponse.redirect(new URL(saved.back, origin));
}
