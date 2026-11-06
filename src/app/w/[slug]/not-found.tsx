import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-16">
      <h1 className="font-display text-xl">Workspace não encontrado</h1>
      <p className="text-sm text-muted">Ele não existe ou você não faz parte dele.</p>
      <Link href="/w" className={buttonClasses("secondary")}>
        Ir para meus workspaces
      </Link>
    </main>
  );
}
