"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { setWorkspaceLogo } from "../actions";

const MAX = 2 * 1024 * 1024;

export function BrandForm({
  workspaceId,
  logoUrl,
  canEdit,
}: {
  workspaceId: string;
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return void toast.error("Use PNG, JPG ou WebP.");
    if (file.size > MAX) return void toast.error("O logo precisa ter até 2 MB.");
    setUploading(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${workspaceId}/marca/${crypto.randomUUID().slice(0, 8)}-logo.${ext}`;
    const { error } = await createClient()
      .storage.from("midia")
      .upload(path, file, { contentType: file.type });
    if (error) {
      setUploading(false);
      return void toast.error("Não foi possível enviar o logo.");
    }
    const r = await setWorkspaceLogo({ workspaceId, path });
    setUploading(false);
    if (r.error) toast.error(r.error);
    else {
      toast.success("Logo atualizado");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-border bg-background">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
          <img src={logoUrl} alt="Logo atual" className="max-h-10 max-w-24 object-contain" />
        ) : (
          <span className="text-xs text-muted">Sem logo</span>
        )}
      </div>
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 text-sm font-medium hover:bg-hover focus-within:outline-2 focus-within:outline-accent">
            <ImagePlus className="size-4 text-muted" aria-hidden />
            {uploading ? "Enviando" : logoUrl ? "Trocar logo" : "Enviar logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {logoUrl ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await setWorkspaceLogo({ workspaceId, path: null });
                  if (r.error) toast.error(r.error);
                  else router.refresh();
                })
              }
            >
              <Trash2 aria-hidden />
              Remover
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
