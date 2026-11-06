import { Card, CardHeader } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { buttonClasses } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { planLabels, type PlanTier } from "@/lib/labels";

type Usage = {
  plano: PlanTier;
  max_members: number;
  max_clients: number | null;
  members: number;
  pending_invitations: number;
  clients: number;
};

export function PlanCard({ usage, canUpgrade }: { usage: Usage; canUpgrade: boolean }) {
  const clients = usage.clients;
  const seats = usage.members + usage.pending_invitations;
  const atSeatLimit = seats >= usage.max_members;
  const atClientLimit = usage.max_clients !== null && clients >= usage.max_clients;

  return (
    <Card>
      <CardHeader
        title={`Plano ${planLabels[usage.plano]}`}
        description="Limites do plano atual deste workspace."
      />
      <dl className="grid gap-4 sm:grid-cols-2">
        <UsageMeter
          label="Usuários"
          used={seats}
          max={usage.max_members}
          detail={
            usage.pending_invitations
              ? `inclui ${plural(usage.pending_invitations, "convite pendente", "convites pendentes")}`
              : undefined
          }
        />
        <UsageMeter label="Clientes ativos" used={clients} max={usage.max_clients} />
      </dl>
      {canUpgrade && usage.plano !== "estudio" ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            {atSeatLimit || atClientLimit
              ? "Você atingiu um limite do plano. Faça upgrade para crescer sem travas."
              : "Precisa de mais usuários ou clientes? Conheça os planos pagos."}
          </p>
          <a
            href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent(`Upgrade de plano · ${brand.name}`)}`}
            className={buttonClasses("primary", "sm")}
          >
            Fazer upgrade
          </a>
        </div>
      ) : null}
    </Card>
  );
}

function UsageMeter({
  label,
  used,
  max,
  detail,
}: {
  label: string;
  used: number;
  max: number | null;
  detail?: string;
}) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <dt className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted">
          {used} de {max ?? "ilimitado"}
        </span>
      </dt>
      <dd>
        {max ? (
          <div
            role="meter"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={used}
            className="h-2 overflow-hidden rounded-full bg-border"
          >
            <div
              className={pct >= 100 ? "h-full bg-warning" : "h-full bg-primary"}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
        {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
      </dd>
    </div>
  );
}
