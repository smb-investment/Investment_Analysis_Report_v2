import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DaemonLogViewer } from "@/components/DaemonLogViewer";

export const revalidate = 30; // 30초마다 자동 갱신

export default async function AdminPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/login");

  const supabase = createSupabaseServerClient();

  const [proposalsRes, pendingRes, heartbeatRes] = await Promise.all([
    supabase.from("proposals").select("id,status,company_name").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id").eq("status", "pending"),
    supabase.from("daemon_heartbeat").select("last_seen,pid").eq("id", "proposal-daemon").maybeSingle(),
  ]);

  const proposals = proposalsRes.data ?? [];
  const activeProposal = proposals.find(p => p.status === "analyzing" || p.status === "generating");
  const counts = {
    total:      proposals.length,
    input:      proposals.filter((p) => p.status === "input").length,
    analyzing:  proposals.filter((p) => p.status === "analyzing").length,
    planning:   proposals.filter((p) => p.status === "planning").length,
    generating: proposals.filter((p) => p.status === "generating").length,
    ready:      proposals.filter((p) => p.status === "ready").length,
    delivered:  proposals.filter((p) => p.status === "delivered").length,
    pendingUsers: pendingRes.data?.length ?? 0,
  };

  // 데몬 생사 판단: last_seen이 2분 이내면 alive
  const heartbeat = heartbeatRes.data;
  const daemonAlive = heartbeat
    ? (Date.now() - new Date(heartbeat.last_seen).getTime()) < 2 * 60 * 1000
    : false;
  const lastSeenMin = heartbeat
    ? Math.floor((Date.now() - new Date(heartbeat.last_seen).getTime()) / 60000)
    : null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#6B7FA3]">어드민 콘솔</h1>
      </div>

      {/* 데몬 상태 배너 */}
      {daemonAlive ? (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-700 font-medium">데몬 실행중</span>
          <span className="text-green-600 text-xs">
            PID {heartbeat?.pid} · {lastSeenMin === 0 ? "방금 전" : `${lastSeenMin}분 전 확인`}
          </span>
          <span className="ml-auto text-xs text-green-500">요청서 생성 버튼 클릭 즉시 처리됩니다</span>
        </div>
      ) : (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-700 font-semibold">⚠️ 데몬 오프라인</span>
            {lastSeenMin !== null && (
              <span className="text-red-500 text-xs">{lastSeenMin}분 전 마지막 확인</span>
            )}
          </div>
          <p className="text-red-600 text-xs ml-4">
            투자요청서 자동 생성이 작동하지 않습니다.
            PC에서 <code className="bg-red-100 px-1 rounded">agent\run-proposal-daemon.bat</code>을 실행하거나,
            담당자에게 데몬 재시작을 요청하세요.
          </p>
        </div>
      )}

      {/* 상태별 카운터 */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-8">
        {[
          { label: "전체",     value: counts.total,      cls: "bg-white border-gray-200",       text: "text-gray-700" },
          { label: "입력완료", value: counts.input,      cls: "bg-gray-50 border-gray-200",     text: "text-gray-600" },
          { label: "🔍 분석중", value: counts.analyzing, cls: "bg-blue-50 border-blue-200",     text: "text-blue-700" },
          { label: "📋 기획검토", value: counts.planning, cls: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
          { label: "⚙️ 생성중", value: counts.generating, cls: "bg-amber-50 border-amber-200",  text: "text-amber-700" },
          { label: "✅ 완료",   value: counts.ready,     cls: "bg-green-50 border-green-200",   text: "text-green-700" },
          { label: "전달완료", value: counts.delivered,  cls: "bg-purple-50 border-purple-200", text: "text-purple-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.cls}`}>
            <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 승인 대기 회원 경고 */}
      {counts.pendingUsers > 0 && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          ⚠️ 승인 대기 회원 <strong>{counts.pendingUsers}명</strong>이 있습니다.
        </div>
      )}

      {/* 투자요청서 관리 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">투자요청서 관리</h2>
          <Link
            href="/admin/proposals/new"
            className="px-4 py-2 bg-[#6B7FA3] text-white text-sm rounded-lg hover:bg-[#5a6e91] transition"
          >
            + 새 요청서
          </Link>
        </div>
        <Link href="/admin/proposals" className="text-[#6B7FA3] text-sm hover:underline">
          전체 목록 보기 →
        </Link>
      </div>
      {activeProposal && (
        <DaemonLogViewer proposalId={activeProposal.id} companyName={activeProposal.company_name ?? ""} />
      )}
    </section>
  );
}
