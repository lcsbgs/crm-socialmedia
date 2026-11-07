import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { brand } from "@/config/brand";
import { confirmMockIntegration } from "@/features/integrations/actions";
import { integrations, integrationScopes } from "@/features/integrations/catalog";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { isMockMode } from "@/lib/integrations/mode";

export const metadata: Metadata = { title: "Conectar (simulado)" };

// Tela de consentimento simulada de qualquer integração (modo demonstração).
export default async function MockConnectPage({ params, searchParams }: PageProps<"/w/[slug]/ajustes/integracoes/conectar/[id]">) {
  const [{ slug, id }, query] = await Promise.all([params, searchParams]);
  const item = integrations.find((i) => i.id === id);
  if (!item || !isMockMode()) notFound();
  const workspace = await getWorkspaceBySlug(slug);
  const back = typeof query.back === "string" && query.back.startsWith("/") ? query.back : `/w/${slug}/ajustes/integracoes`;
  return (
    <div className="mx-auto max-w-[460px] rounded-card bg-surface p-7">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-lg">{item.nome}</span>
        <DemoBadge />
      </div>
      <h1 className="font-display text-2xl">
        O {brand.name} quer acessar sua conta
      </h1>
      <p className="mt-2 text-md text-ink-2">Permissões pedidas:</p>
      <ul className="my-3 flex flex-col gap-1 text-sm text-ink-2">
        {(integrationScopes[item.id].length ? integrationScopes[item.id] : ["acesso à API da conta"]).map((s) => (
          <li key={s} className="rounded-lg bg-background px-3 py-1.5 font-mono text-xs">
            {s}
          </li>
        ))}
      </ul>
      <form action={confirmMockIntegration} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <input type="hidden" name="back" value={back} />
        <button type="submit" className={buttonClasses("primary", "lg")}>
          Permitir
        </button>
        <Link href={back} className={buttonClasses("ghost", "md")}>
          Cancelar
        </Link>
      </form>
      <p className="mt-4 text-xs text-muted">Conexão simulada: os dados que aparecem depois são de exemplo. Veja docs/oauth-setup.md para ligar a de verdade.</p>
    </div>
  );
}
