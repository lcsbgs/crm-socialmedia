import type { Metadata } from "next";
import Link from "next/link";
import { CreateWorkspaceForm } from "@/features/workspaces/components/workspace-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Novo workspace" };

export default async function NewWorkspacePage() {
  await requireUser("/w/novo");
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-12">
      <Link href="/w" className="text-sm text-muted hover:text-foreground">
        Voltar
      </Link>
      <div className="space-y-1">
        <h1 className="font-display text-xl">Novo workspace</h1>
        <p className="text-sm text-muted">
          Cada workspace tem seus próprios clientes, equipe e plano. Ideal para separar negócios diferentes.
        </p>
      </div>
      <CreateWorkspaceForm />
    </main>
  );
}
