import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewDeliverableButton } from "@/components/shell/shell-actions";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Calendário" };

export default function Page() {
  return (
    <>
      <PageHeader title="Calendário" action={<NewDeliverableButton />} />
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          icon={CalendarDays}
          title="Em construção"
          description="A visão de calendário chega na próxima etapa. Por enquanto, as datas ficam no quadro de cada cliente."
        />
      </div>
    </>
  );
}
