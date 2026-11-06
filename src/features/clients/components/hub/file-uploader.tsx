"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { registerClientFile } from "../../hub-actions";

const MAX = 50 * 1024 * 1024;

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
}

// Envia direto para o Storage (bucket privado midia) e registra em client_files.
export function ClientFileUploader({
  workspaceId,
  clientId,
  categoria,
  label = "Enviar arquivo",
}: {
  workspaceId: string;
  clientId: string;
  categoria: "geral" | "marca" | "briefing" | "contrato";
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      if (file.size > MAX) {
        toast.error(`${file.name} passa de 50 MB.`);
        continue;
      }
      const path = `${workspaceId}/clientes/${clientId}/${categoria}/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`;
      const { error } = await supabase.storage.from("midia").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`Não foi possível enviar ${file.name}.`);
        continue;
      }
      const r = await registerClientFile({ workspaceId, clientId, path, nome: file.name, mime: file.type, tamanho: file.size, categoria });
      if ("error" in r) toast.error(r.error);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-base font-semibold hover:bg-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
      <Upload className="size-[18px]" aria-hidden />
      {busy ? "Enviando..." : label}
      <input ref={input} type="file" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
    </label>
  );
}
