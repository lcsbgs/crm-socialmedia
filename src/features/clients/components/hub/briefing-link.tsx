"use client";

import { MessageCircle, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { buttonClasses, IconButton } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { toast } from "@/components/ui/toast";
import { whatsappLink } from "@/lib/whatsapp";
import { regenerateBriefingLink } from "../../hub-actions";

export function BriefingLink({ clientId, url, phone, nome }: { clientId: string; url: string; phone: string | null; nome: string }) {
  const [pending, start] = useTransition();
  const msg = `${nome ? `Oi, ${nome}!` : "Oi!"} Para eu começar com o pé direito, responde este briefing rapidinho? Leva uns 10 minutos: ${url}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton value={url} label="Copiar link do briefing" />
      <a href={whatsappLink(phone, msg)} target="_blank" rel="noreferrer" className={buttonClasses("outline", "sm")}>
        <MessageCircle aria-hidden />
        Mandar no WhatsApp
      </a>
      <IconButton
        label="Gerar outro link (o atual deixa de funcionar)"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await regenerateBriefingLink({ clientId });
            if ("error" in r) toast.error(r.error);
            else toast.success("Novo link gerado.");
          })
        }
      >
        <RefreshCw aria-hidden />
      </IconButton>
    </div>
  );
}
