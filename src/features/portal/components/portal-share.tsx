"use client";

import { Link2, MessageCircle, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { firstName, whatsappLink } from "@/lib/whatsapp";
import { regeneratePortalLink } from "../share-actions";

export function portalMessage(url: string, contactName: string, pending: number) {
  const oi = contactName ? `Oi, ${firstName(contactName)}!` : "Oi!";
  return pending > 0
    ? `${oi} ${pending === 1 ? "Tem 1 conteúdo esperando" : `Tem ${pending} conteúdos esperando`} sua aprovação. É só abrir o link, ver e responder: ${url}`
    : `${oi} Este é o seu link para aprovar os conteúdos: ${url}`;
}

export function PortalShare({
  workspaceId,
  clientId,
  url,
  contactName,
  contactPhone,
  pending,
}: {
  workspaceId: string;
  clientId: string;
  url: string;
  contactName: string;
  contactPhone: string | null;
  pending: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();

  return (
    <Popover onOpenChange={() => setConfirming(false)}>
      <PopoverTrigger className={buttonClasses("secondary", "sm")}>
        <Link2 aria-hidden />
        Enviar link do portal
        {pending ? <span className="tabular text-muted">{pending}</span> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3">
        <p className="text-sm text-muted">
          Link público para o cliente aprovar as entregas. Não precisa de login.
          {pending ? ` ${plural(pending, "entrega aguardando", "entregas aguardando")}.` : ""}
        </p>
        <code className="block truncate rounded-xl bg-hover px-2 py-1 text-xs">{url}</code>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={url} />
          <a
            href={whatsappLink(contactPhone, portalMessage(url, contactName, pending))}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses("primary", "sm")}
          >
            <MessageCircle aria-hidden />
            Enviar no WhatsApp
          </a>
        </div>
        <div className="border-t border-border pt-2">
          {confirming ? (
            <div className="space-y-2">
              <p className="text-sm">O link atual deixa de funcionar. Continuar?</p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await regeneratePortalLink({ workspaceId, clientId });
                      if (r.error) toast.error(r.error);
                      else toast.success("Novo link gerado");
                      setConfirming(false);
                    })
                  }
                >
                  {busy ? "Gerando" : "Gerar novo link"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Gerar novo link
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
