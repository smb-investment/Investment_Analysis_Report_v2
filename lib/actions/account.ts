"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// 비밀번호 변경 — 본인만, 현재 비번 재인증 필수.
// signInWithPassword 로 한 번 검증 → updateUser 로 새 비번 적용.
export async function changePassword(formData: FormData): Promise<void> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect("/login?next=/account/password");
  }

  // 클라이언트 측 required·minLength 가 우회됐을 때를 대비한 서버 검증
  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/account/password?error=" + encodeURIComponent("모든 칸을 입력하세요."));
  }
  if (newPassword !== confirmPassword) {
    redirect("/account/password?error=" + encodeURIComponent("새 비밀번호와 확인이 일치하지 않습니다."));
  }
  if (newPassword.length < 8) {
    redirect("/account/password?error=" + encodeURIComponent("새 비밀번호는 8자 이상이어야 합니다."));
  }
  if (newPassword === currentPassword) {
    redirect("/account/password?error=" + encodeURIComponent("새 비밀번호가 기존과 같습니다."));
  }

  // 1) 현재 비번 재인증 — 어깨 너머 무단 변경 방지
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    redirect("/account/password?error=" + encodeURIComponent("현재 비밀번호가 일치하지 않습니다."));
  }

  // 2) 새 비번 적용
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    redirect("/account/password?error=" + encodeURIComponent(updateError.message));
  }

  await logAudit(supabase, user.id, "account.password.change", user.id);
  revalidatePath("/account/password");
  redirect("/account/password?ok=1");
}
