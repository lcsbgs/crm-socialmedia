import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientTag } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { formatRelativeDay, formatRelativeTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aprovações" };

export default async function ApprovalsPage({ params }: PageProps<"/w/[slug]/aprovacoes">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliverables")
    .select("id, titulo, slot_label, formato, data_publicacao, status_changed_at, client:clients!inner (id, nome, cor)")
    .eq("workspace_id", workspace.id)
    .eq("status", "em_aprovacao")
    .order("status_changed_at");
  const items = data ?? [];
  const byClient = new Map<string, { client: (typeof items)[number]["client"]; posts: typeof items }>();
  for (const d of items) {
    const g = byClient.get(d.client.id) ?? { client: d.client, posts: [] };
    g.posts.push(d);
    byClient.set(d.client.id, g);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Aprovações" description="Posts esperando o ok dos clientes." />
      {byClient.size === 0 ? (
        <EmptyState icon={Check} title="Nada esperando aprovação" description="Quando você enviar posts para o cliente, eles aparecem aqui." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {[...byClient.values()].map(({ client, posts }) => (
            <Card key={client.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <ClientTag name={client.nome} color={client.cor ?? 0} />
                <Link href={`/w/${slug}/clientes/${client.id}`} className={buttonClasses("outline", "sm")}>
                  Enviar link de aprovação
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {posts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/w/${slug}/producao?entrega=${p.id}`} className="min-w-0">
                      <span className="block truncate font-semibold">{p.titulo || p.slot_label || "Post sem título"}</span>
                      <span className="block text-sm text-muted">
                        {p.data_publicacao ? `publica ${formatRelativeDay(p.data_publicacao)}` : "sem data"}
                      </span>
                    </Link>
                    <Badge tone="warning">enviado {formatRelativeTime(p.status_changed_at)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
