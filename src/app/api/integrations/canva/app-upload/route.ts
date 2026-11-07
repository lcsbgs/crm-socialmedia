import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  appCode: z.string().min(16).max(80),
  postId: z.uuid(),
  urls: z.array(z.url()).min(1).max(10),
  title: z.string().max(200).optional(),
});

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" };

export function OPTIONS() {
  return new NextResponse(null, { headers: { ...cors, "access-control-allow-methods": "POST" } });
}

// Recebe a arte do app do Pauta no Canva. O código do app identifica a pessoa e o espaço;
// o post precisa ser do mesmo espaço e de um cliente a que ela tem acesso.
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400, headers: cors });
  const { appCode, postId, urls } = parsed.data;
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("integration_connections")
    .select("workspace_id, user_id")
    .eq("provider", "canva")
    .eq("status", "ativa")
    .filter("config->>app_code", "eq", appCode)
    .maybeSingle();
  if (!conn?.user_id) return NextResponse.json({ error: "Código do app inválido. Gere outro no Pauta." }, { status: 401, headers: cors });

  const { data: d } = await admin.from("deliverables").select("id, client_id, workspace_id").eq("id", postId).maybeSingle();
  if (!d || d.workspace_id !== conn.workspace_id) return NextResponse.json({ error: "Post não encontrado." }, { status: 404, headers: cors });
  const { data: member } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", d.workspace_id)
    .eq("user_id", conn.user_id)
    .maybeSingle();
  const { data: assigned } = await admin.from("client_assignees").select("user_id").eq("client_id", d.client_id).eq("user_id", conn.user_id).maybeSingle();
  if (!member || (member.role === "member" && !assigned)) return NextResponse.json({ error: "Sem acesso a este post." }, { status: 403, headers: cors });

  const paths: string[] = [];
  for (const [i, url] of urls.entries()) {
    if (!/^https:\/\/([a-z0-9-]+\.)*(canva\.com|canva-apps\.com|cloudfront\.net)\//.test(url)) continue;
    const blob = await fetch(url).then((r) => r.blob());
    const path = `${d.workspace_id}/${d.client_id}/${d.id}/canva-app-${Date.now()}-${i + 1}.png`;
    const { error } = await admin.storage.from("midia").upload(path, blob, { contentType: "image/png" });
    if (!error) paths.push(path);
  }
  if (!paths.length) return NextResponse.json({ error: "Não consegui baixar a arte do Canva." }, { status: 422, headers: cors });
  const { data: cur } = await admin.from("deliverables").select("versao_atual").eq("id", d.id).single();
  const numero = (cur?.versao_atual ?? 0) + 1;
  await admin.from("deliverables").update({ midia_urls: paths, versao_atual: numero }).eq("id", d.id);
  await admin.from("deliverable_versions").insert({
    workspace_id: d.workspace_id,
    deliverable_id: d.id,
    numero,
    midia_paths: paths,
    origem: "canva",
    criado_por: conn.user_id,
  });
  return NextResponse.json({ ok: true }, { headers: cors });
}
