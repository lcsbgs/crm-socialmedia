import { redirect } from "next/navigation";

// Rota antiga: a produção mora em /producao.
export default async function OldDeliverablesPage({ params, searchParams }: PageProps<"/w/[slug]/entregas">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  redirect(`/w/${slug}/producao${qs ? `?${qs}` : ""}`);
}
