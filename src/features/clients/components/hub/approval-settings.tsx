"use client";

import { MessageCircle, Send } from "lucide-react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { whatsappLink } from "@/lib/whatsapp";
import { sendMonthPlan, setTacitApproval } from "../../hub-actions";

export function SendPlanButton({
  clientId,
  month,
  monthName,
  status,
  portalUrl,
  phone,
  contato,
}: {
  clientId: string;
  month: string;
  monthName: string;
  status: string | null;
  portalUrl: string;
  phone: string | null;
  contato: string;
}) {
  const [pending, start] = useTransition();
  const msg = `${contato ? `Oi, ${contato}!` : "Oi!"} O planejamento de ${monthName} está pronto. Dá uma olhada e aprova por aqui: ${portalUrl}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status ? (
        <Badge tone={status === "aprovado" ? "success" : status === "ajuste" ? "danger" : "warning"}>
          Planejamento {status === "aprovado" ? "aprovado" : status === "ajuste" ? "com ajuste pedido" : "enviado"}
        </Badge>
      ) : null}
      <Button
        variant={status ? "outline" : "primary"}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendMonthPlan({ clientId, month });
            if ("error" in r) return void toast.error(r.error);
            toast.success(`Planejamento de ${monthName} enviado para aprovação.`, {
              action: { label: "Avisar no WhatsApp", onClick: () => window.open(whatsappLink(phone, msg), "_blank", "noopener") },
            });
          })
        }
      >
        <Send aria-hidden />
        {status ? "Reenviar planejamento" : `Enviar planejamento de ${monthName}`}
      </Button>
      {status === "enviado" ? (
        <a href={whatsappLink(phone, msg)} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "sm")}>
          <MessageCircle aria-hidden />
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}

export function TacitApprovalSelect({ workspaceId, clientId, horas }: { workspaceId: string; clientId: string; horas: number | null }) {
  const [, start] = useTransition();
  return (
    <div className="space-y-1.5">
      <Select
        aria-label="Aprovação tácita"
        value={horas ? String(horas) : ""}
        onValueChange={(v) =>
          start(async () => {
            const r = await setTacitApproval({ workspaceId, clientId, horas: v ? Number(v) : null });
            if ("error" in r) toast.error(r.error);
            else toast.success("Salvo.");
          })
        }
        options={[
          { value: "", label: "Desligada" },
          { value: "48", label: "Depois de 48 horas" },
          { value: "72", label: "Depois de 72 horas" },
          { value: "120", label: "Depois de 5 dias" },
        ]}
      />
      <p className="text-xs text-muted">Sem resposta no prazo, o post conta como aprovado. Combine isso no contrato. Lembrete para a equipe sai sempre com 48 horas.</p>
    </div>
  );
}
