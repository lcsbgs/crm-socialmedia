import { Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientTag } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";
import { spDate, spTime } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reuniões" };

export default async function MeetingsPage({ params }: PageProps<"/w/[slug]/reunioes">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("id, titulo, data, ata_confirmada_em, client:clients!inner (id, nome, cor)")
    .eq("workspace_id", workspace.id)
    .order("data", { ascending: false })
    .limit(100);
  const now = new Date().toISOString();
  const all = data ?? [];
  const upcoming = all.filter((m) => m.data >= now).reverse();
  const past = all.filter((m) => m.data < now);

  const row = (m: (typeof all)[number]) => (
    <li key={m.id}>
      <Link
        href={`/w/${slug}/clientes/${m.client.id}/reunioes/${m.id}`}
        className="flex flex-wrap items-center gap-3 rounded-inner px-3 py-2.5 hover:bg-background"
      >
        <span className="w-24 shrink-0 font-display text-lg">{spTime(m.data)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{m.titulo}</span>
          <span className="text-sm text-muted">{formatDate(spDate(m.data), "long")}</span>
        </span>
        <ClientTag name={m.client.nome} color={m.client.cor ?? 0} />
        {m.ata_confirmada_em ? <Badge tone="success">ata confirmada</Badge> : null}
      </Link>
    </li>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reuniões"
        description="Para criar uma reunião, abra o cliente e use Nova reunião."
      />
      {all.length === 0 ? (
        <EmptyState icon={Video} title="Nenhuma reunião ainda" description="As reuniões com clientes aparecem aqui, com o brief e a ata." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="mb-2 font-display text-xl">Próximas</h2>
            {upcoming.length ? <ul>{upcoming.map(row)}</ul> : <p className="text-sm text-muted">Nada marcado.</p>}
          </Card>
          <Card>
            <h2 className="mb-2 font-display text-xl">Anteriores</h2>
            {past.length ? <ul>{past.map(row)}</ul> : <p className="text-sm text-muted">Nenhuma ainda.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
