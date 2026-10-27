import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { QuickAdd } from "@/features/today/components/quick-add";
import { TodaySummary, TodayView } from "@/features/today/components/today-view";
import { getToday } from "@/features/today/queries";
import { getWorkspaceBySlug } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Hoje" };

const longToday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

export default async function TodayPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const { sections } = await getToday(workspace.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Hoje"
        description={
          <>
            <span className="inline-block first-letter:uppercase">{longToday.format(new Date())}</span>
            {" · "}
            <TodaySummary sections={sections} />
          </>
        }
      />
      <QuickAdd />
      <TodayView sections={sections} />
    </div>
  );
}
