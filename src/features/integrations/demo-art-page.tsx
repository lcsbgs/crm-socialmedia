import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { isMockMode } from "@/lib/integrations/mode";
import { createClient } from "@/lib/supabase/server";
import { DemoArtStudio } from "./components/demo-art";
import { getIntegration } from "./store";

// Página comum do Canva e do Drive em modo demonstração.
export async function DemoArtPage({ slug, postId, origem }: { slug: string; postId: string | undefined; origem: "canva" | "drive" }) {
  if (!postId || !z.uuid().safeParse(postId).success) notFound();
  const workspace = await getWorkspaceBySlug(slug);
  const back = `/w/${slug}/producao?entrega=${postId}`;
  const conn = await getIntegration(workspace.id, origem === "canva" ? "canva" : "google");
  const here = `/w/${slug}/integracoes/${origem}?post=${postId}`;
  if (!conn) redirect(`/w/${slug}/ajustes/integracoes/conectar/${origem === "canva" ? "canva" : "google"}?back=${encodeURIComponent(here)}`);
  if (!conn.simulated || !isMockMode()) {
    // TODO(oauth-setup): no modo real, Canva abre pelo botão do editor (openCanva) e o Drive pelo Google Picker.
    redirect(back);
  }
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deliverables")
    .select("id, titulo, slot_label, formato, client:clients!inner (id, nome)")
    .eq("workspace_id", workspace.id)
    .eq("id", postId)
    .maybeSingle();
  if (!d) notFound();
  const { data: kit } = await supabase.from("brand_kits").select("cores").eq("client_id", d.client.id).maybeSingle();
  const cores = z.array(z.object({ hex: z.string() })).catch([]).parse(kit?.cores ?? []).map((c) => c.hex);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={origem === "canva" ? "Criar no Canva" : "Do Google Drive"} description={`${d.client.nome}, ${d.titulo ?? d.slot_label}`} />
      <DemoArtStudio
        workspaceId={workspace.id}
        clientId={d.client.id}
        deliverableId={d.id}
        titulo={d.titulo ?? d.slot_label ?? "Post"}
        cliente={d.client.nome}
        cores={cores}
        formato={d.formato}
        origem={origem}
        back={back}
      />
    </div>
  );
}
