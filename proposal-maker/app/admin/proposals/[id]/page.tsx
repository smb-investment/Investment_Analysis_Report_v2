import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  startAnalysis, approvePlan, rejectPlan,
  setProposalStatus, deleteProposal,
} from "@/lib/actions/proposals";
import type { Proposal } from "@/lib/actions/proposals";

const STATUS: Record<string, { label: string; cls: string }> = {
  input:      { label: "입력완료",         cls: "bg-gray-100 text-gray-700" },
  analyzing:  { label: "🔍 PDF 분석중",   cls: "bg-blue-100 text-blue-700" },
  planning:   { label: "📋 기획안 검토",   cls: "bg-yellow-100 text-yellow-700" },
  generating: { label: "⚙️ 생성중",       cls: "bg-amber-100 text-amber-700" },
  ready:      { label: "✅ 완료",          cls: "bg-green-100 text-green-700" },
  delivered:  { label: "전달완료",         cls: "bg-purple-100 text-purple-700" },
};

function fmt(n: number | null) {
  if (!n) return "-";
  return (n / 100_000_000).toFixed(1) + "억원";
}

export default async function ProposalDetailPage({ params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) redirect("/login");
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("proposals").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const proposal = data as Proposal;
  const st = STATUS[proposal.status] ?? { label: proposal.status, cls: "bg-gray-100 text-gray-700" };

  const isReady = proposal.status === "ready" || proposal.status === "delivered";
  const pptxUrl = isReady && proposal.pptx_path ? `/api/proposals/${proposal.id}/pptx` : null;
  const mdUrl   = isReady && proposal.md_path   ? `/api/proposals/${proposal.id}/md`   : null;
  const htmlUrl = isReady && proposal.html_path  ? `/api/proposals/${proposal.id}/html` : null;

  return (
    <section className="max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href="/admin/proposals" className="text-sm text-gray-500 hover:text-[#6B7FA3]">← 목록</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-[#6B7FA3]">{proposal.company_name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{proposal.project_name || "프로젝트명 미입력"}</p>
      </div>

      {/* 오류 메시지 */}
      {proposal.error_message && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          ❌ {proposal.error_message}
        </div>
      )}

      {/* ── STATUS: input ── */}
      {proposal.status === "input" && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 mb-1 font-medium">📎 첨부파일 업로드 완료 후 분석을 시작하세요.</p>
          <p className="text-xs text-blue-600 mb-3">
            Phase 1: PDF 완전 추출 (10~15분) → Phase 2: 슬라이드 기획안 작성 (10분) → 기획안 검토 후 생성
          </p>
          <form action={startAnalysis.bind(null, proposal.id)}>
            <button type="submit"
              className="px-5 py-2 bg-[#6B7FA3] text-white rounded-lg hover:bg-[#5a6e91] transition text-sm font-medium">
              🔍 PDF 분석 시작
            </button>
          </form>
        </div>
      )}

      {/* ── STATUS: analyzing ── */}
      {proposal.status === "analyzing" && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">🔍 PDF 분석 + 슬라이드 기획안 작성 중... (20~25분 소요)</p>
          <p className="text-xs text-blue-600 mt-1">완료되면 기획안 검토 화면으로 자동 전환됩니다. 페이지를 새로고침하세요.</p>
          <div className="mt-3 flex gap-2 text-xs text-blue-500">
            <span className="px-2 py-1 bg-blue-100 rounded">Phase 1: PDF 추출</span>
            <span>→</span>
            <span className="px-2 py-1 bg-blue-100 rounded">Phase 2: 기획안 작성</span>
            <span>→</span>
            <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded">검토·승인 대기</span>
          </div>
        </div>
      )}

      {/* ── STATUS: planning — 기획안 검토 ── */}
      {proposal.status === "planning" && proposal.plan_md && (
        <div className="mb-6">
          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 mb-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">📋 기획안이 준비됐습니다. 검토 후 승인하세요.</p>
            <p className="text-xs text-yellow-600 mb-3">
              승인하면 Phase 3(본문 작성) → Phase 4(QA 검사) → Phase 5(PPTX 빌드)가 자동 진행됩니다.
            </p>
            <div className="flex gap-2">
              <form action={approvePlan.bind(null, proposal.id)}>
                <button type="submit"
                  className="px-5 py-2 bg-[#7BAD8C] text-white rounded-lg hover:bg-[#6a9a7b] transition text-sm font-medium">
                  ✅ 기획안 승인 → 생성 시작
                </button>
              </form>
              <form action={rejectPlan.bind(null, proposal.id)}>
                <button type="submit"
                  className="px-4 py-2 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition text-sm">
                  ↩ 재분석 (기획안 폐기)
                </button>
              </form>
            </div>
          </div>

          {/* 기획안 본문 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">슬라이드별 기획안</h2>
              <span className="text-xs text-gray-400">승인 전 내용을 꼼꼼히 확인하세요</span>
            </div>
            <div className="p-5 overflow-x-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
                {proposal.plan_md}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS: generating ── */}
      {proposal.status === "generating" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">⚙️ 투자요청서 생성 중... (30~40분 소요)</p>
          <p className="text-xs text-amber-600 mt-1">페이지를 새로고침하면 상태가 업데이트됩니다.</p>
          <div className="mt-3 flex gap-2 text-xs text-amber-600">
            <span className="px-2 py-1 bg-amber-100 rounded">Phase 3: 본문 작성</span>
            <span>→</span>
            <span className="px-2 py-1 bg-amber-100 rounded">Phase 4: QA 검사</span>
            <span>→</span>
            <span className="px-2 py-1 bg-amber-100 rounded">Phase 5: PPTX 빌드</span>
          </div>
        </div>
      )}

      {/* ── STATUS: ready/delivered — 다운로드 ── */}
      {(pptxUrl || mdUrl || htmlUrl) && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-green-800">✅ 생성 완료</p>
            {proposal.qa_report && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                proposal.qa_passed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                QA {(proposal.qa_report as Record<string, unknown>)?.overall_score as number ?? "?"}점
                {proposal.qa_passed ? " PASS" : " (인간 검토 필요)"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {pptxUrl && (
              <a href={pptxUrl} download
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7BAD8C] text-white rounded-lg hover:bg-[#6a9a7b] transition text-sm font-medium">
                📥 PPTX 다운로드
              </a>
            )}
            {mdUrl && (
              <a href={mdUrl} download
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B7FA3] text-white rounded-lg hover:bg-[#5a6e91] transition text-sm font-medium">
                📄 MD 다운로드
              </a>
            )}
            {htmlUrl && (
              <>
                <a href={htmlUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#A89DBF] text-white rounded-lg hover:bg-[#9789b0] transition text-sm font-medium">
                  🌐 HTML 보기
                </a>
                <a href={`${htmlUrl}?download=1`} download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#A89DBF] text-white rounded-lg hover:bg-[#9789b0] transition text-sm font-medium">
                  📄 HTML 다운로드
                </a>
              </>
            )}
          </div>
          {proposal.status === "ready" && (
            <form action={setProposalStatus.bind(null, proposal.id, "delivered")} className="mt-3">
              <button type="submit"
                className="px-4 py-2 border border-[#A89DBF] text-[#A89DBF] rounded-lg hover:bg-purple-50 text-sm transition">
                전달 완료 표시
              </button>
            </form>
          )}
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-700 pb-2 border-b border-gray-100">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {([
            ["사업자등록번호", proposal.company_reg_no],
            ["대표이사", proposal.ceo_name],
            ["조달 유형", proposal.funding_type],
            ["총사업비", fmt(proposal.total_cost)],
            ["조달요청액", fmt(proposal.funding_amount)],
            ["예상금리", proposal.interest_rate],
            ["대출기간", proposal.tenor_months ? `${proposal.tenor_months}개월` : null],
          ] as [string, string | null][]).map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium">{value || "-"}</dd>
            </div>
          ))}
        </dl>
        {proposal.project_desc && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">사업 설명</p>
            <p className="text-sm whitespace-pre-wrap">{proposal.project_desc}</p>
          </div>
        )}
      </div>

      {/* 첨부파일 */}
      {proposal.source_attachments && proposal.source_attachments.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
          <p className="font-medium mb-2">첨부파일 ({proposal.source_attachments.length}개)</p>
          <ul className="space-y-1">
            {proposal.source_attachments.map((p) => (
              <li key={p} className="text-xs font-mono text-gray-500">{p.split("/").pop()}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 삭제 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <form action={deleteProposal.bind(null, proposal.id)}>
          <button type="submit" className="text-sm text-red-400 hover:text-red-600 transition">
            요청서 삭제
          </button>
        </form>
      </div>
    </section>
  );
}
