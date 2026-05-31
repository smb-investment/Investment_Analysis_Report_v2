import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { updatePost } from "@/lib/actions/board";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { user, profile } = await getSessionContext();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("board_posts")
    .select("id,title,content,author_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!post) notFound();

  const isAdmin = profile?.role === "admin" && profile?.status === "approved";
  if (post.author_id !== user.id && !isAdmin) redirect(`/board/${params.id}?error=` + encodeURIComponent("권한이 없습니다."));

  return (
    <section className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Link href={`/board/${params.id}`} className="text-sm text-gray-500 hover:underline">← 글 보기</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-6">글 수정</h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
          {searchParams.error}
        </div>
      )}

      <form action={updatePost} className="space-y-4">
        <input type="hidden" name="id" value={post.id} />
        <div>
          <label className="block text-sm mb-1">제목</label>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={post.title}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">내용</label>
          <textarea
            name="content"
            rows={12}
            maxLength={20000}
            defaultValue={post.content ?? ""}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">저장</button>
          <Link href={`/board/${post.id}`} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">취소</Link>
        </div>
      </form>
    </section>
  );
}
