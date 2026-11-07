"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatBRL, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { createLead, createProposal, deleteLead, moveLead, updateLeadNotes } from "../actions";

export type LeadView = {
  id: string;
  nome: string;
  contato_nome: string | null;
  telefone: string | null;
  email: string | null;
  segmento: string | null;
  etapa: string;
  valor_estimado: number | null;
  notas: string | null;
  updated_at: string;
  client_id: string | null;
  proposta: { id: string; status: string; views: number } | null;
};

const colunas = [
  { id: "novo", label: "Novos", color: "#8A93A3" },
  { id: "conversa", label: "Em conversa", color: "#3D6FE0" },
  { id: "proposta", label: "Proposta enviada", color: "#6B4EFF" },
  { id: "negociacao", label: "Negociação", color: "#E0A800" },
  { id: "ganho", label: "Ganhos", color: "#1F7A4D" },
  { id: "perdido", label: "Perdidos", color: "#C2410C" },
] as const;

export function Pipeline({ workspaceId, slug, leads: initial }: { workspaceId: string; slug: string; leads: LeadView[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setLeads(initial);
  }
  const [open, setOpen] = useState<LeadView | null>(null);
  const [creating, setCreating] = useState(false);
  const [over, setOver] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function drop(e: DragEvent, etapa: string) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.etapa === etapa) return;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, etapa } : l)));
    start(async () => {
      const r = await moveLead({ id, etapa: etapa as "novo" });
      if ("error" in r) {
        toast.error(r.error);
        setLeads(initial);
      } else router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Novo lead
        </Button>
      </div>
      <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-4 sm:-mx-7 sm:px-7 xl:-mx-10 xl:px-10">
        {colunas.map((col) => {
          const items = leads.filter((l) => l.etapa === col.id);
          const total = items.reduce((s, l) => s + (l.valor_estimado ?? 0), 0);
          return (
            <section
              key={col.id}
              aria-label={col.label}
              onDragOver={(e) => (e.preventDefault(), setOver(col.id))}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => drop(e, col.id)}
              className={cn("flex w-[78vw] max-w-[290px] shrink-0 flex-col gap-2.5 rounded-card border-2 border-transparent bg-[#EAECF0] p-3 sm:w-[260px]", over === col.id && "border-accent")}
            >
              <h2 className="flex items-center justify-between gap-2 px-1 text-base font-bold">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.label}
                </span>
                <span className="tabular rounded-full bg-surface px-2 text-xs font-bold text-ink-2">{items.length}</span>
              </h2>
              {total ? <p className="tabular px-1 text-xs text-muted">{formatBRL(total)}/mês em jogo</p> : null}
              <ul className="flex min-h-20 flex-col gap-2">
                {items.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                      onClick={() => setOpen(l)}
                      className="flex w-full flex-col gap-1 rounded-inner bg-surface p-3 text-left hover:ring-2 hover:ring-border-input"
                    >
                      <b className="text-md">{l.nome}</b>
                      <span className="text-sm text-muted">{[l.contato_nome, l.segmento].filter(Boolean).join(", ") || "sem contato"}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {l.valor_estimado ? <Badge tone="neutral">{formatBRL(l.valor_estimado)}</Badge> : null}
                        {l.proposta ? (
                          <Badge tone={l.proposta.status === "aceita" ? "success" : "accent"}>
                            {l.proposta.status === "aceita" ? "aceita" : l.proposta.views ? `vista ${l.proposta.views}x` : "proposta"}
                          </Badge>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <NewLeadDialog open={creating} onClose={() => setCreating(false)} workspaceId={workspaceId} onCreated={() => router.refresh()} />

      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.nome ?? ""} description={open ? `Atualizado ${formatRelativeTime(open.updated_at)}` : undefined}>
        {open ? (
          <LeadPanel lead={open} slug={slug} pending={pending} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />
        ) : null}
      </Dialog>
    </>
  );
}

function LeadPanel({ lead, slug, onClose, onChanged }: { lead: LeadView; slug: string; pending: boolean; onClose: () => void; onChanged: () => void }) {
  const [notas, setNotas] = useState(lead.notas ?? "");
  const [valor, setValor] = useState(lead.valor_estimado ? String(lead.valor_estimado) : "");
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-sm text-ink-2">
        {lead.contato_nome ? <span>{lead.contato_nome}</span> : null}
        {lead.telefone ? (
          <a href={whatsappLink(lead.telefone, `Oi, ${lead.contato_nome ?? ""}!`)} target="_blank" rel="noreferrer" className="font-semibold text-accent-tonal-ink underline">
            WhatsApp
          </a>
        ) : null}
        {lead.email ? <span>{lead.email}</span> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="valor-lead">Valor estimado por mês</Label>
        <Input id="valor-lead" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notas-lead">Notas da conversa</Label>
        <Textarea id="notas-lead" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            start(async () => {
              const r = await updateLeadNotes({ id: lead.id, notas, valor });
              if ("error" in r) toast.error(r.error);
              else {
                toast.success("Salvo.");
                onChanged();
              }
            })
          }
        >
          Salvar
        </Button>
        {lead.proposta ? (
          <Link href={`/w/${slug}/comercial/propostas/${lead.proposta.id}`} className="inline-flex h-9 items-center rounded-full bg-accent px-3.5 text-base font-bold text-white">
            Abrir proposta
          </Link>
        ) : (
          <form action={createProposal}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className="inline-flex h-9 items-center rounded-full bg-accent px-3.5 text-base font-bold text-white">
              Montar proposta
            </button>
          </form>
        )}
        {lead.client_id ? (
          <Link href={`/w/${slug}/clientes/${lead.client_id}`} className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-base font-semibold">
            Ver cliente
          </Link>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-late"
          onClick={() =>
            start(async () => {
              await deleteLead({ id: lead.id });
              onClose();
              onChanged();
            })
          }
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}

function NewLeadDialog({ open, onClose, workspaceId, onCreated }: { open: boolean; onClose: () => void; workspaceId: string; onCreated: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onClose={onClose} title="Novo lead">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r = await createLead({
              workspaceId,
              nome: String(f.get("nome") ?? ""),
              contato: String(f.get("contato") ?? ""),
              telefone: String(f.get("telefone") ?? ""),
              email: String(f.get("email") ?? ""),
              segmento: String(f.get("segmento") ?? ""),
              origem: String(f.get("origem") ?? ""),
            });
            if ("error" in r) return void toast.error(r.error);
            toast.success("Lead criado.");
            onClose();
            onCreated();
          });
        }}
      >
        {[
          ["nome", "Empresa ou marca", true],
          ["contato", "Nome do contato", false],
          ["telefone", "WhatsApp", false],
          ["email", "E-mail", false],
          ["segmento", "Segmento", false],
          ["origem", "Como chegou (indicação, Instagram...)", false],
        ].map(([n, l, req]) => (
          <div key={String(n)} className="space-y-1.5">
            <Label htmlFor={`lead-${n}`}>{l}</Label>
            <Input id={`lead-${n}`} name={String(n)} required={!!req} />
          </div>
        ))}
        <Button type="submit" disabled={pending} className="self-end">
          Criar lead
        </Button>
      </form>
    </Dialog>
  );
}
