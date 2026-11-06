"use client";

import { Eye, Heart, MessageCircle, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useShell } from "@/components/shell/shell-context";
import { ClientAvatar, ClientTag, UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import { captionAi } from "@/features/ai/actions";
import { portalMessage } from "@/features/portal/components/portal-share";
import { formatDate, formatRelativeDay, formatRelativeTime, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { deleteDeliverable } from "../actions";
import {
  addComment,
  deleteComment,
  saveDeliverableVersion,
  updateDeliverableFields,
  type DeliverableDetail,
} from "../detail-actions";
import { columnOf, deliverableLabel, formatLabels, stageOrder, statusLabels } from "../schemas";
import { MediaUploader } from "./media-uploader";

const LIMIT = 2200;
const formatOptions = Object.entries(formatLabels).map(([value, label]) => ({ value, label }));
const canalLabels = { instagram: "Instagram", facebook: "Facebook", ambos: "Instagram e Facebook" } as const;

// Próxima etapa sugerida para o botão principal.
function nextStep(status: DeliverableDetail["status"]) {
  switch (status) {
    case "planejar":
      return { to: "produzir" as const, label: "Começar produção" };
    case "produzir":
    case "ajuste":
      return { to: "em_aprovacao" as const, label: "Enviar para aprovação" };
    case "aprovado":
      return { to: "agendado" as const, label: "Agendar publicação" };
    case "agendado":
      return { to: "publicado" as const, label: "Marcar como publicado" };
    default:
      return null;
  }
}

export function PostEditor({
  detail,
  reload,
  onDeleted,
}: {
  detail: DeliverableDetail;
  reload: () => Promise<void>;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const { workspace } = useShell();
  const [titulo, setTitulo] = useState(detail.titulo ?? "");
  const [legenda, setLegenda] = useState(detail.legenda ?? "");
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");
  const [preview, setPreview] = useState<"feed" | "reels" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const base = `/w/${workspace.slug}`;
  const today = todayISO();
  const prazoAtrasado = !!detail.prazo_interno && detail.prazo_interno < today && !["publicado", "agendado", "aprovado"].includes(detail.status);
  const col = columnOf(detail.status);
  const stageIndex = stageOrder.indexOf(col === "ajuste" ? "em_aprovacao" : col);
  const next = nextStep(detail.status);

  function save(patch: Parameters<typeof updateDeliverableFields>[0]["patch"], success?: string) {
    start(async () => {
      const r = await updateDeliverableFields({ workspaceId: detail.workspaceId, id: detail.id, patch });
      if ("error" in r && r.error) return void toast.error(r.error);
      if (success) toast.success(success);
      await reload();
      router.refresh();
    });
  }

  function advance() {
    if (!next) return;
    start(async () => {
      if (legenda !== (detail.legenda ?? "")) await updateDeliverableFields({ workspaceId: detail.workspaceId, id: detail.id, patch: { legenda } });
      if (next.to === "em_aprovacao") await saveDeliverableVersion({ workspaceId: detail.workspaceId, id: detail.id, origem: "edicao" });
      const r = await updateDeliverableFields({ workspaceId: detail.workspaceId, id: detail.id, patch: { status: next.to } });
      if ("error" in r && r.error) return void toast.error(r.error);
      if (next.to === "em_aprovacao") {
        const wa = whatsappLink(detail.client.contatoTelefone, portalMessage(detail.client.portalUrl, detail.client.contatoNome, 1));
        toast.success("Enviado para aprovação", {
          description: "O cliente vê no link de aprovação.",
          action: { label: "Avisar no WhatsApp", onClick: () => window.open(wa, "_blank", "noopener") },
        });
      } else toast.success(statusLabels[next.to]);
      await reload();
      router.refresh();
    });
  }

  async function ai(acao: "escrever" | "encurtar" | "acolhedor" | "chamada") {
    setAiBusy(acao);
    const r = await captionAi({ workspaceId: detail.workspaceId, deliverableId: detail.id, acao, legenda });
    setAiBusy(null);
    if (!r.ok) return void toast.error(r.error);
    setLegenda(r.text);
    if (r.warning) toast.warning(r.warning);
    else toast.success(r.provider === "mock" ? "Sugestão da IA (demonstração). Revise antes de enviar." : "Sugestão da IA. Revise antes de enviar.");
  }

  function setChecklist(items: DeliverableDetail["checklist"]) {
    save({ checklist: items });
  }

  const pubInfo = [
    formatLabels[detail.formato],
    canalLabels[detail.canal],
    detail.data_publicacao
      ? `publica ${formatRelativeDay(detail.data_publicacao)}${detail.hora_publicacao ? ` às ${detail.hora_publicacao.slice(0, 5)}` : ""}`
      : "sem data",
  ].join(", ");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`${base}/clientes/${detail.client.id}`} className="self-start">
          <ClientTag name={detail.client.nome} color={detail.client.cor} />
        </Link>
        <Input
          aria-label="Título do post"
          value={titulo}
          placeholder={detail.slot_label ? `${detail.slot_label}: dê um título` : "Título"}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => titulo !== (detail.titulo ?? "") && save({ titulo })}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="h-auto border-transparent px-0 py-0.5 font-display text-2xl hover:border-border-input focus-visible:px-2"
        />
        <p className="text-md text-muted">{pubInfo}</p>
      </header>

      <section aria-label="Etapa" className="flex flex-col gap-2">
        <ol className="flex gap-1.5" aria-label="Etapas">
          {stageOrder.map((s, i) => (
            <li
              key={s}
              aria-current={i === stageIndex ? "step" : undefined}
              title={statusLabels[s]}
              className={cn("h-2 flex-1 rounded-full", i < stageIndex ? "bg-ok" : i === stageIndex ? (col === "ajuste" ? "bg-late" : "bg-accent") : "bg-hover")}
            />
          ))}
        </ol>
        <p className="text-sm text-ink-2">
          <b>{statusLabels[detail.status]}</b>
          {next ? `, próximo: ${next.label.toLowerCase()}` : ""}
          {detail.rodadas ? `. Rodada ${detail.rodadas + 1}` : ""}
        </p>
      </section>

      <section aria-labelledby="h-arte" className="flex flex-col gap-3 rounded-inner bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id="h-arte" className="font-display text-lg">
            Arte
          </h3>
          {detail.versaoAtual ? <Badge tone="neutral">versão {detail.versaoAtual}</Badge> : null}
        </div>
        {detail.media.length === 0 ? (
          <p className="text-sm text-muted">Ainda sem arte. Crie no Canva ou traga de onde ela já está.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/integracoes/canva?post=${detail.id}&acao=criar`} className={buttonClasses("dark", "sm")}>
            Criar no Canva
          </Link>
          <Link href={`${base}/integracoes/canva?post=${detail.id}&acao=importar`} className={buttonClasses("outline", "sm")}>
            Importar do Canva
          </Link>
          <Link href={`${base}/integracoes/drive?post=${detail.id}`} className={buttonClasses("outline", "sm")}>
            Do Google Drive
          </Link>
        </div>
        <MediaUploader workspaceId={detail.workspaceId} clientId={detail.client.id} deliverableId={detail.id} media={detail.media} onChanged={reload} />
        <p className="text-xs text-muted">Quando você clicar em &quot;Voltar para o Pauta&quot; no Canva, a arte entra aqui como nova versão.</p>
      </section>

      <section aria-labelledby="h-leg" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="h-leg" className="font-display text-lg">
            <label htmlFor="legenda">Legenda</label>
          </h3>
          <Button variant="tonal" size="sm" disabled={!!aiBusy} onClick={() => ai("escrever")}>
            <Sparkles aria-hidden />
            {aiBusy === "escrever" ? "Escrevendo..." : "Escrever com IA"}
          </Button>
        </div>
        <Textarea
          id="legenda"
          rows={7}
          value={legenda}
          maxLength={LIMIT}
          onChange={(e) => setLegenda(e.target.value)}
          onBlur={() => legenda !== (detail.legenda ?? "") && save({ legenda })}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["encurtar", "Encurtar"],
              ["acolhedor", "Mais acolhedor"],
              ["chamada", "Adicionar chamada"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              disabled={!!aiBusy || !legenda.trim()}
              onClick={() => ai(k)}
              className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-sm font-semibold hover:bg-hover disabled:opacity-50"
            >
              {aiBusy === k ? "..." : l}
            </button>
          ))}
          <span className={cn("tabular ml-auto text-xs", legenda.length > LIMIT * 0.9 ? "text-late" : "text-muted")}>
            {legenda.length} / {LIMIT.toLocaleString("pt-BR")}
          </span>
        </div>
      </section>

      <section aria-labelledby="h-det" className="flex flex-col gap-3">
        <h3 id="h-det" className="font-display text-lg">
          Detalhes
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Pilar</Label>
            <Select
              size="sm"
              aria-label="Pilar"
              value={detail.pilar ?? ""}
              placeholder="Escolha o pilar"
              onValueChange={(v) => save({ pilar: v || null })}
              options={[
                { value: "", label: "Sem pilar" },
                ...Array.from(new Set([...detail.pilares, ...(detail.pilar ? [detail.pilar] : [])])).map((p) => ({ value: p, label: p })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select
              size="sm"
              aria-label="Responsável"
              value={detail.responsavel_id ?? ""}
              onValueChange={(v) => save({ responsavel_id: v || null })}
              options={[{ value: "", label: "Ninguém" }, ...detail.members.map((m) => ({ value: m.id, label: m.nome }))]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo interno</Label>
            <DatePicker size="sm" value={detail.prazo_interno} onChange={(d) => save({ prazo_interno: d })} placeholder="Sem prazo" aria-label="Prazo interno" />
            {prazoAtrasado ? <p className="text-xs font-semibold text-late">Atrasado</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>Publicação</Label>
            <div className="flex gap-2">
              <DatePicker size="sm" value={detail.data_publicacao} onChange={(d) => save({ data_publicacao: d })} placeholder="Sem data" aria-label="Data de publicação" />
              <Input
                type="time"
                aria-label="Hora de publicação"
                defaultValue={detail.hora_publicacao?.slice(0, 5) ?? ""}
                onBlur={(e) => save({ hora_publicacao: e.target.value || null })}
                className="h-9 w-28 rounded-full px-3 text-base"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Select size="sm" aria-label="Formato" value={detail.formato} onValueChange={(v) => save({ formato: v as DeliverableDetail["formato"] })} options={formatOptions} />
          </div>
          <div className="space-y-1.5">
            <Label>Onde publica</Label>
            <Select
              size="sm"
              aria-label="Onde publica"
              value={detail.canal}
              onValueChange={(v) => save({ canal: v as DeliverableDetail["canal"] })}
              options={Object.entries(canalLabels).map(([value, label]) => ({ value, label }))}
            />
          </div>
        </div>
        <p className="text-sm text-ink-2">
          Rodadas de ajuste:{" "}
          <b className={cn(detail.rodadas >= detail.limiteRodadas && "text-late")}>
            {detail.rodadas} de {detail.limiteRodadas}
          </b>
          {detail.rodadas >= detail.limiteRodadas ? ". Próximo ajuste pode virar escopo extra." : ""}
        </p>
      </section>

      <section aria-labelledby="h-check" className="flex flex-col gap-2">
        <h3 id="h-check" className="font-display text-lg">
          Checklist
        </h3>
        <ul className="flex flex-col gap-2">
          {detail.checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <Checkbox
                label={<span className={cn("text-base font-medium", c.feito && "text-muted line-through")}>{c.texto}</span>}
                checked={c.feito}
                onChange={(e) => setChecklist(detail.checklist.map((x, j) => (j === i ? { ...x, feito: e.currentTarget.checked } : x)))}
              />
              <button
                type="button"
                aria-label={`Remover ${c.texto}`}
                onClick={() => setChecklist(detail.checklist.filter((_, j) => j !== i))}
                className="ml-auto rounded-full p-1.5 text-muted hover:bg-hover"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newItem.trim()) return;
            setChecklist([...detail.checklist, { texto: newItem.trim(), feito: false }]);
            setNewItem("");
          }}
        >
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Ex.: revisar ortografia" aria-label="Novo item do checklist" className="h-9 flex-1 rounded-full text-base" />
          <Button type="submit" variant="tonal" size="sm">
            <Plus aria-hidden />
            Item
          </Button>
        </form>
      </section>

      {detail.approvals.length ? (
        <section aria-labelledby="h-cli" className="flex flex-col gap-2">
          <h3 id="h-cli" className="font-display text-lg">
            Respostas do cliente
          </h3>
          <ul className="flex flex-col gap-2">
            {detail.approvals.map((a, i) => (
              <li key={i} className={cn("rounded-inner p-3 text-base", a.decisao === "ajuste" ? "bg-late-tonal-2" : "bg-ok-tonal")}>
                <b>{a.autor_nome}</b> {a.decisao === "ajuste" ? "pediu ajuste" : "aprovou"}{" "}
                <span className="text-sm text-muted">{formatRelativeTime(a.created_at)}</span>
                {a.comentario ? <p className="mt-1">{a.comentario}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="h-com" className="flex flex-col gap-2">
        <h3 id="h-com" className="font-display text-lg">
          Comentários internos
        </h3>
        <ul className="flex flex-col gap-3">
          {detail.comments.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <UserAvatar name={c.author?.nome ?? "?"} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <b>{c.author?.nome ?? "Alguém"}</b> <span className="text-muted">{formatRelativeTime(c.created_at)}</span>
                </p>
                <p className="text-base whitespace-pre-wrap">{c.corpo}</p>
              </div>
              {c.mine ? (
                <button
                  type="button"
                  aria-label="Apagar comentário"
                  onClick={() => start(async () => void (await deleteComment({ workspaceId: detail.workspaceId, id: c.id }), await reload()))}
                  className="self-start rounded-full p-1.5 text-muted hover:bg-hover"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addComment({ workspaceId: detail.workspaceId, id: detail.id, corpo: comment });
              if ("error" in r && r.error) return void toast.error(r.error);
              setComment("");
              await reload();
            });
          }}
        >
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentar para a equipe" aria-label="Novo comentário" className="h-9 flex-1 rounded-full text-base" />
          <Button type="submit" variant="outline" size="sm" disabled={!comment.trim() || pending}>
            Enviar
          </Button>
        </form>
      </section>

      {detail.versions.length ? (
        <section aria-labelledby="h-ver" className="flex flex-col gap-2">
          <h3 id="h-ver" className="font-display text-lg">
            Versões
          </h3>
          <ol className="flex flex-col gap-2">
            {detail.versions.map((v) => (
              <li key={v.numero} className="flex items-center gap-3 rounded-inner bg-background p-2.5">
                {v.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumb} alt="" className="size-11 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-lg bg-surface font-display">{v.numero}</span>
                )}
                <span className="min-w-0 flex-1">
                  <b className="block">Versão {v.numero}</b>
                  <span className="block truncate text-sm text-muted">
                    {v.origem === "canva" ? "do Canva" : v.origem === "drive" ? "do Drive" : "salva"} {formatRelativeTime(v.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="h-hist" className="flex flex-col gap-1.5">
        <h3 id="h-hist" className="font-display text-lg">
          Histórico
        </h3>
        <ul className="flex flex-col gap-1 text-sm text-ink-2">
          {detail.activity.slice(0, 12).map((a) => (
            <li key={a.id}>
              <b>{a.actor ?? "Sistema"}</b> {describeActivity(a, detail.members)}{" "}
              <span className="text-muted">{formatRelativeTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-0 -mx-[22px] flex flex-wrap items-center gap-2 border-t border-border bg-surface px-[22px] py-3">
        <Button variant="outline" onClick={() => setPreview(detail.formato === "reels" ? "reels" : "feed")}>
          <Eye aria-hidden />
          Pré-visualizar
        </Button>
        {next ? (
          <Button className="ml-auto" disabled={pending} onClick={advance}>
            {next.to === "em_aprovacao" ? <Send aria-hidden /> : null}
            {next.label}
          </Button>
        ) : null}
        <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-late underline">
          Excluir
        </button>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Excluir este post?" description="A arte e a legenda somem. Não dá para desfazer.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              start(async () => {
                const r = await deleteDeliverable({ workspaceId: detail.workspaceId, id: detail.id });
                if (r?.error) return void toast.error(r.error);
                toast.success("Post excluído.");
                onDeleted();
                router.refresh();
              })
            }
          >
            Excluir
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!preview} onClose={() => setPreview(null)} title="Pré-visualização" className="sm:max-w-[420px]">
        <SegmentedControl
          label="Tipo de pré-visualização"
          value={preview ?? "feed"}
          onValueChange={(v) => setPreview(v as "feed" | "reels")}
          options={[
            { value: "feed", label: "Feed" },
            { value: "reels", label: "Reels" },
          ]}
          className="mb-4"
        />
        <PhonePreview detail={detail} legenda={legenda} mode={preview ?? "feed"} />
      </Dialog>
    </div>
  );
}

function PhonePreview({ detail, legenda, mode }: { detail: DeliverableDetail; legenda: string; mode: "feed" | "reels" }) {
  const img = detail.media.find((m) => m.kind === "image" && m.url)?.url ?? null;
  const video = detail.media.find((m) => m.kind === "video" && m.url)?.url ?? null;
  const handle = detail.client.instagram ?? detail.client.nome.toLowerCase().replace(/\s+/g, "");
  if (mode === "reels") {
    return (
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[28px] bg-ink text-white">
        {video ? (
          <video src={video} className="absolute inset-0 size-full object-cover" muted loop autoPlay playsInline />
        ) : img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Sem vídeo ainda</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="mb-1 text-sm font-bold">{handle}</p>
          <p className="line-clamp-3 text-xs">{legenda || "Legenda do reels"}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[20px] border border-border bg-surface">
      <div className="flex items-center gap-2 p-3">
        <ClientAvatar name={detail.client.nome} color={detail.client.cor} size="md" className="rounded-full" />
        <b className="text-sm">{handle}</b>
      </div>
      <div className="aspect-[4/5] bg-background">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted">Sem arte ainda</div>
        )}
      </div>
      <div className="flex gap-3 p-3 text-ink">
        <Heart className="size-5" aria-hidden />
        <MessageCircle className="size-5" aria-hidden />
        <Send className="size-5" aria-hidden />
      </div>
      <p className="px-3 pb-4 text-sm whitespace-pre-wrap">
        <b>{handle}</b> {legenda || <span className="text-muted">Sem legenda ainda.</span>}
      </p>
    </div>
  );
}

function describeActivity(a: DeliverableDetail["activity"][number], members: DeliverableDetail["members"]) {
  switch (a.tipo) {
    case "criada":
      return "criou o post";
    case "status":
      return `moveu de ${statusLabels[a.de as keyof typeof statusLabels] ?? a.de} para ${statusLabels[a.para as keyof typeof statusLabels] ?? a.para}`;
    case "data":
      return a.para ? `mudou a publicação para ${formatDate(a.para)}` : "tirou a data de publicação";
    case "titulo":
      return a.para ? `renomeou para "${a.para}"` : "tirou o título";
    case "responsavel": {
      const nome = members.find((m) => m.id === a.para)?.nome;
      return nome ? `atribuiu a ${nome}` : "removeu o responsável";
    }
    default:
      return "alterou o post";
  }
}

export { deliverableLabel };
