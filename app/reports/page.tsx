import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Report = {
  id: string;
  title: string | null;
  company: string | null;
  ticker: string | null;
  period: string | null;
  summary: string | null;
  created_at: string;
};

function sanitizeIlike(s: string): string {
  return s.replace(/[%_,]/g, "").slice(0, 80);
}

export default async function ReportsPage({ searchParams }: { searchParams: { q?: string; denied?: string } }) {
  const supabase = createSupabaseServerClient();
  const q = sanitizeIlike((searchParams.q ?? "").trim());
  const denied = searchParams.denied;

  let query = supabase
    .from("reports")
    .select("id,title,company,ticker,period,summary,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`title.ilike.${pattern},company.ilike.${pattern},period.ilike.${pattern},ticker.ilike.${pattern}`);
  }

  const { data, error } = await query;
  const reports = (data ?? []) as Report[];

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">보고서</h1>
      </div>

      {denied === "admin" && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
          어드민 권한이 필요한 페이지입니다.
        </div>
      )}

      <form className="mb-6 flex gap-2" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="회사·티커·기간·제목 검색"
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent"
        />
        <button type="submit" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">검색</button>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
          오류: {error.message}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500">
          아직 게시된 보고서가 없습니다. (2단계 분석 엔진에서 생성된 보고서가 여기에 표시됩니다.)
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
          {reports.map((r) => (
            <li key={r.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <Link href={`/reports/${r.id}`} className="block">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="font-medium">{r.title || r.company || "(제목 없음)"}</div>
                  <div className="text-xs text-gray-500 shrink-0">{formatDateTime(r.created_at)}</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {[r.company, r.ticker, r.period].filter(Boolean).join(" · ")}
                </div>
                {r.summary && <div className="text-sm text-gray-500 mt-1 line-clamp-2">{r.summary}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
