import { z } from "zod";

const email = z.email("Informe um e-mail válido").trim().toLowerCase();

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha"),
});

export const signUpSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  email,
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const magicLinkSchema = z.object({ email });

export const mockLoginSchema = z.object({
  provider: z.enum(["google", "apple", "chatgpt"]),
  email,
  nome: z.string().trim().min(2, "Informe um nome").max(80),
});
