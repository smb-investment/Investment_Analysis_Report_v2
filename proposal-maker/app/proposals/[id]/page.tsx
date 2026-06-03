import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/actions/proposals";
import type { Proposal } from "@/lib/actions/proposals";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ready:     { label: "완료",    cls: "bg-green-100 text-green-700" },
  delivered: { label: "전달완료", cls: "bg-purple-100 text-purple-700" },
};

function fmt(n: number | null) {
  if (!n) return "-";
  return (n / 100_000_000).toFixed(1) + "억원";
}

export default async function MemberProposalDetailPage({ params }: { params: { id: string } }) {
  const { profile } = await getSessionContext();
  if (profile?.status !== "approved") redirect("/login?pending=1");

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .in("status", ["ready", "delivered"])
    .maybeSingle();

  if (!data) notFound();
  const proposal = data as Proposal;
  const st = STATUS[proposal.status] ?? { label: proposal.status, cls: "bg-gray-100 text-gray-700" };

  const [pptxUrl, mdUrl, htmlUrl] = await Promise.all([
    proposal.pptx_path ? getSignedUrl("proposals-pptx", proposal.pptx_path) : Promise.resolve(null),
    proposal.md_path   ? getSignedUrl("proposals-pptx", proposal.md_path)   : Promise.resolve(null),
    proposal.html_path ? getSignedUrl("proposals-pptx", proposal.html_path) : Promise.resolve(null),
  ]);

  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <Link href="/proposals" className="text-sm text-gray-500 hover:text-[#6B7FA3]">← 목록</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-[#6B7FA3]">{proposal.company_name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{proposal.project_name || "프로젝트명 미입력"}</p>
      </div>

      {/* Download buttons */}
      {(pptxUrl || mdUrl || htmlUrl) && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-sm font-medium text-green-800 mb-3">파일 다운로드</p>
          <div className="flex flex-wrap gap-2">
            {pptxUrl && (
              <a
                href={pptxUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7BAD8C] text-white rounded-lg hover:bg-[#6a9a7b] transition text-sm font-medium"
              >
                📥 PPTX 다운로드
              </a>
            )}
            {mdUrl && (
              <a
                href={mdUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B7FA3] text-white rounded-lg hover:bg-[#5a6e91] transition text-sm font-medium"
              >
                📄 MD 다운로드
              </a>
            )}
            {htmlUrl && (
              <a
                href={htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#A89DBF] text-white rounded-lg hover:bg-[#9789b0] transition text-sm font-medium"
              >
                🌐 HTML 보기
              </a>
            )}
          </div>
        </div>
      )}

      {/* HTML preview iframe */}
      {htmlUrl && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">HTML 미리보기</p>
          <iframe
            src={htmlUrl}
            className="w-full rounded-xl border border-gray-200"
            style={{ height: "600px" }}
            title={`${proposal.company_name} 투자요청서 미리보기`}
          />
        </div>
      )}

      {/* Proposal details */}
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

      <p className="mt-4 text-xs text-gray-400 text-center">
        본 자료는 정보 제공 목적이며 투자자문·권유가 아닙니다. 투자 판단과 책임은 이용자 본인에게 있습니다.
      </p>
    </section>
  );
}
