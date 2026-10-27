"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { formatMonth, plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { packageSchema } from "@/features/packages/schemas";
import { clientSchema } from "./schemas";

export async function saveClient(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const slug = String(formData.get("slug") ?? "");
  const id = formData.get("id");
  const { workspaceId, ...values } = parsed.data;
  const supabase = await createClient();

  if (typeof id === "string" && id) {
    const { error } = await supabase
      .from("clients")
      .update(values)
      .eq("workspace_id", workspaceId)
      .eq("id", z.uuid().parse(id));
    if (error) return fromDbError(error);
    revalidatePath(`/w/${slug}/clientes`, "layout");
    return { message: "Cliente atualizado." };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...values, workspace_id: workspaceId })
    .select("id")
    .single();
  if (error || !data) return fromDbError(error);

  revalidatePath(`/w/${slug}/clientes`);
  redirect(`/w/${slug}/clientes/${data.id}`);
}

export async function deleteClient(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));
  const slug = String(formData.get("slug") ?? "");

  const supabase = await createClient();
  await supabase.from("clients").delete().eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath(`/w/${slug}/clientes`);
  redirect(`/w/${slug}/clientes`);
}

export async function generateMonth(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const mes = z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Mês inválido")
    .safeParse(formData.get("mes"));
  if (!mes.success) return { error: "Escolha um mês válido." };

  const competencia = `${mes.data}-01`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("generate_month", { p_workspace_id: workspaceId, p_competencia: competencia })
    .single();
  if (error || !data) return fromDbError(error);

  revalidatePath("/w", "layout");
  const { entregas_criadas: t, cobrancas_criadas: c } = data;
  if (t === 0 && c === 0) {
    return { message: `${formatMonth(competencia)} já estava gerado. Nada novo para criar.` };
  }
  return {
    message: `${formatMonth(competencia)}: ${plural(t, "entrega planejada", "entregas planejadas")} e ${plural(c, "cobrança criada", "cobranças criadas")}.`,
  };
}

// Onboarding: cria (ou escolhe) o pacote e o primeiro cliente de uma vez.
export async function setupFirstClient(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const slug = String(formData.get("slug") ?? "");
  const escolha = String(formData.get("pacote") ?? "");
  const supabase = await createClient();

  let packageId: string | null = escolha && escolha !== "novo" ? escolha : null;

  if (escolha === "novo") {
    const pkg = packageSchema.safeParse({
      workspaceId: formData.get("workspaceId"),
      nome: formData.get("pacote_nome"),
      itens: formData.get("itens"),
    });
    if (!pkg.success) return fromZodError(pkg.error);

    const { data, error } = await supabase
      .from("package_templates")
      .insert({ workspace_id: pkg.data.workspaceId, nome: pkg.data.nome, itens: pkg.data.itens })
      .select("id")
      .single();
    if (error || !data) return fromDbError(error);
    packageId = data.id;
  }

  const parsed = clientSchema.safeParse({
    ...Object.fromEntries(formData),
    package_template_id: packageId ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const { workspaceId, ...values } = parsed.data;
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...values, workspace_id: workspaceId })
    .select("id")
    .single();
  if (error || !data) return fromDbError(error);

  redirect(`/w/${slug}/clientes/${data.id}`);
}
