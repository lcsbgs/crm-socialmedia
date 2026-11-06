"use server";

import { redirect } from "next/navigation";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { safeNext } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema, signInSchema, signUpSchema } from "./schemas";

function callbackUrl(next: string) {
  return `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirme seu e-mail antes de entrar."
          : "E-mail ou senha incorretos.",
      data: { email: parsed.data.email },
    };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { nome: parsed.data.nome }, emailRedirectTo: callbackUrl(next) },
  });
  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Já existe uma conta com este e-mail."
          : "Não foi possível criar a conta. Tente de novo.",
    };
  }
  if (!data.session) {
    return { message: "Conta criada. Enviamos um link de confirmação para o seu e-mail." };
  }
  redirect(next);
}

export async function sendMagicLink(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl(safeNext(formData.get("next"))) },
  });
  if (error) return { error: "Não foi possível enviar o link. Tente de novo em instantes." };
  return { message: "Pronto. Confira seu e-mail e clique no link para entrar." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Login social (Google, Apple, ChatGPT). Em modo demonstração abre a tela simulada.
export async function startProviderLogin(formData: FormData) {
  const { loginAdapter, isLoginProvider } = await import("./providers");
  const provider = String(formData.get("provider") ?? "");
  const next = safeNext(formData.get("next"));
  if (!isLoginProvider(provider)) redirect("/login");
  const result = await loginAdapter().start(provider, next);
  if ("error" in result) redirect(`/login?erro=provedor&next=${encodeURIComponent(next)}`);
  redirect(result.url);
}

// Consentimento simulado: cria ou entra num usuário de teste com o e-mail informado.
export async function confirmMockLogin(_: ActionState, formData: FormData): Promise<ActionState> {
  const { isMockMode } = await import("@/lib/integrations/mode");
  if (!isMockMode()) return { error: "O login simulado só funciona em modo demonstração." };
  const { mockLoginSchema } = await import("./schemas");
  const parsed = mockLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { signInVerifiedEmail } = await import("./session-bridge");
  const result = await signInVerifiedEmail({
    email: parsed.data.email,
    nome: parsed.data.nome,
    provider: `${parsed.data.provider}-simulado`,
  });
  if (!result.ok) return { error: result.error, data: { email: parsed.data.email } };
  redirect(safeNext(formData.get("next")));
}

export async function devPasswordAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_PASSWORD_LOGIN === "true";
}
