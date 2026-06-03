import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startGeneration, setProposalStatus, deleteProposal, getProposalDownloadUrl, getSignedUrl } from "@/lib/actions/proposals";
import type { Proposal } from "@/lib/actions/proposals";

const STATUS: Record<string, { label: string; cls: string }> = {
  input:      { label: "입력완료",   cls: "bg-gray-100 text-gray-700" },
  generating: { label: "🔄 생성중", cls: "bg-amber-100 text-amber-700" },
  ready:      { label: "✅ 완료",   cls: "bg-green-100 text-green-700" },
  delivered:  { label: "전달완료",  cls: "bg-purple-100 text-purple-700" },
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
  let downloadUrl: string | null = null;
  let mdUrl: string | null = null;
  let htmlUrl: string | null = null;
  if (proposal.status === "ready" || proposal.status === "delivered") {
    if (proposal.pptx_path) downloadUrl = await getProposalDownloadUrl(proposal.pptx_path);
    if (proposal.md_path) mdUrl = await getSignedUrl("proposals-md", proposal.md_path);
    if (proposal.html_path) htmlUrl = `/api/proposals/${proposal.id}/html`;
  }
  return (
    <section className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/proposals" className="text-sm text-gray-500 hover:text-[#6B7FA3]">← 목록</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-[#6B7FA3]">{proposal.company_name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{proposal.project_name || "프로젝트명 미입력"}</p>
      </div>

      {proposal.error_message && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">❌ {proposal.error_message}</div>
      )}

      {(proposal.status === "ready" || proposal.status === "delivered") && (downloadUrl || mdUrl || htmlUrl) && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-sm font-medium text-green-800 mb-3">✅ 생성 완료</p>
          <div className="flex flex-wrap gap-2">
            {downloadUrl && (
              <a href={downloadUrl} download className="inline-flex items-center gap-2 px-4 py-2 bg-[#7BAD8C] text-white rounded-lg hover:bg-[#6a9a7b] transition text-sm font-medium">
                📥 PPTX 다운로드
              </a>
            )}
            {mdUrl && (
              <a href={mdUrl} download className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B7FA3] text-white rounded-lg hover:bg-[#5a6e91] transition text-sm font-medium">
                📄 MD 다운로드
              </a>
            )}
            {htmlUrl && (
              <>
                <a href={htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[#A89DBF] text-white rounded-lg hover:bg-[#9789b0] transition text-sm font-medium">
                  🌐 HTML 보기
                </a>
                <a href={`${htmlUrl}?download=1`} download className="inline-flex items-center gap-2 px-4 py-2 bg-[#A89DBF] text-white rounded-lg hover:bg-[#9789b0] transition text-sm font-medium">
                  📄 HTML 다운로드
                </a>
              </>
            )}
          </div>
          {proposal.status === "ready" && (
            <form action={setProposalStatus.bind(null, proposal.id, "delivered")} className="mt-3">
              <button type="submit" className="px-4 py-2 border border-[#A89DBF] text-[#A89DBF] rounded-lg hover:bg-purple-50 text-sm transition">
                전달 완료 표시
              </button>
            </form>
          )}
        </div>
      )}

      {proposal.status === "generating" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">🔄 에이전트가 PPTX를 생성 중입니다... (30~60분 소요)</p>
          <p className="text-xs text-amber-600 mt-1">페이지를 새로고침하면 상태가 업데이트됩니다.</p>
        </div>
      )}

      {proposal.status === "input" && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 mb-3">첨부파일 업로드 완료 후 아래 버튼을 클릭하세요.</p>
          <form action={startGeneration.bind(null, proposal.id)}>
            <button type="submit" className="px-5 py-2 bg-[#6B7FA3] text-white rounded-lg hover:bg-[#5a6e91] transition text-sm font-medium">
              ▶ PPTX 생성 시작
            </button>
          </form>
        </div>
      )}

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
