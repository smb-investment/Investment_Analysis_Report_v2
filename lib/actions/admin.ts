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
  if (!id || !["intake", "draft", "published"].includes(status)) redirect("/admin?error=" + encodeURIComponent("잘못된 요청"));

  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const { error } = await ctx.supabase.from("reports").update({ status }).eq("id", id);
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  await logAudit(ctx.supabase, ctx.user!.id, `report.status=${status}`, id);
  revalidatePath("/admin");
  revalidatePath("/reports");
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
