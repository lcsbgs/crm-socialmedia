"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromDbError, fromZodError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { packageSchema } from "./schemas";

export async function savePackage(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const id = formData.get("id");
  const slug = String(formData.get("slug") ?? "");
  const { workspaceId, nome, itens, preco, limite_rodadas } = parsed.data;
  const supabase = await createClient();

  const { error } =
    typeof id === "string" && id
      ? await supabase
          .from("package_templates")
          .update({ nome, itens, preco: preco ?? null, limite_rodadas })
          .eq("workspace_id", workspaceId)
          .eq("id", z.uuid().parse(id))
      : await supabase.from("package_templates").insert({ workspace_id: workspaceId, nome, itens, preco: preco ?? null, limite_rodadas });
  if (error) return fromDbError(error);

  revalidatePath(`/w/${slug}/pacotes`);
  redirect(`/w/${slug}/pacotes`);
}

export async function deletePackage(formData: FormData) {
  await requireUser();
  const workspaceId = z.uuid().parse(formData.get("workspaceId"));
  const id = z.uuid().parse(formData.get("id"));
  const slug = String(formData.get("slug") ?? "");

  const supabase = await createClient();
  await supabase.from("package_templates").delete().eq("workspace_id", workspaceId).eq("id", id);
  revalidatePath(`/w/${slug}/pacotes`);
  redirect(`/w/${slug}/pacotes`);
}
