"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useShell } from "@/components/shell/shell-context";
import { Sheet } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { getDeliverableDetail, type DeliverableDetail } from "../detail-actions";
import { PostEditor } from "./post-editor";

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
      if (!d) toast.error("Post não encontrado");
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
      if (!d) toast.error("Post não encontrado");
    });
    return () => {
      cancelled = true;
    };
  }, [id, workspace.id]);

  const ready = !!id && loadedId === id && detail?.id === id;

  return (
    <Sheet open={!!id} onClose={close} title={ready && detail ? detail.client.nome : "Post"}>
      {ready && detail ? (
        <PostEditor key={detail.id} detail={detail} reload={() => load(detail.id)} onDeleted={close} />
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
