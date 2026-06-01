"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 신규 가입자가 생기면 어드민에게 메일 1통.
// 환경변수가 비어 있으면 조용히 스킵 → 메일 인프라가 아직 없어도 가입은 정상 동작.
async function notifyAdminOfSignup(userEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !adminEmail) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const adminUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/admin` : "/admin";

  const subject = `[IR-Agent] 신규 회원가입 — ${userEmail}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 16px;font-size:18px">신규 회원가입 — 승인 대기</h2>
      <p style="margin:0 0 12px">아래 이메일로 가입 요청이 접수되었습니다.</p>
      <p style="margin:0 0 16px;padding:12px 16px;background:#f1f5f9;border-radius:8px;font-family:ui-monospace,Menlo,monospace">
        ${userEmail}
      </p>
      <p style="margin:0 0 20px">어드민 콘솔의 <b>승인 대기</b> 패널에서 승인/거부할 수 있습니다.</p>
      <p style="margin:0">
        <a href="${adminUrl}" style="display:inline-block;padding:10px 18px;background:#0891b2;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          어드민 콘솔 열기 →
        </a>
      </p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#64748b;font-size:12px">Investment Analysis Report · 자동 발송 메일</p>
    </div>
  `.trim();

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject,
        html,
      }),
      // 가입 흐름을 막지 않도록 5초 타임아웃
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error(`[notifyAdmin] Resend ${r.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[notifyAdmin] failed:", err);
  }
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/reports");

  if (!email || !password) redirect("/login?error=" + encodeURIComponent("이메일과 비밀번호를 입력하세요."));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.status !== "approved") {
      redirect("/login?pending=1");
    }
  }
  redirect(next.startsWith("/") ? next : "/reports");
}

export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/signup?error=" + encodeURIComponent("이메일과 비밀번호를 입력하세요."));
  if (password.length < 8) redirect("/signup?error=" + encodeURIComponent("비밀번호는 8자 이상이어야 합니다."));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/signup?error=" + encodeURIComponent(error.message));

  // 어드민에게 알림 — 실패해도 가입 자체는 통과시킨다.
  await notifyAdminOfSignup(email);

  redirect("/signup?ok=1");
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
