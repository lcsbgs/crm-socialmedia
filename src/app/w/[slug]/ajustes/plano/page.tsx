import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlanCard } from "@/features/workspaces/components/plan-card";
import { getWorkspaceBySlug, getWorkspaceUsage } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Plano" };

export default async function PlanSettingsPage({ params }: PageProps<"/w/[slug]/ajustes/plano">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const usage = await getWorkspaceUsage(workspace.id);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Plano" description="Lugares da equipe, clientes e créditos de IA." />
      {usage ? <PlanCard usage={usage} canUpgrade={workspace.role === "owner"} /> : null}
    </div>
  );
}
