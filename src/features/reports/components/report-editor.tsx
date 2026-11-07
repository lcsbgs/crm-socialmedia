"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { generateReport, saveReport } from "../actions";

export function GenerateReportButton({ workspaceId, clientId, month, label }: { workspaceId: string; clientId: string; month: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await generateReport({ workspaceId, clientId, month });
          if ("error" in r) return void toast.error(r.error);
          toast.success(r.warning ?? "Relatório gerado com a leitura da IA. Revise antes de publicar.");
          router.refresh();
        })
      }
    >
      <Sparkles aria-hidden />
      {pending ? "Gerando..." : label}
    </Button>
  );
}

export function ReportReading({ id, leitura, status, url }: { id: string; leitura: string; status: string; url: string }) {
  const [texto, setTexto] = useState(leitura);
  const [pending, start] = useTransition();
  const router = useRouter();
  function save(publicar: boolean) {
    start(async () => {
      const r = await saveReport({ id, leitura: texto, publicar });
      if ("error" in r) return void toast.error(r.error);
      toast.success(publicar ? "Publicado no portal do cliente." : "Salvo.");
      router.refresh();
    });
  }
  return (
    <div className="flex flex-col gap-3">
      <Textarea aria-label="Leitura do mês" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => save(false)} disabled={pending}>
          Salvar
        </Button>
        <Button onClick={() => save(true)} disabled={pending}>
          {status === "publicado" ? "Atualizar publicado" : "Publicar para o cliente"}
        </Button>
        {status === "publicado" ? <CopyButton value={url} /> : null}
        <a href={`${url}?imprimir=1`} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "md")}>
          Baixar PDF
        </a>
      </div>
    </div>
  );
}
