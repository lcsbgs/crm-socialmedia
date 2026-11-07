import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { ProposalEditor } from "@/features/sales/components/proposal-editor";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Proposta" };

export default async function ProposalPage({ params }: PageProps<"/w/[slug]/comercial/propostas/[id]">) {
  const { slug, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace.canManage) notFound();
  const supabase = await createClient();
  const [{ data: p }, { data: packages }, { data: views }, { data: contrato }] = await Promise.all([
    supabase.from("proposals").select("*, lead:leads!inner (nome, contato_nome, telefone)").eq("id", id).maybeSingle(),
    supabase.from("package_templates").select("id, nome, preco").eq("workspace_id", workspace.id).order("nome"),
    supabase.from("proposal_views").select("viewed_at").eq("proposal_id", id).order("viewed_at", { ascending: false }),
    supabase.from("contracts").select("status, token").eq("proposal_id", id).neq("status", "cancelado").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!p) notFound();
  return (
    <div className="flex flex-col gap-5">
      <Link href={`/w/${slug}/comercial`} className="text-sm text-muted hover:text-ink">
        Comercial
      </Link>
      <PageHeader title={p.titulo} description={p.lead.nome} />
      <ProposalEditor
        packages={packages ?? []}
        p={{
          ...p,
          workspaceId: workspace.id,
          url: `${publicEnv.NEXT_PUBLIC_APP_URL}/pr/${p.token}`,
          views: (views ?? []).map((v) => v.viewed_at),
          aceite: { nome: p.aceite_nome, em: p.aceita_em },
          contrato: contrato ? { status: contrato.status, url: `${publicEnv.NEXT_PUBLIC_APP_URL}/ct/${contrato.token}` } : null,
        }}
      />
    </div>
  );
}
