import type { Metadata } from "next";
import Link from "next/link";
import { FirstClientForm } from "@/features/clients/components/first-client-form";
import { getPackages } from "@/features/packages/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Primeiros passos" };

export default async function GetStartedPage({ params }: PageProps<"/w/[slug]/comecar">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const packages = await getPackages(workspace.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl">Primeiros passos</h1>
        <p className="text-sm text-muted">
          Cadastre um cliente e o pacote de serviços dele. A partir disso, as entregas do mês são planejadas
          sozinhas.
        </p>
      </div>
      <FirstClientForm workspaceId={workspace.id} slug={slug} packages={packages} />
      <Link href={`/w/${slug}`} className="block text-center text-sm text-muted hover:text-foreground">
        Pular por agora
      </Link>
    </div>
  );
}
