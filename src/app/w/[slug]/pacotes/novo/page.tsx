import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/features/packages/components/package-form";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Novo pacote" };

export default async function NewPackagePage({ params }: PageProps<"/w/[slug]/pacotes/novo">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo pacote" />
      <Card>
        <PackageForm workspaceId={workspace.id} slug={slug} />
      </Card>
    </div>
  );
}
