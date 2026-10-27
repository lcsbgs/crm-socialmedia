import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-10">
      <h1 className="text-lg font-semibold">Cliente não encontrado</h1>
      <p className="text-sm text-muted">Ele pode ter sido excluído ou o link está incorreto.</p>
      <Link href="../clientes" className={buttonClasses("secondary")}>
        Ver clientes
      </Link>
    </div>
  );
}
