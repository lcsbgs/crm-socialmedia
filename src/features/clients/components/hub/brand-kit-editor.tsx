"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { saveBrandKit, setBrandKitSharing } from "../../hub-actions";
import type { BrandKitInput } from "../../hub-schemas";
import { TagInput } from "./tag-input";

export function BrandKitEditor({
  workspaceId,
  clientId,
  initial,
  shareUrl,
  shared,
}: {
  workspaceId: string;
  clientId: string;
  initial: BrandKitInput;
  shareUrl: string | null;
  shared: boolean;
}) {
  const [k, setK] = useState<BrandKitInput>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof BrandKitInput>(key: K, v: BrandKitInput[K]) => setK((c) => ({ ...c, [key]: v }));

  return (
    <Card>
      <CardHeader
        title="Kit da marca"
        description="Cores, tom de voz e o que não pode aparecer. A IA usa isso nas legendas."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {shared && shareUrl ? <CopyButton value={shareUrl} label="Copiar link do kit" /> : null}
            <Button
              variant={shared ? "ghost" : "outline"}
              size="sm"
              onClick={() =>
                start(async () => {
                  const r = await setBrandKitSharing({ workspaceId, clientId, ativo: !shared });
                  if ("error" in r) toast.error(r.error);
                  else toast.success(shared ? "Link do kit desligado." : "Link só leitura ligado. Copie e mande para o designer.");
                })
              }
            >
              {shared ? "Desligar link" : "Compartilhar com designer"}
            </Button>
          </div>
        }
      />
      <div className="grid gap-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Cores</legend>
          <div className="flex flex-wrap gap-2.5">
            {k.cores.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-inner bg-background p-1.5">
                <input
                  type="color"
                  aria-label={`Cor ${i + 1}`}
                  value={c.hex}
                  onChange={(e) => set("cores", k.cores.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))}
                  className="size-9 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <Input aria-label={`Nome da cor ${i + 1}`} value={c.nome} placeholder={c.hex} onChange={(e) => set("cores", k.cores.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} className="h-9 w-28 text-sm" />
                <IconButton label="Remover cor" variant="ghost" size="sm" onClick={() => set("cores", k.cores.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </IconButton>
              </div>
            ))}
            <Button variant="tonal" size="sm" onClick={() => set("cores", [...k.cores, { hex: "#6B4EFF", nome: "" }])}>
              <Plus aria-hidden />
              Cor
            </Button>
          </div>
        </fieldset>
        <TagInput id="tom" label="Tom de voz" value={k.tom} onChange={(v) => set("tom", v)} placeholder="acolhedor, de bairro, bem-humorado" />
        <TagInput id="evitar" label="Nunca dizer" value={k.evitar} onChange={(v) => set("evitar", v)} placeholder="industrializado, promoção relâmpago" tone="late" />
        <div className="space-y-1.5">
          <Label htmlFor="fontes">Fontes</Label>
          <Input id="fontes" value={k.fontes ?? ""} onChange={(e) => set("fontes", e.target.value)} placeholder="Títulos em Playfair, texto em Lato" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="obs">Observações para quem cria</Label>
          <Textarea id="obs" rows={3} value={k.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
        </div>
        <Button
          className="self-end"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveBrandKit({ ...k, workspaceId, clientId });
              if ("error" in r) toast.error(r.error);
              else toast.success("Kit salvo.");
            })
          }
        >
          {pending ? "Salvando..." : "Salvar kit"}
        </Button>
      </div>
    </Card>
  );
}
