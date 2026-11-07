"use client";

import { Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { ClientAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { approveAll, respondToPost } from "../actions";
import type { PortalItem } from "../queries";

const NAME_KEY = "pauta:portal:nome";

function useRememberedName() {
  const [nome, setNome] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do armazenamento do aparelho
      if (saved) setNome(saved);
    } catch {}
  }, []);
  function remember(v: string) {
    setNome(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {}
  }
  return [nome, remember] as const;
}

export function PortalReview({
  token,
  items,
  clientNome,
  clientCor,
  handle,
  contatoNome,
}: {
  token: string;
  items: PortalItem[];
  clientNome: string;
  clientCor: number;
  handle: string;
  contatoNome: string;
}) {
  const [nome, remember] = useRememberedName();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<string, "aprovado" | "ajuste">>({});
  const [mode, setMode] = useState<"ver" | "ajuste" | "nome">("ver");
  const [after, setAfter] = useState<null | (() => void)>(null);
  const [comentario, setComentario] = useState("");
  const [ponto, setPonto] = useState<{ x: number; y: number } | null>(null);
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const imgRef = useRef<HTMLDivElement>(null);

  const pendingItems = items.filter((i) => !done[i.id]);
  const item = items[index];
  const total = items.length;
  const firstName = nome.split(" ")[0] || contatoNome;

  function needName(fn: () => void) {
    if (nome.trim()) return fn();
    setAfter(() => fn);
    setMode("nome");
  }

  function goNext() {
    setComentario("");
    setPonto(null);
    setSlide(0);
    setExpanded(false);
    setMode("ver");
    const nextIdx = items.findIndex((i, k) => k > index && !done[i.id]);
    const firstIdx = items.findIndex((i) => !done[i.id] && i.id !== item?.id);
    setIndex(nextIdx >= 0 ? nextIdx : Math.max(0, firstIdx));
  }

  function send(decisao: "aprovado" | "ajuste") {
    if (!item) return;
    setError(null);
    start(async () => {
      const r = await respondToPost({ token, deliverableId: item.id, decisao, autorNome: nome, comentario, ponto });
      if (!r.ok) return void setError(r.error);
      setDone((d) => ({ ...d, [item.id]: decisao }));
      goNext();
    });
  }

  if (finalMsg || (total > 0 && pendingItems.length === 0)) {
    const aprovados = Object.values(done).filter((d) => d === "aprovado").length;
    return (
      <section className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ok-tonal text-ok">
          <Check className="size-7" aria-hidden />
        </span>
        <h2 className="font-display text-2xl">Tudo respondido{firstName ? `, ${firstName}` : ""}!</h2>
        <p className="text-md text-ink-2">
          {finalMsg ?? `${aprovados ? `${aprovados} aprovado${aprovados > 1 ? "s" : ""}` : "Nenhum aprovado"}. A equipe já foi avisada.`}
        </p>
      </section>
    );
  }
  if (!item) return null;

  const media = item.midia.filter((m) => m.kind !== "file");
  const current = media[slide];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-muted">
        {index + 1} de {total}
      </p>
      <h1 className="font-display text-[28px] leading-tight">
        {firstName ? `Oi, ${firstName}! ` : "Oi! "}
        {pendingItems.length === 1 ? `1 post da ${clientNome} espera seu ok.` : `${pendingItems.length} posts da ${clientNome} esperam seu ok.`}
      </h1>

      <article className="overflow-hidden rounded-card bg-surface">
        <header className="flex items-center gap-2.5 p-3.5">
          <ClientAvatar name={clientNome} color={clientCor} size="md" className="rounded-full" />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-base">{handle}</b>
            <span className="text-sm text-muted">
              {item.formato}
              {item.data_publicacao ? `, ${formatDate(item.data_publicacao)}` : ""}
              {item.hora_publicacao ? ` às ${item.hora_publicacao.slice(0, 5)}` : ""}
            </span>
          </div>
          {media.length > 1 ? (
            <span className="tabular rounded-full bg-background px-2.5 py-1 text-xs font-bold">
              {slide + 1}/{media.length}
            </span>
          ) : null}
        </header>

        <div
          ref={imgRef}
          className={cn("relative aspect-[4/5] bg-background", mode === "ajuste" && current?.kind === "image" && "cursor-crosshair")}
          onClick={(e) => {
            if (mode !== "ajuste" || current?.kind !== "image" || !imgRef.current) return;
            const r = imgRef.current.getBoundingClientRect();
            setPonto({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
          }}
        >
          {current?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
            <img src={current.url} alt={`Arte ${slide + 1} de ${media.length}`} className="size-full object-cover" />
          ) : current?.kind === "video" ? (
            <video src={current.url} controls playsInline className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center p-6 text-center text-md text-muted">{item.titulo}</div>
          )}
          {ponto ? (
            <span
              className="pointer-events-none absolute flex size-8 -translate-x-1/2 -translate-y-full items-center justify-center text-late"
              style={{ left: `${ponto.x}%`, top: `${ponto.y}%` }}
            >
              <MapPin className="size-8 fill-white" aria-hidden />
            </span>
          ) : null}
          {media.length > 1 ? (
            <>
              <button type="button" aria-label="Arte anterior" disabled={slide === 0} onClick={(e) => (e.stopPropagation(), setSlide((s) => s - 1))} className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 disabled:opacity-0">
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button type="button" aria-label="Próxima arte" disabled={slide === media.length - 1} onClick={(e) => (e.stopPropagation(), setSlide((s) => s + 1))} className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 disabled:opacity-0">
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>

        <div className="p-3.5">
          <p className={cn("text-md whitespace-pre-wrap", !expanded && "line-clamp-3")}>
            <b>{handle}</b> {item.legenda || <span className="text-muted">Sem legenda.</span>}
          </p>
          {item.legenda && item.legenda.length > 140 && !expanded ? (
            <button type="button" onClick={() => setExpanded(true)} className="text-sm font-semibold text-muted">
              mais
            </button>
          ) : null}
        </div>
      </article>

      {error ? (
        <p role="alert" className="rounded-inner bg-late-tonal px-4 py-3 text-sm text-late-ink">
          {error}
        </p>
      ) : null}

      {mode === "nome" ? (
        <form
          className="flex flex-col gap-3 rounded-card bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return;
            setMode("ver");
            after?.();
          }}
        >
          <Label htmlFor="nome-portal">Como você se chama?</Label>
          <Input id="nome-portal" autoComplete="name" value={nome} onChange={(e) => remember(e.target.value)} autoFocus />
          <p className="text-xs text-muted">Guardamos neste aparelho para não perguntar de novo.</p>
          <Button type="submit" size="lg">
            Continuar
          </Button>
        </form>
      ) : mode === "ajuste" ? (
        <div className="flex flex-col gap-3 rounded-card bg-surface p-4">
          <Label htmlFor="ajuste">O que precisa mudar?</Label>
          <Textarea id="ajuste" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} autoFocus />
          <p className="text-xs text-muted">
            {current?.kind === "image" ? (ponto ? "Ponto marcado na imagem. Toque de novo para mudar." : "Se ajudar, toque na imagem para marcar o lugar.") : null}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => (setMode("ver"), setPonto(null))}>
              Voltar
            </Button>
            <Button className="flex-1" size="lg" disabled={pending || !comentario.trim()} onClick={() => send("ajuste")}>
              {pending ? "Enviando..." : "Enviar pedido de ajuste"}
            </Button>
          </div>
        </div>
      ) : (
        <footer className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-background/95 px-4 pt-2 pb-4 backdrop-blur">
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" disabled={pending} onClick={() => needName(() => setMode("ajuste"))}>
              Pedir ajuste
            </Button>
            <Button size="lg" className="flex-1" disabled={pending} onClick={() => needName(() => send("aprovado"))}>
              <Check aria-hidden />
              {pending ? "Aprovando..." : "Aprovar"}
            </Button>
          </div>
          {pendingItems.length > 1 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                needName(() =>
                  start(async () => {
                    const r = await approveAll({ token, autorNome: nome });
                    if (!r.ok) return void setError(r.error);
                    setFinalMsg(r.message);
                  }),
                )
              }
              className="h-11 text-base font-bold text-accent-tonal-ink underline"
            >
              Aprovar os {pendingItems.length} de uma vez
            </button>
          ) : null}
        </footer>
      )}
    </div>
  );
}
