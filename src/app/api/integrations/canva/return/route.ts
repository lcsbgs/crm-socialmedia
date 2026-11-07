import { NextResponse, type NextRequest } from "next/server";
import { saveDeliverableVersion } from "@/features/deliverables/detail-actions";
import { getIntegration } from "@/features/integrations/store";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { realCanva } from "@/lib/integrations/canva";
import { createClient } from "@/lib/supabase/server";

// Return navigation do Canva: "Voltar para o Pauta" exporta o design e o anexa como nova versão do post.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const state = request.nextUrl.searchParams.get("correlation_state") ?? "";
  const [slug, deliverableId, designId] = state.split(":");
  if (!slug || !deliverableId || !designId) return NextResponse.redirect(new URL("/w", origin));
  const back = new URL(`/w/${slug}/producao?entrega=${deliverableId}`, origin);
  try {
    const workspace = await getWorkspaceBySlug(slug);
    const conn = await getIntegration(workspace.id, "canva");
    if (!conn?.accessToken) return NextResponse.redirect(back);
    const urls = await realCanva.exportDesign(conn.accessToken, designId);
    const supabase = await createClient();
    const { data: d } = await supabase.from("deliverables").select("client_id, midia_urls").eq("id", deliverableId).single();
    if (!d) return NextResponse.redirect(back);
    const paths: string[] = [];
    for (const [i, u] of urls.entries()) {
      const blob = await fetch(u).then((r) => r.blob());
      const path = `${workspace.id}/${d.client_id}/${deliverableId}/canva-${designId.slice(0, 8)}-${Date.now()}-${i + 1}.png`;
      const { error } = await supabase.storage.from("midia").upload(path, blob, { contentType: "image/png" });
      if (!error) paths.push(path);
    }
    if (paths.length) {
      await supabase.from("deliverables").update({ midia_urls: paths }).eq("id", deliverableId);
      await saveDeliverableVersion({ workspaceId: workspace.id, id: deliverableId, origem: "canva" });
    }
  } catch {
    back.searchParams.set("erro", "canva");
  }
  return NextResponse.redirect(back);
}
