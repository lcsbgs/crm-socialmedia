"use client";

import { createContext, useContext } from "react";

export type ShellClient = {
  id: string;
  nome: string;
  cor: number;
  status: "ativo" | "pausado" | "encerrado";
};

export type ShellContextValue = {
  workspace: { id: string; nome: string; slug: string };
  clients: ShellClient[];
  openPalette: () => void;
  openNewTask: (defaults?: { clientId?: string; date?: string }) => void;
  openNewDeliverable: (defaults?: { clientId?: string; date?: string }) => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell precisa estar dentro do AppShell");
  return ctx;
}
