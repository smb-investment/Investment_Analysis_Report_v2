"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApproved } from "@/lib/auth";

const MAX_TITLE = 200;
const MAX_CONTENT = 20000;

export async function createPost(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim().slice(0, MAX_TITLE);
  const content = String(formData.get("content") ?? "").slice(0, MAX_CONTENT);
  if (!title) redirect("/board/new?error=" + encodeURIComponent("제목을 입력하세요."));

  const ctx = await requireApproved();
  if (ctx.error) redirect("/login");

  const { data, error } = await ctx.supabase
    .from("board_posts")
    .insert({ title, content, author_id: ctx.user!.id })
    .select("id")
    .single();
  if (error || !data) redirect("/board/new?error=" + encodeURIComponent(error?.message ?? "글 작성 실패"));

  revalidatePath("/board");
  redirect(`/board/${data.id}`);
}

export async function updatePost(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, MAX_TITLE);
  const content = String(formData.get("content") ?? "").slice(0, MAX_CONTENT);
  if (!id || !title) redirect(`/board/${id || ""}?error=` + encodeURIComponent("필수 항목 누락"));

  const ctx = await requireApproved();
  if (ctx.error) redirect("/login");

  // RLS enforces author_id = auth.uid() OR is_admin().
  const { error } = await ctx.supabase
    .from("board_posts")
    .update({ title, content })
    .eq("id", id);
  if (error) redirect(`/board/${id}?error=` + encodeURIComponent(error.message));

  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
  redirect(`/board/${id}`);
}

export async function deletePost(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/board");

  const ctx = await requireApproved();
  if (ctx.error) redirect("/login");

  await ctx.supabase.from("board_posts").delete().eq("id", id);
  revalidatePath("/board");
  redirect("/board");
}

export async function createComment(formData: FormData): Promise<void> {
  const postId = String(formData.get("post_id") ?? "");
  const content = String(formData.get("content") ?? "").trim().slice(0, MAX_CONTENT);
  if (!postId || !content) redirect(`/board/${postId || ""}?error=` + encodeURIComponent("내용을 입력하세요."));

  const ctx = await requireApproved();
  if (ctx.error) redirect("/login");

  const { error } = await ctx.supabase
    .from("comments")
    .insert({ post_id: postId, content, author_id: ctx.user!.id });
  if (error) redirect(`/board/${postId}?error=` + encodeURIComponent(error.message));

  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}

export async function deleteComment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  if (!id || !postId) redirect("/board");

  const ctx = await requireApproved();
  if (ctx.error) redirect("/login");

  await ctx.supabase.from("comments").delete().eq("id", id);
  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}
