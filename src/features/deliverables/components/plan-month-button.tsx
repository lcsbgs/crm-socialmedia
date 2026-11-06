"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { planMonth } from "../actions";

export function PlanMonthButton({ workspaceId, month, label, href }: { workspaceId: string; month: string; label: string; href: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await planMonth({ workspaceId, month });
          if ("error" in r) toast.error(r.error);
          else {
            toast.success(r.criados ? `${r.criados} posts planejados pelos pacotes.` : "O mês já estava planejado. Nada duplicado.");
            router.push(href);
          }
        })
      }
    >
      {pending ? "Planejando..." : label}
    </Button>
  );
}
