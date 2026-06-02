import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { setMemberStatus, setReportStatus, adminDeletePost } from "@/lib/actions/admin";
import StartAnalysisDialog from "./StartAnalysisDialog";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
type ReportStatus = "intake" | "analyzing" | "draft" | "published";
type ReportRow = {
  id: string;
  title: string | null;
  company: string | null;
  period: string | null;
  status: ReportStatus;
  selected_sections: string[] | null;
  created_at: string;
};
type PostRow = {
  id: string;
  title: string;
  created_at: string;
  author: { email: string | null } | null;
};

const STATUS_LABEL: Record<ProfileRow["status"], string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거부",
};

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  intake: "분석대기",
  analyzing: "분석중",
  draft: "초안",
  published: "게시",
};

const REPORT_STATUS_TONE: Record<ReportStatus, string> = {
  intake: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  analyzing: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  draft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

const PROFILE_STATUS_TONE: Record<ProfileRow["status"], string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  rejected: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
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
function initialOf(name: string | null | undefined): string {
  if (!name) return "·";
  return name.charAt(0).toUpperCase();
}

export default async function AdminPage({ searchParams }: { searchParams: { error?: string } }) {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const supabase = createSupabaseServerClient();
  const [profilesRes, reportsRes, postsRes] = await Promise.all([
    supabase.from("profiles").select("id,email,role,status,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("reports").select("id,title,company,period,status,selected_sections,created_at").order("created_at", { ascending: false }).limit(100),
    supabase
      .from("board_posts")
      .select("id,title,created_at,author:profiles!board_posts_author_id_fkey(email)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const reports = (reportsRes.data ?? []) as ReportRow[];
  const posts = (postsRes.data ?? []) as unknown as PostRow[];

  const pendingMembers = profiles.filter((p) => p.status === "pending");
  const otherMembers = profiles.filter((p) => p.status !== "pending");

  return (
    <section className="space-y-10">
      {/* 헤더 */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
          ADMIN CONSOLE
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">어드민 콘솔</h1>
          <Link
            href="/admin/reports/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            자료수집 업로드
          </Link>
        </div>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-red-400/40 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-4 text-sm text-red-800 dark:text-red-200">
          오류: {searchParams.error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="승인 대기" value={pendingMembers.length} tone="amber" />
        <StatCard label="전체 회원" value={profiles.length} tone="cyan" />
        <StatCard label="보고서" value={reports.length} tone="emerald" />
        <StatCard label="최근 게시글" value={posts.length} tone="violet" />
      </div>

      {/* 승인 대기 */}
      <Panel title="승인 대기" count={pendingMembers.length}>
        {pendingMembers.length === 0 ? (
          <EmptyMini text="대기 중인 회원이 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-600">
            {pendingMembers.map((p) => {
              const palette = paletteFor(p.email);
              return (
                <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br ${palette} text-white font-semibold text-sm flex items-center justify-center shadow`}>
                      {initialOf(p.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.email}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(p.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={setMemberStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition">
                        승인
                      </button>
                    </form>
                    <form action={setMemberStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold transition">
                        거부
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* 전체 회원 */}
      <Panel title="전체 회원" count={otherMembers.length}>
        {otherMembers.length === 0 ? (
          <EmptyMini text="회원이 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-600">
            {otherMembers.map((p) => {
              const palette = paletteFor(p.email);
              return (
                <li key={p.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br ${palette} text-white font-semibold text-sm flex items-center justify-center shadow`}>
                      {initialOf(p.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.email}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${PROFILE_STATUS_TONE[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                        {p.role === "admin" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300 font-medium">admin</span>
                        )}
                        <span>· {formatDateTime(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(["pending", "approved", "rejected"] as const)
                      .filter((s) => s !== p.status)
                      .map((s) => (
                        <form action={setMemberStatus} key={s}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value={s} />
                          <button className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-500 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-medium transition">
                            → {STATUS_LABEL[s]}
                          </button>
                        </form>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* 보고서 */}
      <Panel title="보고서" count={reports.length}>
        {reports.length === 0 ? (
          <EmptyMini text="아직 보고서가 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-600">
            {reports.map((r) => {
              const label = r.title || r.company || "(제목 없음)";
              const sections = Array.isArray(r.selected_sections) ? r.selected_sections : null;
              return (
                <li key={r.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{label}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${REPORT_STATUS_TONE[r.status]}`}>
                        {REPORT_STATUS_LABEL[r.status]}
                      </span>
                      {r.company && <span>{r.company}</span>}
                      {r.period && <span>· {r.period}</span>}
                      <span>· {formatDateTime(r.created_at)}</span>
                      {r.status === "analyzing" && sections && (
                        <span className="text-violet-600 dark:text-violet-300">· §{sections.join(",")} 분석 중</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 items-center">
                    {r.status === "intake" && (
                      <StartAnalysisDialog
                        reportId={r.id}
                        reportLabel={label}
                        defaultSections={sections ?? undefined}
                      />
                    )}
                    {r.status === "analyzing" && (
                      <ReportStatusButton id={r.id} status="intake" label="분석 취소" />
                    )}
                    {r.status === "draft" && (
                      <>
                        <ReportStatusButton id={r.id} status="published" label="게시" tone="primary" />
                        <ReportStatusButton id={r.id} status="intake" label="분석대기로" />
                      </>
                    )}
                    {r.status === "published" && (
                      <ReportStatusButton id={r.id} status="draft" label="초안으로" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* 게시판 모더레이션 */}
      <Panel title="최근 게시글" count={posts.length} hint="(모더레이션)">
        {posts.length === 0 ? (
          <EmptyMini text="게시글이 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-600">
            {posts.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/board/${p.id}`} className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate hover:text-cyan-600 dark:hover:text-cyan-400 transition">
                    {p.title}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {p.author?.email ?? "(알 수 없음)"} · {formatDateTime(p.created_at)}
                  </div>
                </div>
                <form action={adminDeletePost}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-rose-300/60 text-rose-700 dark:border-rose-700/60 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition">
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "cyan" | "emerald" | "violet" }) {
  const tones = {
    amber: "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-300",
    cyan: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
    emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    violet: "from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-700 dark:text-violet-300",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="text-xs font-semibold tracking-wider uppercase opacity-80">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Panel({ title, count, hint, children }: { title: string; count: number; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-5 sm:p-6">
      <h2 className="text-lg font-bold mb-4 flex items-baseline gap-2">
        {title}
        <span className="text-cyan-500 dark:text-cyan-400 tabular-nums">{count}</span>
        {hint && <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{hint}</span>}
      </h2>
      {children}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

function ReportStatusButton({
  id,
  status,
  label,
  tone,
}: {
  id: string;
  status: ReportStatus;
  label: string;
  tone?: "primary";
}) {
  const cls = tone === "primary"
    ? "px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition"
    : "px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-500 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-medium transition";
  return (
    <form action={setReportStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={cls}>→ {label}</button>
    </form>
  );
}
