import { redirect } from "next/navigation";

// Cadastro e login ficam na mesma tela (aba Criar conta).
export default async function SignupPage({ searchParams }: PageProps<"/cadastro">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/w";
  redirect(`/login?modo=criar&next=${encodeURIComponent(next)}`);
}
