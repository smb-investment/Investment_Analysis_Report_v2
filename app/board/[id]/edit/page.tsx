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
      <div className="mb-6">
        <Link href={`/board/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          글 보기
        </Link>
      </div>

      <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
        EDIT POST
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">글 수정</h1>

      {searchParams.error && (
        <div className="mb-4 rounded-lg border border-red-400/40 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-3 text-sm text-red-800 dark:text-red-200">
          {searchParams.error}
        </div>
      )}

      <form action={updatePost} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-6 space-y-5">
        <input type="hidden" name="id" value={post.id} />
        <div>
          <label className="block text-sm font-medium mb-2">제목</label>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={post.title}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">내용</label>
          <textarea
            name="content"
            rows={12}
            maxLength={20000}
            defaultValue={post.content ?? ""}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 leading-relaxed"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
          >
            저장
          </button>
          <Link
            href={`/board/${post.id}`}
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-500 hover:border-slate-400 dark:hover:border-slate-400 text-sm font-medium transition"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
