"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { toast } from "@/components/ui/toast";
import { attachMedia } from "@/features/deliverables/actions";
import { saveDeliverableVersion } from "@/features/deliverables/detail-actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Gera uma arte PNG de exemplo no navegador (modo demonstração) a partir das cores da marca.
async function drawArt(opts: { titulo: string; cliente: string; fundo: string; texto: string; pagina: number; total: number; w: number; h: number }) {
  const c = document.createElement("canvas");
  c.width = opts.w;
  c.height = opts.h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = opts.fundo;
  ctx.fillRect(0, 0, opts.w, opts.h);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(opts.w * 0.85, opts.h * 0.15, opts.w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = opts.texto;
  ctx.font = `700 ${Math.round(opts.w / 12)}px sans-serif`;
  const words = opts.titulo.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > opts.w * 0.8) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, opts.w * 0.08, opts.h * 0.45 + i * (opts.w / 10)));
  ctx.font = `500 ${Math.round(opts.w / 28)}px sans-serif`;
  ctx.fillText(opts.cliente, opts.w * 0.08, opts.h * 0.9);
  if (opts.total > 1) ctx.fillText(`${opts.pagina}/${opts.total}`, opts.w * 0.82, opts.h * 0.9);
  return new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
}

export type DemoArtProps = {
  workspaceId: string;
  clientId: string;
  deliverableId: string;
  titulo: string;
  cliente: string;
  cores: string[];
  formato: string;
  origem: "canva" | "drive";
  back: string;
};

export function DemoArtStudio(p: DemoArtProps) {
  const router = useRouter();
  const palette = p.cores.length ? p.cores : ["#6B4EFF", "#F28C28", "#1C8C86"];
  const [cor, setCor] = useState(palette[0]);
  const [titulo, setTitulo] = useState(p.titulo);
  const [paginas, setPaginas] = useState(p.formato === "carrossel" ? 3 : 1);
  const [pending, start] = useTransition();
  const vertical = p.formato === "reels" || p.formato === "story";
  const size = vertical ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 };

  function finish() {
    start(async () => {
      const supabase = createClient();
      const paths: string[] = [];
      for (let i = 1; i <= paginas; i++) {
        const blob = await drawArt({ titulo, cliente: p.cliente, fundo: cor, texto: "#FFFFFF", pagina: i, total: paginas, ...size });
        const path = `${p.workspaceId}/${p.clientId}/${p.deliverableId}/${p.origem}-demo-${Date.now()}-${i}.png`;
        const { error } = await supabase.storage.from("midia").upload(path, blob, { contentType: "image/png" });
        if (error) return void toast.error("Não foi possível salvar a arte.");
        paths.push(path);
      }
      const r = await attachMedia({ workspaceId: p.workspaceId, id: p.deliverableId, paths });
      if (r && "error" in r && r.error) return void toast.error(r.error);
      await saveDeliverableVersion({ workspaceId: p.workspaceId, id: p.deliverableId, origem: p.origem });
      toast.success("Arte entrou no post como nova versão.");
      router.push(p.back);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex items-center justify-center rounded-card bg-[#2B2F38] p-6">
        <div
          className={cn("relative flex w-full max-w-[360px] flex-col justify-end overflow-hidden rounded-lg p-6 text-white", vertical ? "aspect-[9/16]" : "aspect-[4/5]")}
          style={{ backgroundColor: cor }}
        >
          <span className="absolute -top-16 -right-16 size-56 rounded-full bg-white/20" />
          <p className="font-display text-3xl leading-tight">{titulo}</p>
          <p className="mt-6 text-sm opacity-90">{p.cliente}</p>
          {paginas > 1 ? <span className="absolute right-4 bottom-4 text-sm">1/{paginas}</span> : null}
        </div>
      </div>
      <aside className="flex flex-col gap-4 rounded-card bg-surface p-[22px]">
        <DemoBadge className="self-start" />
        <p className="text-sm text-muted">
          {p.origem === "canva" ? "Editor do Canva simulado." : "Arquivos do Google Drive simulados."} No modo real, esta tela é o próprio {p.origem === "canva" ? "Canva" : "seletor do Drive"}.
        </p>
        <label className="space-y-1.5 text-sm font-semibold">
          Texto da arte
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-11 w-full rounded-input border border-border-input px-3.5 text-md font-normal" />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Cor da marca</legend>
          <div className="flex gap-2">
            {palette.map((c) => (
              <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={cor === c} onClick={() => setCor(c)} className={cn("size-9 rounded-full border-2", cor === c ? "border-ink" : "border-transparent")} style={{ backgroundColor: c }} />
            ))}
          </div>
        </fieldset>
        {p.formato === "carrossel" ? (
          <label className="space-y-1.5 text-sm font-semibold">
            Páginas
            <input type="number" min={2} max={10} value={paginas} onChange={(e) => setPaginas(Math.min(10, Math.max(2, Number(e.target.value))))} className="h-11 w-full rounded-input border border-border-input px-3.5 text-md font-normal" />
          </label>
        ) : null}
        <Button size="lg" onClick={finish} disabled={pending}>
          {pending ? "Salvando..." : p.origem === "canva" ? "Voltar para o Pauta" : "Usar este arquivo"}
        </Button>
        <Button variant="ghost" onClick={() => router.push(p.back)}>
          Cancelar
        </Button>
      </aside>
    </div>
  );
}
