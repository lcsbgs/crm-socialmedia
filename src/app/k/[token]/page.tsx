import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ClientAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClientFileList } from "@/features/clients/components/hub/file-list";
import { optionalServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Kit da marca", robots: { index: false } };

const cores = z.array(z.object({ hex: z.string(), nome: z.string().default("") })).catch([]);

// Kit da marca só leitura, para designer ou fornecedor. Passa pelo servidor com service role.
export default async function BrandKitPage({ params }: PageProps<"/k/[token]">) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success || !optionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")) notFound();
  const admin = createAdminClient();
  const { data: kit } = await admin.rpc("get_brand_kit_public", { p_token: token }).maybeSingle();
  if (!kit) notFound();
  const { data: rows } = await admin
    .from("client_files")
    .select("id, nome, mime, tamanho, created_at, path")
    .eq("workspace_id", kit.workspace_id)
    .eq("client_id", kit.client_id)
    .eq("categoria", "marca")
    .order("created_at", { ascending: false });
  const files = rows ?? [];
  const signed = files.length ? ((await admin.storage.from("midia").createSignedUrls(files.map((f) => f.path), 3600)).data ?? []) : [];
  const fileViews = files.map((f, i) => ({ ...f, url: signed[i]?.signedUrl ?? null }));

  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <ClientAvatar name={kit.client_nome} color={kit.client_cor ?? 0} size="xl" />
          <div>
            <p className="text-sm text-muted">Kit da marca, por {kit.workspace_nome}</p>
            <h1 className="font-display text-3xl">{kit.client_nome}</h1>
          </div>
        </div>
        <section className="rounded-card bg-surface p-[22px]">
          <h2 className="mb-3 font-display text-xl">Cores</h2>
          <ul className="flex flex-wrap gap-3">
            {cores.parse(kit.cores).map((c) => (
              <li key={c.hex + c.nome} className="flex flex-col items-center gap-1.5">
                <span className="size-16 rounded-2xl border border-border" style={{ backgroundColor: c.hex }} />
                <span className="text-xs font-semibold">{c.nome || c.hex}</span>
                <span className="tabular text-xs text-muted">{c.hex}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-4 rounded-card bg-surface p-[22px] sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-display text-xl">Tom de voz</h2>
            <div className="flex flex-wrap gap-1.5">
              {kit.tom.map((t) => (
                <Badge key={t} tone="accent">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl">Nunca dizer</h2>
            <p className="text-md text-late-ink">{kit.evitar.map((e) => `"${e}"`).join(", ") || "Nada definido."}</p>
          </div>
          {kit.fontes ? (
            <div>
              <h2 className="mb-2 font-display text-xl">Fontes</h2>
              <p className="text-md">{kit.fontes}</p>
            </div>
          ) : null}
          {kit.observacoes ? (
            <div className="sm:col-span-2">
              <h2 className="mb-2 font-display text-xl">Observações</h2>
              <p className="text-md whitespace-pre-wrap">{kit.observacoes}</p>
            </div>
          ) : null}
        </section>
        <section className="rounded-card bg-surface p-[22px]">
          <h2 className="mb-3 font-display text-xl">Arquivos</h2>
          <ClientFileList workspaceId={kit.workspace_id} files={fileViews} readOnly />
        </section>
      </div>
    </main>
  );
}
