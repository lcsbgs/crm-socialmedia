import type { Metadata } from "next";
import { DemoArtPage } from "@/features/integrations/demo-art-page";

export const metadata: Metadata = { title: "Google Drive" };

export default async function DrivePage({ params, searchParams }: PageProps<"/w/[slug]/integracoes/drive">) {
  const [{ slug }, q] = await Promise.all([params, searchParams]);
  return <DemoArtPage slug={slug} postId={typeof q.post === "string" ? q.post : undefined} origem="drive" />;
}
