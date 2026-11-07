import { NextResponse, type NextRequest } from "next/server";
import { integrationScopes } from "@/features/integrations/catalog";
import { saveMetaConnection } from "@/features/integrations/meta-store";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { publicEnv } from "@/lib/env";
import { metaAdapter } from "@/lib/integrations/meta";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  let saved: { state: string; slug: string; back: string };
  try {
    saved = JSON.parse(request.cookies.get("meta_oauth")?.value ?? "");
  } catch {
    return NextResponse.redirect(new URL("/w", origin));
  }
  const fail = NextResponse.redirect(new URL(`${saved.back}?erro=meta`, origin));
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.get("state") !== saved.state) return fail;
  const adapter = metaAdapter();
  if (!adapter) return fail;
  try {
    const workspace = await getWorkspaceBySlug(saved.slug);
    const token = await adapter.exchangeCode(code, `${publicEnv.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`);
    const accounts = await adapter.discoverAccounts(token.accessToken);
    const r = await saveMetaConnection({
      workspaceId: workspace.id,
      provider: "facebook",
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      simulated: adapter.simulated,
      contaNome: accounts.find((a) => a.plataforma === "facebook")?.nome ?? "Meta",
      accounts,
      scopes: integrationScopes.meta,
    });
    if ("error" in r) return fail;
  } catch {
    return fail;
  }
  const res = NextResponse.redirect(new URL(saved.back, origin));
  res.cookies.delete("meta_oauth");
  return res;
}
