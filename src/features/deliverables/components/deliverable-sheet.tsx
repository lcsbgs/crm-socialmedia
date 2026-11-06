"use client";

import { Link2, MessageCircle, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useShell } from "@/components/shell/shell-context";
import { ClientTag, UserAvatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Sheet } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { portalMessage } from "@/features/portal/components/portal-share";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { deleteDeliverable } from "../actions";
import {
  addComment,
  deleteComment,
  getDeliverableDetail,
  updateDeliverableFields,
  type DeliverableDetail,
} from "../detail-actions";
import { deliverableLabel, formatLabels, statusColumns } from "../schemas";
import { MediaUploader } from "./media-uploader";

const statusLabel = Object.fromEntries(statusColumns.map((c) => [c.id, c.label])) as Record<string, string>;
const formatOptions = Object.entries(formatLabels).map(([value, label]) => ({ value, label }));
const statusOptions = statusColumns.map((c) => ({ value: c.id, label: c.label }));

// Abre/fecha o painel pela URL (?entrega=id), sem trocar de página.
export function useDeliverableSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("entrega", id);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  const close = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("entrega");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);
  return { id: params.get("entrega"), open, close };
}

export function DeliverableSheetHost() {
  const { workspace } = useShell();
  const { id, close } = useDeliverableSheet();
  const [detail, setDetail] = useState<DeliverableDetail | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const load = useCallback(
    async (targetId: string) => {
      const d = await getDeliverableDetail({ workspaceId: workspace.id, id: targetId });
      setDetail(d);
      setLoadedId(targetId);
      if (!d) toast.error("Entrega não encontrada");
    },
    [workspace.id],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getDeliverableDetail({ workspaceId: workspace.id, id }).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoadedId(id);
      if (!d) toast.error("Entrega não encontrada");
    });
    return () => {
      cancelled = true;
    };
  }, [id, workspace.id]);

  const ready = !!id && loadedId === id && detail?.id === id;

  return (
    <Sheet open={!!id} onClose={close} title={ready && detail ? deliverableLabel(detail) : "Entrega"}>
      {ready && detail ? (
        <DeliverablePanel key={detail.id} detail={detail} reload={() => load(detail.id)} onDeleted={close} />
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </Sheet>
  );
}

function DeliverablePanel({
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
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const base = `/w/${workspace.slug}`;

  function save(patch: Parameters<typeof updateDeliverableFields>[0]["patch"], success?: string) {
    start(async () => {
      const r = await updateDeliverableFields({ workspaceId: detail.workspaceId, id: detail.id, patch });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (success) toast.success(success);
      await reload();
      router.refresh();
    });
  }

  function sendForApproval() {
    start(async () => {
      const r = await updateDeliverableFields({
        workspaceId: detail.workspaceId,
        id: detail.id,
        patch: { status: "em_aprovacao" },
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      const wa = whatsappLink(
        detail.client.contatoTelefone,
        portalMessage(detail.client.portalUrl, detail.client.contatoNome, 1),
      );
      toast.success("Enviada para aprovação", {
        description: "Avise o cliente pelo link do portal.",
        action: { label: "WhatsApp", onClick: () => window.open(wa, "_blank", "noopener") },
      });
      await reload();
      router.refresh();
    });
  }

  const canSend = detail.status === "planejar" || detail.status === "produzir";

  return (
    <div className="space-y-6">
      {/* Cabeçalho do conteúdo */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${base}/clientes/${detail.client.id}`} className="hover:underline">
            <ClientTag name={detail.client.nome} color={detail.client.cor} />
          </Link>
          {detail.slot_label ? <span className="text-sm text-muted">· {detail.slot_label}</span> : null}
        </div>
        <Input
          aria-label="Título"
          value={titulo}
          placeholder={detail.slot_label ? `${detail.slot_label}: dê um título` : "Título"}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => titulo !== (detail.titulo ?? "") && save({ titulo })}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="h-9 border-transparent px-1.5 text-md font-semibold hover:border-border"
        />
        <div className="flex flex-wrap items-center gap-2">
          {canSend ? (
            <Button size="sm" disabled={pending} onClick={sendForApproval}>
              <Send aria-hidden />
              Enviar para aprovação
            </Button>
          ) : null}
          {detail.status === "em_aprovacao" ? (
            <a
              href={whatsappLink(
                detail.client.contatoTelefone,
                portalMessage(detail.client.portalUrl, detail.client.contatoNome, 1),
              )}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              <MessageCircle aria-hidden />
              Lembrar o cliente
            </a>
          ) : null}
          <a
            href={detail.client.portalUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses("ghost", "sm")}
          >
            <Link2 aria-hidden />
            Ver no portal
          </a>
        </div>
      </div>

      {/* Atributos */}
      <dl className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted">Etapa</dt>
        <dd>
          <Select
            size="sm"
            aria-label="Etapa"
            value={detail.status}
            options={statusOptions}
            onValueChange={(v) => save({ status: v as never })}
          />
        </dd>
        <dt className="text-muted">Formato</dt>
        <dd>
          <Select
            size="sm"
            aria-label="Formato"
            value={detail.formato}
            options={formatOptions}
            onValueChange={(v) => save({ formato: v as never })}
          />
        </dd>
        <dt className="text-muted">Publicação</dt>
        <dd>
          <DatePicker
            size="sm"
            value={detail.data_publicacao}
            onChange={(v) => save({ data_publicacao: v })}
            aria-label="Data de publicação"
          />
        </dd>
        <dt className="text-muted">Responsável</dt>
        <dd>
          <Select
            size="sm"
            aria-label="Responsável"
            value={detail.responsavel_id ?? ""}
            placeholder="Ninguém"
            options={[
              { value: "", label: "Ninguém" },
              ...detail.members.map((m) => ({ value: m.id, label: m.nome })),
            ]}
            onValueChange={(v) => save({ responsavel_id: v || null })}
          />
        </dd>
      </dl>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="legenda">Legenda</Label>
          <span className="tabular text-xs text-muted">{legenda.length}/2200</span>
        </div>
        <Textarea
          id="legenda"
          rows={7}
          value={legenda}
          placeholder="Escreva a legenda. Salva quando você sai do campo."
          onChange={(e) => setLegenda(e.target.value)}
          onBlur={() => legenda !== (detail.legenda ?? "") && save({ legenda }, "Legenda salva")}
        />
      </div>

      <MediaUploader
        workspaceId={detail.workspaceId}
        clientId={detail.client.id}
        deliverableId={detail.id}
        media={detail.media}
        onChanged={() => void reload()}
      />

      {detail.approvals.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Respostas do cliente</h3>
          <ul className="space-y-2">
            {detail.approvals.map((a, i) => (
              <li key={i} className="rounded-xl border border-border p-2.5 text-sm">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn("size-1.5 rounded-full", a.decisao === "aprovado" ? "bg-ok" : "bg-waiting")}
                    aria-hidden
                  />
                  <span className="font-medium">{a.decisao === "aprovado" ? "Aprovou" : "Pediu ajuste"}</span>
                  <span className="text-muted">
                    · {a.autor_nome} · {formatRelativeTime(a.created_at)}
                  </span>
                </p>
                {a.comentario ? <p className="mt-1 whitespace-pre-line">{a.comentario}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Comentários</h3>
        {detail.comments.length ? (
          <ul className="space-y-3">
            {detail.comments.map((c) => (
              <li key={c.id} className="group flex gap-2.5">
                <UserAvatar name={c.author?.nome ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{c.author?.nome ?? "Alguém"}</span>{" "}
                    <span className="text-muted">{formatRelativeTime(c.created_at)}</span>
                  </p>
                  <p className="text-base whitespace-pre-line">{c.corpo}</p>
                </div>
                {c.mine ? (
                  <button
                    type="button"
                    aria-label="Apagar comentário"
                    className="h-7 rounded-xl px-1.5 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-hover"
                    onClick={() =>
                      start(async () => {
                        await deleteComment({ workspaceId: detail.workspaceId, id: c.id });
                        await reload();
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sem comentários ainda.</p>
        )}
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!comment.trim()) return;
            start(async () => {
              const r = await addComment({ workspaceId: detail.workspaceId, id: detail.id, corpo: comment });
              if (r.error) toast.error(r.error);
              else {
                setComment("");
                await reload();
              }
            });
          }}
        >
          <Textarea
            aria-label="Novo comentário"
            rows={2}
            value={comment}
            placeholder="Comente para a equipe"
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="secondary" disabled={pending || !comment.trim()}>
              Comentar
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Histórico</h3>
        <ul className="space-y-1.5 text-sm text-muted">
          {detail.activity.map((a) => (
            <li key={a.id}>
              <span className="text-ink">{a.actor ?? "Sistema"}</span> {describeActivity(a, detail.members)}{" "}
              <span>· {formatRelativeTime(a.created_at)}</span>
            </li>
          ))}
          <li>Criada {formatRelativeTime(detail.created_at)}</li>
        </ul>
      </section>

      <div className="border-t border-border pt-4">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Excluir a entrega e os arquivos dela?</span>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteDeliverable({ workspaceId: detail.workspaceId, id: detail.id });
                  if (r.error) toast.error(r.error);
                  else {
                    toast.success("Entrega excluída");
                    onDeleted();
                    router.refresh();
                  }
                })
              }
            >
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden />
            Excluir entrega
          </Button>
        )}
      </div>
    </div>
  );
}

function describeActivity(a: DeliverableDetail["activity"][number], members: DeliverableDetail["members"]) {
  switch (a.tipo) {
    case "criada":
      return "criou a entrega";
    case "status":
      return `moveu de ${statusLabel[a.de ?? ""] ?? a.de} para ${statusLabel[a.para ?? ""] ?? a.para}`;
    case "data":
      return a.para ? `mudou a publicação para ${formatDate(a.para)}` : "tirou a data de publicação";
    case "titulo":
      return a.para ? `renomeou para "${a.para}"` : "tirou o título";
    case "responsavel": {
      const nome = members.find((m) => m.id === a.para)?.nome;
      return nome ? `atribuiu a ${nome}` : "removeu o responsável";
    }
    default:
      return "alterou a entrega";
  }
}
