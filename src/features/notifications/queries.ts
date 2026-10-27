import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  tipo: "aprovacao" | "ajuste";
  titulo: string;
  corpo: string | null;
  deliverable_id: string | null;
  lida_em: string | null;
  created_at: string;
};

export async function getNotifications(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, tipo, titulo, corpo, deliverable_id, lida_em, created_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .is("lida_em", null),
  ]);
  return { items: (data ?? []) as NotificationItem[], unread: count ?? 0 };
}
