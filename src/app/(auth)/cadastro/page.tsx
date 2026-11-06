import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/features/auth/components/signup-form";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl">Criar conta</h1>
        <p className="text-sm text-muted">Comece grátis. Leva menos de um minuto.</p>
      </div>
      <SignUpForm next={next} />
      <p className="text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-foreground underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
