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

const PALETTES = [
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
function paletteFor(name: string | null | undefined): string {
  if (!name) return PALETTES[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}
function initialOf(email: string | null | undefined): string {
  if (!email) return "·";
  return email.charAt(0).toUpperCase();
}

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
  const palette = paletteFor(p.author?.email);

  return (
    <section className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/board" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          목록
        </Link>
      </div>

      {/* 글 본문 카드 */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-7 sm:p-8 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 leading-tight">{p.title}</h1>
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-200 dark:border-slate-600">
          <div className={`shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${palette} text-white font-semibold text-sm flex items-center justify-center shadow-md`}>
            {initialOf(p.author?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.author?.email ?? "(알 수 없음)"}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(p.created_at)}</div>
          </div>
        </div>
        <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800 dark:text-slate-200">{p.content}</div>

        {canEditPost && (
          <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-600 flex gap-2 no-print">
            <Link
              href={`/board/${p.id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-500 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 text-sm font-medium transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              수정
            </Link>
            <form action={deletePost}>
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300/60 text-red-700 dark:border-red-700/60 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                삭제
              </button>
            </form>
          </div>
        )}
      </article>

      {/* 댓글 */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          댓글
          <span className="text-cyan-500 dark:text-cyan-400 tabular-nums">{comments.length}</span>
        </h2>

        {searchParams.error && (
          <div className="mb-4 rounded-lg border border-red-400/40 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-3 text-sm text-red-800 dark:text-red-200">
            {searchParams.error}
          </div>
        )}

        <ul className="space-y-3 mb-6">
          {comments.map((c) => {
            const canDelete = user && (user.id === c.author_id || isAdmin);
            const cPalette = paletteFor(c.author?.email);
            return (
              <li key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-4">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 h-8 w-8 rounded-full bg-gradient-to-br ${cPalette} text-white font-semibold text-xs flex items-center justify-center shadow`}>
                    {initialOf(c.author?.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{c.author?.email ?? "(알 수 없음)"}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{formatDateTime(c.created_at)}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{c.content}</div>
                    {canDelete && (
                      <form action={deleteComment} className="mt-2 no-print">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="post_id" value={p.id} />
                        <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">삭제</button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {comments.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              첫 댓글을 남겨주세요.
            </li>
          )}
        </ul>

        <form action={createComment} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-4">
          <input type="hidden" name="post_id" value={p.id} />
          <textarea
            name="content"
            rows={3}
            required
            maxLength={20000}
            placeholder="댓글을 입력하세요…"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 text-sm font-semibold shadow-md shadow-cyan-500/20"
            >
              댓글 등록
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
