import { createSupabaseServerClient } from "@/lib/supabase/server";
export type Profile = {
  id: string;
  email: string | null;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
export async function getSessionContext() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };
  const { data: profile } = await supabase
    .from("profiles").select("id,email,role,status,created_at")
    .eq("id", user.id).maybeSingle();
  return { user, profile: (profile ?? null) as Profile | null, supabase };
}
export async function requireAdmin() {
  const ctx = await getSessionContext();
  if (!ctx.user) return { ...ctx, error: "unauthenticated" as const };
  if (ctx.profile?.status !== "approved") return { ...ctx, error: "not-approved" as const };
  if (ctx.profile?.role !== "admin") return { ...ctx, error: "not-admin" as const };
  return { ...ctx, error: null };
}
