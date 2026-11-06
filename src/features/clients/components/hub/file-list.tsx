"use client";

import { Download, FileText, ImageIcon, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";
import { deleteClientFile } from "../../hub-actions";

export type ClientFileView = {
  id: string;
  nome: string;
  mime: string | null;
  tamanho: number | null;
  created_at: string;
  url: string | null;
};

function size(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.ceil(n / 1024)} KB`;
}

export function ClientFileList({ workspaceId, files, readOnly }: { workspaceId: string; files: ClientFileView[]; readOnly?: boolean }) {
  const [, start] = useTransition();
  if (!files.length) return <p className="text-sm text-muted">Nenhum arquivo ainda.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {files.map((f) => {
        const img = f.mime?.startsWith("image/");
        return (
          <li key={f.id} className="flex items-center gap-3 rounded-inner bg-background p-2.5">
            {img && f.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-muted">
                {img ? <ImageIcon className="size-5" aria-hidden /> : <FileText className="size-5" aria-hidden />}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{f.nome}</span>
              <span className="block text-xs text-muted">
                {[size(f.tamanho), formatRelativeTime(f.created_at)].filter(Boolean).join(", ")}
              </span>
            </span>
            {f.url ? (
              <a href={f.url} target="_blank" rel="noreferrer" aria-label={`Baixar ${f.nome}`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-surface">
                <Download className="size-[18px]" aria-hidden />
              </a>
            ) : null}
            {readOnly ? null : (
              <IconButton
                label={`Apagar ${f.nome}`}
                variant="ghost"
                onClick={() =>
                  start(async () => {
                    const r = await deleteClientFile({ workspaceId, id: f.id });
                    if ("error" in r) toast.error(r.error);
                  })
                }
              >
                <Trash2 aria-hidden />
              </IconButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
