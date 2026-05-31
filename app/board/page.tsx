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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">게시판</h1>
        <Link href="/board/new" className="px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm">
          글쓰기
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm mb-4">
          오류: {error.message}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500">
          아직 게시글이 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
          {posts.map((p) => (
            <li key={p.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <Link href={`/board/${p.id}`} className="block">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500 shrink-0">{formatDateTime(p.created_at)}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{p.author?.email ?? "(알 수 없음)"}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
