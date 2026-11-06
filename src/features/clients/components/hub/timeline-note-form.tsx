"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { addTimelineNote } from "../../hub-actions";

export function TimelineNoteForm({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const titulo = ref.current?.value ?? "";
        start(async () => {
          const r = await addTimelineNote({ workspaceId, clientId, titulo });
          if ("error" in r) toast.error(r.error);
          else if (ref.current) ref.current.value = "";
        });
      }}
    >
      <label htmlFor="nota-tl" className="sr-only">
        Registrar na linha do tempo
      </label>
      <Input id="nota-tl" ref={ref} placeholder="Registrar algo: ligação, combinado, visita..." className="flex-1" />
      <Button type="submit" variant="tonal" disabled={pending}>
        Registrar
      </Button>
    </form>
  );
}
