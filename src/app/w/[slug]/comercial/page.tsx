import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ContractTemplateEditor } from "@/features/sales/components/contract-template-editor";
import { Pipeline } from "@/features/sales/components/pipeline";
import { defaultContractTemplate } from "@/features/sales/contract-template";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Comercial" };

function renewalLimit() {
  return new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
}

export default async function SalesPage({ params }: PageProps<"/w/[slug]/comercial">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace.canManage) notFound();
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("contrato_modelo").eq("id", workspace.id).single();
  const [{ data: leads }, { data: proposals }, { data: views }, { data: renewals }] = await Promise.all([
    supabase.from("leads").select("*").eq("workspace_id", workspace.id).order("ordem"),
    supabase.from("proposals").select("id, lead_id, status, created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    supabase.from("proposal_views").select("proposal_id").eq("workspace_id", workspace.id),
    supabase
      .from("contracts")
      .select("id, fim, client:clients (id, nome)")
      .eq("workspace_id", workspace.id)
      .eq("status", "assinado")
      .lte("fim", renewalLimit())
      .order("fim"),
  ]);
  const leadViews = (leads ?? []).map((l) => {
    const p = proposals?.find((x) => x.lead_id === l.id);
    return {
      ...l,
      proposta: p ? { id: p.id, status: p.status, views: (views ?? []).filter((v) => v.proposal_id === p.id).length } : null,
    };
  });
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Comercial" description="Funil de leads, propostas e contratos. Arraste o lead entre as etapas." />
      {renewals?.length ? (
        <Card>
          <CardHeader title="Renovações chegando" />
          <ul className="flex flex-col gap-1.5 text-md">
            {renewals.map((r) => (
              <li key={r.id}>
                <b>{r.client?.nome}</b>: contrato vence em {r.fim ? formatDate(r.fim) : "breve"}.
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Pipeline workspaceId={workspace.id} slug={slug} leads={leadViews} />
      <ContractTemplateEditor workspaceId={workspace.id} initial={ws?.contrato_modelo || defaultContractTemplate} />
    </div>
  );
}
