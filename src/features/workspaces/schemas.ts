import { z } from "zod";

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Use pelo menos 2 caracteres")
  .max(80, "Use no máximo 80 caracteres");

export const createWorkspaceSchema = z.object({ nome: workspaceNameSchema });

export const renameWorkspaceSchema = z.object({
  workspaceId: z.uuid(),
  nome: workspaceNameSchema,
});

export const inviteSchema = z.object({
  workspaceId: z.uuid(),
  email: z.email("Informe um e-mail válido").trim().toLowerCase(),
  role: z.enum(["admin", "member"]),
});

export const onboardingSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  workspaceNome: workspaceNameSchema,
});

export const tokenSchema = z.uuid("Convite inválido");
