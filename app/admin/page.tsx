import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { setMemberStatus, setReportStatus, adminDeletePost } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
type ReportRow = {
  id: string;
  title: string | null;
  company: string | null;
  period: string | null;
  status: "intake" | "draft" | "published";
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

export default async function AdminPage({ searchParams }: { searchParams: { error?: string } }) {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const supabase = createSupabaseServerClient();
  const [profilesRes, reportsRes, postsRes] = await Promise.all([
    supabase.from("profiles").select("id,email,role,status,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("reports").select("id,title,company,period,status,created_at").order("created_at", { ascending: false }).limit(100),
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
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">어드민 콘솔</h1>
        <Link href="/admin/reports/new" className="px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm">
          + 자료수집 업로드
        </Link>
      </div>

      {searchParams.error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
          {searchParams.error}
        </div>
      )}

      {/* 회원 승인 대기 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">승인 대기 ({pendingMembers.length})</h2>
        {pendingMembers.length === 0 ? (
          <div className="text-sm text-gray-500">대기 중인 회원이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
            {pendingMembers.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.email}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(p.created_at)}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={setMemberStatus}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button className="px-3 py-1 rounded-md bg-green-600 text-white text-xs">승인</button>
                  </form>
                  <form action={setMemberStatus}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className="px-3 py-1 rounded-md bg-red-600 text-white text-xs">거부</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 전체 회원 (재변경용) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">전체 회원 ({otherMembers.length})</h2>
        {otherMembers.length === 0 ? (
          <div className="text-sm text-gray-500">없음</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
            {otherMembers.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.email}</div>
                  <div className="text-xs text-gray-500">
                    role={p.role} · status=<span className="font-mono">{STATUS_LABEL[p.status]}</span> · {formatDateTime(p.created_at)}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 text-xs">
                  {(["pending", "approved", "rejected"] as const)
                    .filter((s) => s !== p.status)
                    .map((s) => (
                      <form action={setMemberStatus} key={s}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value={s} />
                        <button className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700">
                          → {STATUS_LABEL[s]}
                        </button>
                      </form>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 보고서 상태 토글 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">보고서 ({reports.length})</h2>
        {reports.length === 0 ? (
          <div className="text-sm text-gray-500">아직 보고서가 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
            {reports.map((r) => (
              <li key={r.id} className="p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.title || r.company || "(제목 없음)"}</div>
                  <div className="text-xs text-gray-500">
                    {[r.company, r.period].filter(Boolean).join(" · ") || "—"} · status=<span className="font-mono">{r.status}</span>{" · "}
                    {formatDateTime(r.created_at)}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 text-xs">
                  {(["intake", "draft", "published"] as const)
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <form action={setReportStatus} key={s}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <button className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700">→ {s}</button>
                      </form>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 게시판 모더레이션 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">최근 게시글 (모더레이션)</h2>
        {posts.length === 0 ? (
          <div className="text-sm text-gray-500">게시글이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-md">
            {posts.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/board/${p.id}`} className="text-sm font-medium truncate hover:underline">
                    {p.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {p.author?.email ?? "(알 수 없음)"} · {formatDateTime(p.created_at)}
                  </div>
                </div>
                <form action={adminDeletePost}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="px-2 py-1 rounded-md border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-xs">
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
