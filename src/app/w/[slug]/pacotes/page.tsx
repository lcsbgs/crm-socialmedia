import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPackages } from "@/features/packages/queries";
import { describeItems } from "@/features/packages/schemas";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Pacotes" };

export default async function PackagesPage({ params }: PageProps<"/w/[slug]/pacotes">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const packages = await getPackages(workspace.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacotes"
        description="Modelos de serviço. Todo mês, cada item vira entregas planejadas no calendário do cliente."
        action={
          <Link href={`/w/${slug}/pacotes/novo`} className={buttonClasses()}>
            Novo pacote
          </Link>
        }
      />
      {packages.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nenhum pacote ainda.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {packages.map((p) => (
            <li key={p.id}>
              <Link
                href={`/w/${slug}/pacotes/${p.id}`}
                className="block h-full rounded-card bg-surface p-4 hover:bg-background"
              >
                <p className="font-medium">{p.nome}</p>
                <p className="mt-1 text-sm text-muted">{describeItems(p.itens)}</p>
                <p className="mt-2 text-xs text-muted">
                  {p.clientes === 0
                    ? "Nenhum cliente usando"
                    : `${plural(p.clientes, "cliente usando", "clientes usando")}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
