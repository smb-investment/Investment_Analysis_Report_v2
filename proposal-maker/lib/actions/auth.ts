"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  if (!email || !password) redirect("/login?error=" + encodeURIComponent("이메일과 비밀번호를 입력하세요."));
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
    if (profile?.status !== "approved") redirect("/login?pending=1");
  }
  redirect(next.startsWith("/") ? next : "/admin");
}

export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/signup?error=" + encodeURIComponent("이메일과 비밀번호를 입력하세요."));
  if (password.length < 8) redirect("/signup?error=" + encodeURIComponent("비밀번호는 8자 이상이어야 합니다."));
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/signup?error=" + encodeURIComponent(error.message));
  redirect("/signup?ok=1");
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
