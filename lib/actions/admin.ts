"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type ProfileStatus = "pending" | "approved" | "rejected";

export async function setMemberStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ProfileStatus;
  if (!id || !["pending", "approved", "rejected"].includes(status)) redirect("/admin?error=" + encodeURIComponent("잘못된 요청"));

  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const { error } = await ctx.supabase.from("profiles").update({ status }).eq("id", id);
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  await logAudit(ctx.supabase, ctx.user!.id, `profile.status=${status}`, id);
  revalidatePath("/admin");
}

export async function setReportStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["intake", "analyzing", "draft", "published"].includes(status)) redirect("/admin?error=" + encodeURIComponent("잘못된 요청"));

  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const { error } = await ctx.supabase.from("reports").update({ status }).eq("id", id);
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  await logAudit(ctx.supabase, ctx.user!.id, `report.status=${status}`, id);
  revalidatePath("/admin");
  revalidatePath("/reports");
}

const VALID_SECTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export async function startAnalysis(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const sections = formData.getAll("sections").map((v) => String(v));

  if (!id) redirect("/admin?error=" + encodeURIComponent("보고서 id 누락"));

  const cleaned = Array.from(new Set(sections.filter((s) => (VALID_SECTIONS as readonly string[]).includes(s))));
  if (cleaned.length === 0) {
    redirect("/admin?error=" + encodeURIComponent("최소 1개 섹션을 선택하세요"));
  }
  cleaned.sort((a, b) => Number(a) - Number(b));

  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const { data: cur, error: getErr } = await ctx.supabase
    .from("reports")
    .select("id,status")
    .eq("id", id)
    .single();
  if (getErr || !cur) {
    redirect("/admin?error=" + encodeURIComponent(getErr?.message ?? "보고서 없음"));
  }
  if (cur.status !== "intake") {
    redirect("/admin?error=" + encodeURIComponent(`현재 상태(${cur.status})에서는 분석을 시작할 수 없습니다`));
  }

  const { error } = await ctx.supabase
    .from("reports")
    .update({ status: "analyzing", selected_sections: cleaned })
    .eq("id", id);
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  await logAudit(ctx.supabase, ctx.user!.id, `report.analysis.start sections=[${cleaned.join(",")}]`, id);
  revalidatePath("/admin");
}

export async function adminDeletePost(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin");

  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  await ctx.supabase.from("board_posts").delete().eq("id", id);
  await logAudit(ctx.supabase, ctx.user!.id, "board_post.delete", id);
  revalidatePath("/admin");
  revalidatePath("/board");
}

export async function createIntakeReport(input: {
  title: string;
  company: string;
  ticker: string;
  period: string;
  pdfPaths: string[];
}): Promise<{ id: string } | { error: string }> {
  const ctx = await requireAdmin();
  if (ctx.error) return { error: "권한 없음" };

  const title = input.title.trim().slice(0, 200) || input.company.trim().slice(0, 200) || "(제목 없음)";
  const { data, error } = await ctx.supabase
    .from("reports")
    .insert({
      title,
      company: input.company.trim().slice(0, 200) || null,
      ticker: input.ticker.trim().slice(0, 32) || null,
      period: input.period.trim().slice(0, 64) || null,
      status: "intake",
      source_material: JSON.stringify(input.pdfPaths),
      pdf_path: input.pdfPaths[0] ?? null,
      created_by: ctx.user!.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "보고서 생성 실패" };

  await logAudit(ctx.supabase, ctx.user!.id, "report.intake.create", data.id);
  revalidatePath("/admin");
  return { id: data.id };
}
