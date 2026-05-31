import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  created_at: string;
  author_id: string | null;
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

export default async function BoardPage() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_posts")
    .select("id,title,created_at,author_id,author:profiles!board_posts_author_id_fkey(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  const posts = (data ?? []) as unknown as Row[];

  return (
    <section>
      {/* 헤더 */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
          COMMUNITY BOARD
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">게시판</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              전체 <span className="font-semibold text-slate-800 dark:text-slate-200">{posts.length}</span>건
            </p>
          </div>
          <Link
            href="/board/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            글쓰기
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/40 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-4 text-sm text-red-800 dark:text-red-200">
          오류: {error.message}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/20 p-12 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
            아직 게시글이 없습니다
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            첫 글을 작성해 보세요.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const palette = paletteFor(p.author?.email);
            return (
              <li key={p.id}>
                <Link
                  href={`/board/${p.id}`}
                  className="group block rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition"
                >
                  <div className="flex gap-4 p-4 items-center">
                    <div className={`shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br ${palette} text-white font-semibold text-base flex items-center justify-center shadow-md`}>
                      {initialOf(p.author?.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-0.5">
                        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-50 leading-snug truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
                          {p.title}
                        </h3>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatDateTime(p.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {p.author?.email ?? "(알 수 없음)"}
                      </p>
                    </div>
                    <div className="shrink-0 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
