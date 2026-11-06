import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  if (await getSessionUser()) redirect("/w");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="space-y-2">
        <h1 className="font-display text-xl">{brand.name}</h1>
        <p className="text-muted">{brand.tagline}</p>
      </div>
      <p className="text-sm text-muted">{brand.description}</p>
      <div className="flex gap-3">
        <Link href="/cadastro" className={buttonClasses()}>
          Criar conta grátis
        </Link>
        <Link href="/login" className={buttonClasses("secondary")}>
          Entrar
        </Link>
      </div>
    </main>
  );
}
