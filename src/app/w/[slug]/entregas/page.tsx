import { KanbanSquare } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewDeliverableButton } from "@/components/shell/shell-actions";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Entregas" };

export default function Page() {
  return (
    <>
      <PageHeader title="Entregas" action={<NewDeliverableButton />} />
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          icon={KanbanSquare}
          title="Em construção"
          description="O quadro com as entregas de todos os clientes chega na próxima etapa. Por enquanto, as entregas ficam na página de cada cliente."
        />
      </div>
    </>
  );
}
