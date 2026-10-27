import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { deletePackage } from "@/features/packages/actions";
import { PackageForm } from "@/features/packages/components/package-form";
import { getPackage } from "@/features/packages/queries";
import { packageItemSchema } from "@/features/packages/schemas";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Pacote" };

export default async function PackagePage({ params }: PageProps<"/w/[slug]/pacotes/[id]">) {
  const { slug, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const workspace = await getWorkspaceBySlug(slug);
  const pkg = await getPackage(workspace.id, id);
  if (!pkg) notFound();

  const itens = z.array(packageItemSchema).catch([]).parse(pkg.itens);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={pkg.nome} description="Mudanças valem a partir do próximo mês gerado." />
      <Card>
        <PackageForm workspaceId={workspace.id} slug={slug} pkg={{ ...pkg, itens }} />
      </Card>
      <Card className="border-danger/40">
        <CardHeader
          title="Excluir pacote"
          description="Clientes que usam este pacote ficam sem pacote. Tarefas já geradas continuam."
        />
        <form action={deletePackage}>
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <input type="hidden" name="id" value={pkg.id} />
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit" variant="danger">
            Excluir pacote
          </Button>
        </form>
      </Card>
    </div>
  );
}
