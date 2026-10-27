"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead(input: { workspaceId: string }) {
  const user = await requireUser();
  const workspaceId = z.uuid().parse(input.workspaceId);
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ lida_em: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .is("lida_em", null);
  revalidatePath("/w", "layout");
  return { ok: true };
}
