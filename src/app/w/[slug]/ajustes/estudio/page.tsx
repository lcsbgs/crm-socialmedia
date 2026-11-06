import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { DeleteWorkspaceForm } from "@/features/workspaces/components/danger-zone";
import { BrandForm } from "@/features/workspaces/components/brand-form";
import { RenameWorkspaceForm } from "@/features/workspaces/components/rename-form";
import { getWorkspaceBySlug, getWorkspaceLogoUrl } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Estúdio" };

export default async function StudioSettingsPage({ params }: PageProps<"/w/[slug]/ajustes/estudio">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const logoUrl = await getWorkspaceLogoUrl(workspace.id);
  const isOwner = workspace.role === "owner";

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Estúdio" description="Nome e marca que seus clientes veem nos links." />
      <Card>
        <CardHeader title="Nome do estúdio" />
        <RenameWorkspaceForm workspaceId={workspace.id} nome={workspace.nome} disabled={!workspace.canManage} />
      </Card>
      <Card>
        <CardHeader
          title="Logo"
          description="Aparece no link de aprovação, nas propostas e nos relatórios."
        />
        <BrandForm workspaceId={workspace.id} logoUrl={logoUrl} canEdit={workspace.canManage} />
      </Card>
      {isOwner ? (
        <Card>
          <CardHeader
            title="Excluir espaço"
            description="Apaga o espaço e todos os dados dele para toda a equipe. Não dá para desfazer."
          />
          <DeleteWorkspaceForm workspaceId={workspace.id} nome={workspace.nome} />
        </Card>
      ) : null}
    </div>
  );
}
