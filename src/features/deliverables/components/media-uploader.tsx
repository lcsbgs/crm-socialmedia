"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { attachMedia, removeMedia } from "../actions";
import type { Media } from "../queries";
import { ACCEPTED_MEDIA, MAX_MEDIA_BYTES, mediaPrefix } from "../schemas";

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  return `${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
}

export function MediaUploader({
  workspaceId,
  clientId,
  deliverableId,
  media,
  onChanged,
}: {
  workspaceId: string;
  clientId: string;
  deliverableId: string;
  media: Media[];
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const tooBig = [...files].find((f) => f.size > MAX_MEDIA_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} passa de 50 MB.`);
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const prefix = mediaPrefix(workspaceId, clientId, deliverableId);
    const paths: string[] = [];
    for (const file of files) {
      const path = prefix + safeName(file.name);
      const { error: uploadError } = await supabase.storage.from("midia").upload(path, file, {
        contentType: file.type,
      });
      if (uploadError) {
        setError(`Não foi possível enviar ${file.name}.`);
        continue;
      }
      paths.push(path);
    }
    if (paths.length) {
      const result = await attachMedia({ workspaceId, id: deliverableId, paths });
      if (result.error) setError(result.error);
    }
    setUploading(false);
    onChanged?.();
    router.refresh();
  }

  function remove(path: string) {
    startTransition(async () => {
      const result = await removeMedia({ workspaceId, id: deliverableId, path });
      if (result.error) setError(result.error);
      onChanged?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Mídia</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {media.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {media.map((m) => (
            <li key={m.path} className="overflow-hidden rounded-xl border border-border">
              <div className="flex aspect-square items-center justify-center bg-background">
                {m.url && m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
                  <img src={m.url} alt="" className="size-full object-cover" />
                ) : m.url && m.kind === "video" ? (
                  <video src={m.url} controls className="size-full object-cover" />
                ) : (
                  <a href={m.url ?? "#"} target="_blank" rel="noreferrer" className="text-sm underline">
                    Abrir arquivo
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1">
                <span className="truncate text-xs text-muted">{m.path.split("/").pop()?.slice(9)}</span>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(m.path)}>
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted hover:bg-hover focus-within:outline-2 focus-within:outline-accent">
        <input
          type="file"
          multiple
          accept={ACCEPTED_MEDIA}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? "Enviando..." : "Adicionar imagens, vídeos ou PDF (até 50 MB)"}
      </label>
    </div>
  );
}
