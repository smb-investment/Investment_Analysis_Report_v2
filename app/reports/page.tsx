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

// 회사 이니셜 추출 (한글/영문 첫 글자 1자)
function initial(name: string | null): string {
  if (!name) return "·";
  const ch = name.replace(/^\(주\)|주식회사\s?/g, "").trim().charAt(0);
  return ch || "·";
}

// 회사명 -> 일관된 그라디언트 색상 (해시 기반)
const PALETTES = [
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
function paletteFor(name: string | null): string {
  if (!name) return PALETTES[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
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
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
          INVESTMENT ANALYSIS REPORTS
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">보고서</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            전체 <span className="font-semibold text-slate-800 dark:text-slate-200">{reports.length}</span>건
            {q && <span className="ml-2">— 검색어: <span className="font-mono text-cyan-600 dark:text-cyan-400">{q}</span></span>}
          </div>
        </div>
      </div>

      {denied === "admin" && (
        <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 p-4 text-sm text-amber-800 dark:text-amber-200">
          ⚠️ 어드민 권한이 필요한 페이지입니다.
        </div>
      )}

      {/* 검색바 */}
      <form className="mb-8" method="get">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              name="q"
              defaultValue={q}
              placeholder="회사 · 티커 · 기간 · 제목으로 검색"
              className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 backdrop-blur text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
          >
            검색
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-4 text-sm text-red-800 dark:text-red-200">
          오류: {error.message}
        </div>
      )}

      {/* 빈 상태 */}
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/20 p-12 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
            {q ? "검색 결과가 없습니다" : "아직 게시된 보고서가 없습니다"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {q
              ? "다른 키워드로 다시 검색해 보세요."
              : "분석 엔진에서 생성된 보고서가 어드민 검수를 거쳐 여기에 표시됩니다."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => {
            const palette = paletteFor(r.company);
            const ini = initial(r.company || r.title);
            return (
              <li key={r.id}>
                <Link
                  href={`/reports/${r.id}`}
                  className="group block rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition overflow-hidden"
                >
                  <div className="flex gap-4 p-5">
                    {/* 회사 이니셜 */}
                    <div
                      className={`shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br ${palette} text-white font-bold text-2xl flex items-center justify-center shadow-md`}
                    >
                      {ini}
                    </div>

                    {/* 본문 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 leading-snug truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
                          {r.title || r.company || "(제목 없음)"}
                        </h3>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-1">
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>

                      {/* 메타 칩 */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {r.company && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-medium">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                            </svg>
                            {r.company}
                          </span>
                        )}
                        {r.ticker && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
                            {r.ticker}
                          </span>
                        )}
                        {r.period && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {r.period}
                          </span>
                        )}
                      </div>

                      {/* 요약 */}
                      {r.summary && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {r.summary}
                        </p>
                      )}
                    </div>

                    {/* 우측 화살표 */}
                    <div className="shrink-0 self-center text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
