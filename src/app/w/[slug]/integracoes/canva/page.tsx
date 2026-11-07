import type { Metadata } from "next";
import { DemoArtPage } from "@/features/integrations/demo-art-page";

export const metadata: Metadata = { title: "Canva" };

export default async function CanvaPage({ params, searchParams }: PageProps<"/w/[slug]/integracoes/canva">) {
  const [{ slug }, q] = await Promise.all([params, searchParams]);
  return <DemoArtPage slug={slug} postId={typeof q.post === "string" ? q.post : undefined} origem="canva" />;
}
