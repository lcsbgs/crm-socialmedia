import type { Metadata } from "next";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Hoje" };

export default async function TodayPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const hoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted first-letter:uppercase">{hoje}</p>
      <h1 className="text-2xl font-semibold tracking-tight">Hoje em {workspace.nome}</h1>
      <p className="text-sm text-muted">Tarefas, entregas, reuniões e cobranças do dia aparecem aqui.</p>
    </div>
  );
}
