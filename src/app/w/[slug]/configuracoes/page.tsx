import { redirect } from "next/navigation";

// Rota antiga: os ajustes moram em /ajustes.
export default async function OldSettingsPage({ params }: PageProps<"/w/[slug]/configuracoes">) {
  const { slug } = await params;
  redirect(`/w/${slug}/ajustes/estudio`);
}
