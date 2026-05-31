import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createComment, deleteComment, deletePost } from "@/lib/actions/board";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  title: string;
  content: string | null;
  author_id: string | null;
  created_at: string;
  author: { email: string | null } | null;
};

type Comment = {
  id: string;
  post_id: string;
  content: string | null;
  author_id: string | null;
  created_at: string;
  author: { email: string | null } | null;
};

export default async function PostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { user, profile } = await getSessionContext();

  const { data: post } = await supabase
    .from("board_posts")
    .select("id,title,content,author_id,created_at,author:profiles!board_posts_author_id_fkey(email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!post) notFound();
  const p = post as unknown as Post;

  const { data: commentsData } = await supabase
    .from("comments")
    .select("id,post_id,content,author_id,created_at,author:profiles!comments_author_id_fkey(email)")
    .eq("post_id", params.id)
    .order("created_at", { ascending: true })
    .limit(500);
  const comments = (commentsData ?? []) as unknown as Comment[];

  const isAdmin = profile?.role === "admin" && profile?.status === "approved";
  const canEditPost = user && (user.id === p.author_id || isAdmin);

  return (
    <section className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/board" className="text-sm text-gray-500 hover:underline">← 목록</Link>
      </div>

      <article className="border border-gray-200 dark:border-gray-800 rounded-md p-6">
        <h1 className="text-2xl font-semibold mb-2">{p.title}</h1>
        <div className="text-xs text-gray-500 mb-6 flex justify-between">
          <span>{p.author?.email ?? "(알 수 없음)"}</span>
          <span>{formatDateTime(p.created_at)}</span>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{p.content}</div>

        {canEditPost && (
          <div className="mt-6 flex gap-2 no-print">
            <Link href={`/board/${p.id}/edit`} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm">
              수정
            </Link>
            <form action={deletePost}>
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-sm"
              >
                삭제
              </button>
            </form>
          </div>
        )}
      </article>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">댓글 ({comments.length})</h2>

        {searchParams.error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
            {searchParams.error}
          </div>
        )}

        <ul className="space-y-3 mb-6">
          {comments.map((c) => {
            const canDelete = user && (user.id === c.author_id || isAdmin);
            return (
              <li key={c.id} className="border border-gray-200 dark:border-gray-800 rounded-md p-3">
                <div className="text-xs text-gray-500 flex justify-between mb-1">
                  <span>{c.author?.email ?? "(알 수 없음)"}</span>
                  <span>{formatDateTime(c.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{c.content}</div>
                {canDelete && (
                  <form action={deleteComment} className="mt-2 no-print">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="post_id" value={p.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">삭제</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

        <form action={createComment} className="space-y-2">
          <input type="hidden" name="post_id" value={p.id} />
          <textarea
            name="content"
            rows={3}
            required
            maxLength={20000}
            placeholder="댓글을 입력하세요."
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
          />
          <button type="submit" className="px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm">
            댓글 등록
          </button>
        </form>
      </section>
    </section>
  );
}
