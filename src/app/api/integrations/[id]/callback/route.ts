import { NextResponse, type NextRequest } from "next/server";
import { oauthConfig } from "@/features/integrations/oauth-config";
import { saveIntegrationConnection } from "@/features/integrations/store";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { publicEnv } from "@/lib/env";

export async function GET(request: NextRequest, { params }: RouteContext<"/api/integrations/[id]/callback">) {
  const { id } = await params;
  const origin = request.nextUrl.origin;
  let saved: { verifier: string; state: string; slug: string; back: string };
  try {
    saved = JSON.parse(request.cookies.get(`oauth_${id}`)?.value ?? "");
  } catch {
    return NextResponse.redirect(new URL("/w", origin));
  }
  const fail = NextResponse.redirect(new URL(`${saved.back}?erro=${id}`, origin));
  const cfg = oauthConfig(id);
  const code = request.nextUrl.searchParams.get("code");
  if (!cfg || !code || request.nextUrl.searchParams.get("state") !== saved.state) return fail;
  if (id !== "google" && id !== "canva" && id !== "granola") return fail;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${publicEnv.NEXT_PUBLIC_APP_URL}/api/integrations/${id}/callback`,
    client_id: cfg.clientId,
    code_verifier: saved.verifier,
    ...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {}),
  });
  const res = await fetch(cfg.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) return fail;
  const t = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  if (!t.access_token) return fail;
  const workspace = await getWorkspaceBySlug(saved.slug);
  const r = await saveIntegrationConnection({
    workspaceId: workspace.id,
    provider: id,
    simulated: false,
    conta: null,
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? null,
    expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
    scopes: (t.scope ?? cfg.scope).split(/[ ,]+/).filter(Boolean),
  });
  if ("error" in r) return fail;
  const out = NextResponse.redirect(new URL(saved.back, origin));
  out.cookies.delete(`oauth_${id}`);
  return out;
}
