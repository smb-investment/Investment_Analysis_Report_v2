"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin, getSessionContext } from "@/lib/auth";

export type ProposalStatus = "input" | "generating" | "ready" | "delivered";

export type Proposal = {
  id: string;
  company_name: string;
  company_reg_no: string | null;
  ceo_name: string | null;
  project_name: string | null;
  project_desc: string | null;
  total_cost: number | null;
  funding_amount: number | null;
  funding_type: string;
  interest_rate: string | null;
  tenor_months: number | null;
  notes: string | null;
  status: ProposalStatus;
  pptx_path: string | null;
  md_path: string | null;
  html_path: string | null;
  source_attachments: string[];
  model_used: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function createProposal(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");
  const supabase = createSupabaseServerClient();
  const company_name = String(formData.get("company_name") ?? "").trim();
  if (!company_name) redirect("/admin/proposals/new?error=" + encodeURIComponent("회사명을 입력하세요."));
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      company_name,
      company_reg_no: String(formData.get("company_reg_no") ?? "").trim() || null,
      ceo_name: String(formData.get("ceo_name") ?? "").trim() || null,
      project_name: String(formData.get("project_name") ?? "").trim() || null,
      project_desc: String(formData.get("project_desc") ?? "").trim() || null,
      total_cost: Number(formData.get("total_cost")) || null,
      funding_amount: Number(formData.get("funding_amount")) || null,
      funding_type: String(formData.get("funding_type") ?? "PF"),
      interest_rate: String(formData.get("interest_rate") ?? "").trim() || null,
      tenor_months: Number(formData.get("tenor_months")) || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: ctx.user!.id,
    })
    .select("id")
    .single();
  if (error || !data) redirect("/admin/proposals/new?error=" + encodeURIComponent(error?.message ?? "생성 실패"));

  const proposalId = data.id;

  // Handle file attachments
  const files = formData.getAll("attachments") as File[];
  const validFiles = files.filter((f) => f && f.size > 0);
  if (validFiles.length > 0) {
    const storagePaths: string[] = [];
    for (const file of validFiles) {
      const storagePath = `${proposalId}/${file.name}`;
      const buf = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from("proposals-attachments")
        .upload(storagePath, buf, { contentType: file.type || "application/octet-stream", upsert: true });
      if (!upErr) storagePaths.push(storagePath);
    }
    if (storagePaths.length > 0) {
      await supabase
        .from("proposals")
        .update({ source_attachments: storagePaths })
        .eq("id", proposalId);
    }
  }

  redirect(`/admin/proposals/${proposalId}`);
}

export async function startGeneration(proposalId: string): Promise<void> {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("proposals")
    .update({ status: "generating", error_message: null })
    .eq("id", proposalId)
    .eq("status", "input");
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/proposals/${proposalId}`);
  revalidatePath("/admin/proposals");
}

export async function setProposalStatus(proposalId: string, status: ProposalStatus): Promise<void> {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");
  const supabase = createSupabaseServerClient();
  await supabase.from("proposals").update({ status }).eq("id", proposalId);
  revalidatePath(`/admin/proposals/${proposalId}`);
  revalidatePath("/admin/proposals");
}

export async function deleteProposal(proposalId: string): Promise<void> {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");
  const supabase = createSupabaseServerClient();
  await supabase.from("proposals").delete().eq("id", proposalId);
  redirect("/admin/proposals");
}

export async function getProposalDownloadUrl(pptxPath: string): Promise<string | null> {
  const ctx = await requireAdmin();
  if (ctx.error) return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.storage.from("proposals-pptx").createSignedUrl(pptxPath, 3600);
  return data?.signedUrl ?? null;
}

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const { profile } = await getSessionContext();
  if (profile?.status !== "approved") return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
