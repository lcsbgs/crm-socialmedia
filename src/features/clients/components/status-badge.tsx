import { Badge } from "@/components/ui/badge";
import { clientStatusLabels, type ClientStatus } from "../schemas";

const tones = { ativo: "success", pausado: "warning", encerrado: "neutral" } as const;

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge tone={tones[status]}>{clientStatusLabels[status]}</Badge>;
}
