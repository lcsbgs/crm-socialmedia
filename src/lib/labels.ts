import type { Database } from "@/types/database";

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type PlanTier = Database["public"]["Enums"]["plan_tier"];

export const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

export const planLabels: Record<PlanTier, string> = {
  free: "Grátis",
  pro: "Pro",
  estudio: "Estúdio",
};
