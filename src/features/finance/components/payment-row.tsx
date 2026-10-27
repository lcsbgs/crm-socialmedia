import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { formatBRL, formatDate, formatMonth } from "@/lib/format";
import { firstName, whatsappLink } from "@/lib/whatsapp";
import { markPaymentPaid, undoPayment } from "../actions";
import type { PaymentView } from "../queries";

const tone = { pago: "success", pendente: "neutral", atrasado: "danger" } as const;
const label = { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado" } as const;

function chargeMessage(p: PaymentView) {
  const oi = p.contatoNome ? `Oi, ${firstName(p.contatoNome)}!` : "Oi!";
  const mes = formatMonth(p.competencia).toLowerCase();
  return p.status === "atrasado"
    ? `${oi} Tudo bem? A mensalidade de ${mes}, no valor de ${formatBRL(p.valor)}, venceu em ${formatDate(p.vencimento)} e ainda não identifiquei o pagamento. Consegue verificar para mim? Se já pagou, me manda o comprovante, por favor. Obrigado!`
    : `${oi} Passando para lembrar da mensalidade de ${mes}, no valor de ${formatBRL(p.valor)}, com vencimento em ${formatDate(p.vencimento)}. Obrigado!`;
}

export function PaymentRow({
  workspaceId,
  payment,
  clientHref,
  showMonth,
}: {
  workspaceId: string;
  payment: PaymentView;
  clientHref?: string;
  showMonth?: boolean;
}) {
  const p = payment;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">
          {clientHref ? (
            <Link href={clientHref} className="hover:underline">
              {p.clienteNome}
            </Link>
          ) : (
            formatMonth(p.competencia)
          )}
          {clientHref && showMonth ? (
            <span className="font-normal text-muted"> · {formatMonth(p.competencia)}</span>
          ) : null}
        </p>
        <p className="text-muted">
          Vence {formatDate(p.vencimento)}
          {p.pago_em ? ` · pago em ${formatDate(p.pago_em)}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{formatBRL(p.valor)}</span>
        <Badge tone={tone[p.status]}>{label[p.status]}</Badge>
        {p.status === "pago" ? (
          <form action={undoPayment}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="id" value={p.id} />
            <Button type="submit" variant="ghost" size="sm">
              Desfazer
            </Button>
          </form>
        ) : (
          <>
            <a
              href={whatsappLink(p.contatoTelefone, chargeMessage(p))}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              Cobrar no WhatsApp
            </a>
            <form action={markPaymentPaid}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" size="sm">
                Marcar como pago
              </Button>
            </form>
          </>
        )}
      </div>
    </li>
  );
}
