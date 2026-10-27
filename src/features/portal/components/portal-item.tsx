"use client";

import { useActionState, useEffect, useState } from "react";
import { FormAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { respondToDeliverable } from "../actions";
import type { PortalItem } from "../queries";

const NAME_KEY = "portal:autor_nome";

export function PortalItemCard({ token, item }: { token: string; item: PortalItem }) {
  const [state, action, pending] = useActionState(respondToDeliverable, null);
  const [nome, setNome] = useState("");

  // Lembra o nome de quem respondeu neste navegador.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de armazenamento externo
      if (saved) setNome(saved);
    } catch {}
  }, []);

  if (state?.message) {
    return (
      <article className="rounded-lg border border-border bg-surface p-4">
        <p className="font-medium">{item.titulo}</p>
        <p className="mt-2 text-sm text-success" role="status">
          {state.message}
        </p>
      </article>
    );
  }

  return (
    <article className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <header className="space-y-1">
        <h2 className="font-semibold">{item.titulo}</h2>
        <p className="text-sm text-muted">
          {item.formato}
          {item.data_publicacao ? ` · publicação em ${formatDate(item.data_publicacao, "long")}` : ""}
        </p>
      </header>

      {item.midia.length ? (
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4">
          {item.midia.map((m, i) =>
            m.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
              <img
                key={i}
                src={m.url}
                alt=""
                className="max-h-96 w-auto snap-start rounded-md border border-border"
              />
            ) : m.kind === "video" ? (
              <video
                key={i}
                src={m.url}
                controls
                className="max-h-96 snap-start rounded-md border border-border"
              />
            ) : (
              <a key={i} href={m.url} target="_blank" rel="noreferrer" className="text-sm underline">
                Abrir arquivo
              </a>
            ),
          )}
        </div>
      ) : null}

      {item.legenda ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Legenda</p>
          <p className="whitespace-pre-line text-sm">{item.legenda}</p>
        </div>
      ) : null}

      <form action={action} className="space-y-3 border-t border-border pt-4">
        <FormAlert state={state} />
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="deliverableId" value={item.id} />
        <div className="space-y-1.5">
          <label htmlFor={`nome-${item.id}`} className="block text-sm font-medium">
            Seu nome
          </label>
          <input
            id={`nome-${item.id}`}
            name="autor_nome"
            required
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              try {
                localStorage.setItem(NAME_KEY, e.target.value);
              } catch {}
            }}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          />
          {state?.fieldErrors?.autor_nome ? (
            <p className="text-sm text-danger">{state.fieldErrors.autor_nome[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`comentario-${item.id}`} className="block text-sm font-medium">
            Comentário <span className="font-normal text-muted">(obrigatório para pedir ajuste)</span>
          </label>
          <textarea
            id={`comentario-${item.id}`}
            name="comentario"
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
          {state?.fieldErrors?.comentario ? (
            <p className="text-sm text-danger">{state.fieldErrors.comentario[0]}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" name="decisao" value="aprovado" disabled={pending}>
            Aprovar
          </Button>
          <Button type="submit" name="decisao" value="ajuste" variant="secondary" disabled={pending}>
            Pedir ajuste
          </Button>
        </div>
      </form>
    </article>
  );
}
