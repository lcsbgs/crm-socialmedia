import { SettingsNav } from "@/features/settings/components/settings-nav";

export default async function SettingsLayout({ children, params }: LayoutProps<"/w/[slug]/ajustes">) {
  const { slug } = await params;
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="space-y-3">
        <p className="px-3 font-display text-lg">Ajustes</p>
        <SettingsNav slug={slug} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
