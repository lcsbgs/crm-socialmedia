import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ClientForm } from "@/features/clients/components/client-form";
import { getPackages } from "@/features/packages/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewClientPage({ params }: PageProps<"/w/[slug]/clientes/novo">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const packages = await getPackages(workspace.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo cliente" />
      <Card>
        <ClientForm workspaceId={workspace.id} slug={slug} packages={packages} />
      </Card>
    </div>
  );
}
