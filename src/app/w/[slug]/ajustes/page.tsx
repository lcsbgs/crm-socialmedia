import { redirect } from "next/navigation";

export default async function SettingsIndex({ params }: PageProps<"/w/[slug]/ajustes">) {
  const { slug } = await params;
  redirect(`/w/${slug}/ajustes/estudio`);
}
