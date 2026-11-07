"use client";

import { FileSignature, MessageCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { diagnosisAi, generateContract, saveProposal, sendProposal } from "../actions";

type P = {
  id: string;
  workspaceId: string;
  titulo: string;
  package_template_id: string | null;
  valor_mensal: number;
  duracao_meses: number;
  dia_vencimento: number;
  validade: string | null;
  diagnostico: string | null;
  observacoes: string | null;
  status: string;
  url: string;
  lead: { nome: string; contato_nome: string | null; telefone: string | null };
  views: string[];
  aceite: { nome: string | null; em: string | null };
  contrato: { status: string; url: string } | null;
};

export function ProposalEditor({ p, packages }: { p: P; packages: { id: string; nome: string; preco: number | null }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    titulo: p.titulo,
    packageId: p.package_template_id ?? "",
    valor: String(p.valor_mensal ?? ""),
    duracao: String(p.duracao_meses),
    vencimento: String(p.dia_vencimento),
    validade: p.validade ?? "",
    diagnostico: p.diagnostico ?? "",
    observacoes: p.observacoes ?? "",
  });
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));
  const save = () =>
    saveProposal({ id: p.id, ...f, duracao: Number(f.duracao), vencimento: Number(f.vencimento) }).then((r) => {
      if ("error" in r) toast.error(r.error);
      return r;
    });
  const msg = `Oi, ${p.lead.contato_nome ?? ""}! Segue a proposta para a ${p.lead.nome}: ${p.url}`;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Proposta" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="t">Título</Label>
              <Input id="t" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pacote</Label>
              <Select
                aria-label="Pacote"
                value={f.packageId}
                onValueChange={(v) => {
                  set("packageId", v);
                  const pk = packages.find((x) => x.id === v);
                  if (pk?.preco) set("valor", String(pk.preco));
                }}
                options={[{ value: "", label: "Sem pacote" }, ...packages.map((x) => ({ value: x.id, label: x.nome }))]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v">Valor por mês</Label>
              <Input id="v" inputMode="decimal" value={f.valor} onChange={(e) => set("valor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d">Duração (meses)</Label>
              <Input id="d" type="number" min={1} max={36} value={f.duracao} onChange={(e) => set("duracao", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ven">Dia do vencimento</Label>
              <Input id="ven" type="number" min={1} max={28} value={f.vencimento} onChange={(e) => set("vencimento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="val">Válida até</Label>
              <Input id="val" type="date" value={f.validade} onChange={(e) => set("validade", e.target.value)} />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Diagnóstico"
            description="Onde a marca está e o que o pacote resolve."
            action={
              <Button
                variant="tonal"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await diagnosisAi({ workspaceId: p.workspaceId, proposalId: p.id });
                    if (!r.ok) return void toast.error(r.error);
                    set("diagnostico", r.text);
                    toast.success(r.warning ?? "Rascunho pronto. Revise antes de enviar.");
                  })
                }
              >
                <Sparkles aria-hidden />
                Escrever com IA
              </Button>
            }
          />
          <Textarea aria-label="Diagnóstico" rows={6} value={f.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} />
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" rows={3} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={() => start(async () => void ((await save()) && router.refresh()))}>
            Salvar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await save();
                if ("error" in r) return;
                const s = await sendProposal({ id: p.id });
                if ("error" in s) return void toast.error(s.error);
                toast.success("Proposta enviada. Mande o link pelo WhatsApp.", {
                  action: { label: "WhatsApp", onClick: () => window.open(whatsappLink(p.lead.telefone, msg), "_blank", "noopener") },
                });
                router.refresh();
              })
            }
          >
            {p.status === "rascunho" ? "Enviar proposta" : "Salvar e manter enviada"}
          </Button>
          <a href={`${p.url}?imprimir=1`} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "md")}>
            Baixar PDF
          </a>
        </div>
      </div>
      <aside className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Situação" />
          <Badge tone={p.status === "aceita" ? "success" : p.status === "enviada" ? "accent" : "neutral"}>{p.status}</Badge>
          {p.status !== "rascunho" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={p.url} />
              <a href={whatsappLink(p.lead.telefone, msg)} target="_blank" rel="noreferrer" className={buttonClasses("outline", "sm")}>
                <MessageCircle aria-hidden />
                WhatsApp
              </a>
            </div>
          ) : null}
          {p.aceite.em ? <p className="mt-3 text-md">Aceita por <b>{p.aceite.nome}</b> {formatRelativeTime(p.aceite.em)}.</p> : null}
        </Card>
        <Card>
          <CardHeader title="Visualizações" count={p.views.length} />
          {p.views.length ? (
            <ul className="flex flex-col gap-1 text-sm text-ink-2">
              {p.views.slice(0, 10).map((v, i) => (
                <li key={i}>Aberta {formatRelativeTime(v)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ainda não foi aberta.</p>
          )}
        </Card>
        {p.status === "aceita" ? (
          <Card>
            <CardHeader title="Contrato" />
            {p.contrato ? (
              <div className="flex flex-col gap-2">
                <Badge tone={p.contrato.status === "assinado" ? "success" : "warning"}>{p.contrato.status}</Badge>
                <CopyButton value={p.contrato.url} label="Copiar link de assinatura" />
              </div>
            ) : (
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await generateContract({ proposalId: p.id });
                    if ("error" in r) return void toast.error(r.error);
                    toast.success("Contrato gerado e aberto para assinatura.");
                    router.refresh();
                  })
                }
              >
                <FileSignature aria-hidden />
                Gerar contrato
              </Button>
            )}
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
