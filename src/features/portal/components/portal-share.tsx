"use client";

import { useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Menu } from "@/components/ui/menu";
import { firstName, whatsappLink } from "@/lib/whatsapp";
import { regeneratePortalLink } from "../share-actions";

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
  const greeting = contactName ? `Oi, ${firstName(contactName)}!` : "Oi!";
  const message =
    pending > 0
      ? `${greeting} Tem ${pending} conteúdo(s) esperando sua aprovação. É só abrir o link, ver e responder: ${url}`
      : `${greeting} Este é o seu link para aprovar os conteúdos: ${url}`;

  return (
    <Menu
      summary={
        <span className={buttonClasses("secondary", "sm")}>
          Portal do cliente{pending ? ` (${pending})` : ""}
        </span>
      }
    >
      <div className="absolute right-0 z-20 mt-1 w-72 space-y-3 rounded-md border border-border bg-surface p-3 shadow-lg">
        <p className="text-xs text-muted">
          Link público para o cliente aprovar as entregas em aprovação. Não precisa de login.
        </p>
        <code className="block truncate rounded bg-background px-2 py-1 text-xs">{url}</code>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={url} />
          <a
            href={whatsappLink(contactPhone, message)}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses("primary", "sm")}
          >
            Enviar no WhatsApp
          </a>
        </div>
        <div className="border-t border-border pt-2">
          {confirming ? (
            <div className="space-y-2">
              <p className="text-xs">O link atual deixa de funcionar. Continuar?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      await regeneratePortalLink({ workspaceId, clientId });
                      setConfirming(false);
                    })
                  }
                  className={buttonClasses("danger", "sm")}
                >
                  {busy ? "Gerando..." : "Gerar novo link"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className={buttonClasses("ghost", "sm")}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-xs text-muted underline"
            >
              Gerar novo link (invalida o atual)
            </button>
          )}
        </div>
      </div>
    </Menu>
  );
}
