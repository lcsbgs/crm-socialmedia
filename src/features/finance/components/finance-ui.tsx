"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { markPaid } from "../actions";
import {
  addScopeToNextCharge,
  closeMonth,
  createCharge,
  createExpense,
  deleteExpense,
  generateBoleto,
  issueInvoice,
  saveFinanceConfig,
  simulatePayment,
  type FinanceConfig,
} from "../billing-actions";

type Act = "boleto" | "nota" | "pagar" | "simular" | "escopo" | "despesa-apagar" | "fechar";

export function FinanceButton({
  act,
  workspaceId,
  id,
  month,
  children,
  variant = "outline",
}: {
  act: Act;
  workspaceId: string;
  id?: string;
  month?: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="xs"
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r =
            act === "boleto"
              ? await generateBoleto({ workspaceId, paymentId: id! })
              : act === "nota"
                ? await issueInvoice({ workspaceId, paymentId: id! })
                : act === "pagar"
                  ? await markPaid({ workspaceId, id: id! })
                  : act === "simular"
                    ? await simulatePayment({ workspaceId, paymentId: id! })
                    : act === "escopo"
                      ? await addScopeToNextCharge({ workspaceId, scopeId: id! })
                      : act === "fechar"
                        ? await closeMonth({ workspaceId, month: month! })
                        : await deleteExpense({ id: id! });
          if (r && "error" in r && r.error) toast.error(r.error);
          else toast.success((r && "message" in r && r.message) || "Pronto.");
          router.refresh();
        })
      }
    >
      {pending ? "..." : children}
    </Button>
  );
}

export function AutoBillingForm({ workspaceId, config, asaasConnected }: { workspaceId: string; config: FinanceConfig; asaasConnected: boolean }) {
  const [c, setC] = useState(config);
  const [, start] = useTransition();
  function save(next: FinanceConfig) {
    setC(next);
    start(async () => {
      const r = await saveFinanceConfig({ workspaceId, config: next });
      if ("error" in r) toast.error(r.error);
    });
  }
  const toggles: [keyof FinanceConfig, string][] = [
    ["auto_cobranca", `Gerar boleto e Pix ${c.dias_antes} dias antes do vencimento`],
    ["auto_whatsapp", "Mandar a cobrança pronta no WhatsApp"],
    ["auto_baixa", "Dar baixa sozinho quando o pagamento cair"],
    ["auto_nfse", "Emitir a NFS-e assim que o cliente pagar"],
  ];
  return (
    <div className="flex flex-col gap-3">
      <Select
        aria-label="Provedor de cobrança"
        value={c.provider}
        onValueChange={(v) => save({ ...c, provider: v as FinanceConfig["provider"] })}
        options={[
          { value: "manual", label: "Manual (eu registro os pagamentos)" },
          { value: "asaas", label: asaasConnected ? "Asaas conectado" : "Asaas (conecte em Integrações)" },
        ]}
      />
      {toggles.map(([k, label]) => (
        <Checkbox key={k} checked={!!c[k]} disabled={c.provider === "manual" && k !== "auto_baixa"} onChange={(e) => save({ ...c, [k]: e.currentTarget.checked })} label={<span className="text-base font-medium">{label}</span>} />
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="contador">E-mail do contador</Label>
        <Input id="contador" type="email" defaultValue={c.contador_email ?? ""} onBlur={(e) => e.target.value !== (c.contador_email ?? "") && save({ ...c, contador_email: e.target.value })} />
      </div>
    </div>
  );
}

export function NewChargeButton({ workspaceId, clients }: { workspaceId: string; clients: { id: string; nome: string }[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Nova cobrança
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nova cobrança">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const r = await createCharge({ workspaceId, clientId, descricao: String(f.get("descricao")), valor: String(f.get("valor")), vencimento: String(f.get("vencimento")) });
              if ("error" in r) return void toast.error(r.error);
              toast.success("Cobrança criada.");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <Label>Cliente</Label>
          <Select aria-label="Cliente" value={clientId} onValueChange={setClientId} options={clients.map((c) => ({ value: c.id, label: c.nome }))} />
          <Label htmlFor="cd">Descrição</Label>
          <Input id="cd" name="descricao" placeholder="Reels extra de Natal" required />
          <Label htmlFor="cv">Valor</Label>
          <Input id="cv" name="valor" inputMode="decimal" required />
          <Label htmlFor="cvc">Vencimento</Label>
          <Input id="cvc" name="vencimento" type="date" required />
          <Button type="submit" disabled={pending || !clientId} className="self-end">
            Criar
          </Button>
        </form>
      </Dialog>
    </>
  );
}

export function NewExpenseButton({ workspaceId, clients, label = "Lançar despesa" }: { workspaceId: string; clients: { id: string; nome: string }[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState("outros");
  const [clientId, setClientId] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Lançar despesa">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const r = await createExpense({ workspaceId, descricao: String(f.get("descricao")), categoria: categoria as "outros", valor: String(f.get("valor")), data: String(f.get("data")), clientId });
              if ("error" in r) return void toast.error(r.error);
              toast.success("Despesa lançada.");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <Label htmlFor="ed">Descrição</Label>
          <Input id="ed" name="descricao" required />
          <Label>Categoria</Label>
          <Select
            aria-label="Categoria"
            value={categoria}
            onValueChange={setCategoria}
            options={[
              { value: "freelancer", label: "Freelancer" },
              { value: "ferramentas", label: "Ferramentas" },
              { value: "impostos", label: "Impostos" },
              { value: "anuncios", label: "Anúncios" },
              { value: "equipe", label: "Equipe" },
              { value: "outros", label: "Outros" },
            ]}
          />
          <Label>Cliente (custo direto, opcional)</Label>
          <Select aria-label="Cliente" value={clientId} onValueChange={setClientId} options={[{ value: "", label: "Geral do estúdio" }, ...clients.map((c) => ({ value: c.id, label: c.nome }))]} />
          <Label htmlFor="ev">Valor</Label>
          <Input id="ev" name="valor" inputMode="decimal" required />
          <Label htmlFor="edt">Data</Label>
          <Input id="edt" name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          <Button type="submit" disabled={pending} className="self-end">
            Lançar
          </Button>
        </form>
      </Dialog>
    </>
  );
}

export { Trash2 };
