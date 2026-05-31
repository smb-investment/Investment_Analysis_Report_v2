import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  actorId: string | null,
  action: string,
  target: string,
) {
  await supabase.from("audit_log").insert({ actor_id: actorId, action, target });
}
