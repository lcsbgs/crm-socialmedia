import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl">Entrar</h1>
        <p className="text-sm text-muted">Acesse sua conta para continuar.</p>
      </div>
      {params.erro ? <Alert tone="error">O link expirou ou é inválido. Tente de novo.</Alert> : null}
      <LoginForm next={next} />
      <p className="text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link
          href={`/cadastro?next=${encodeURIComponent(next)}`}
          className="font-medium text-foreground underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
