"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { updateClientChannels } from "../../hub-actions";

export function ClientChannelsForm({
  workspaceId,
  clientId,
  instagram,
  drive,
}: {
  workspaceId: string;
  clientId: string;
  instagram: string;
  drive: string;
}) {
  const [ig, setIg] = useState(instagram);
  const [dr, setDr] = useState(drive);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateClientChannels({ workspaceId, clientId, instagram: ig, drive: dr });
          if ("error" in r) toast.error(r.error);
          else toast.success("Salvo.");
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ig">Instagram</Label>
        <Input id="ig" value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@marca" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="drive">Pasta no Google Drive</Label>
        <Input id="drive" value={dr} onChange={(e) => setDr(e.target.value)} placeholder="https://drive.google.com/..." />
      </div>
      <Button type="submit" variant="outline" size="sm" className="self-end" disabled={pending}>
        Salvar
      </Button>
    </form>
  );
}
