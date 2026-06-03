import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createProposal } from "@/lib/actions/proposals";
import { redirect } from "next/navigation";

export default async function NewProposalPage({ searchParams }: { searchParams: { error?: string } }) {
  const { error } = await requireAdmin();
  if (error) redirect("/login");
  return (
    <section className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/proposals" className="text-sm text-gray-500 hover:text-[#6B7FA3]">← 목록</Link>
        <h1 className="text-2xl font-bold text-[#6B7FA3] mt-1">새 투자요청서</h1>
        <p className="text-sm text-gray-500 mt-1">기본 정보를 입력하면 PPTX가 자동 생성됩니다.</p>
      </div>
      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{searchParams.error}</div>
      )}
      <form action={createProposal} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">회사 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">회사명 <span className="text-red-500">*</span></label>
              <input name="company_name" required className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">사업자등록번호</label>
              <input name="company_reg_no" placeholder="000-00-00000" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">대표이사명</label>
              <input name="ceo_name" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">사업 개요</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">프로젝트명</label>
              <input name="project_name" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">사업 설명</label>
              <textarea name="project_desc" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3] resize-none" />
            </div>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">딜 조건</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">총사업비 (원)</label>
              <input name="total_cost" type="number" placeholder="57300000000" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">조달요청액 (원)</label>
              <input name="funding_amount" type="number" placeholder="38000000000" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">조달 유형</label>
              <select name="funding_type" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3] bg-white">
                <option value="PF">PF (Project Finance)</option>
                <option value="equity">지분 투자 (Equity)</option>
                <option value="mezzanine">메자닌 (Mezzanine)</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">예상금리</label>
              <input name="interest_rate" placeholder="[TBD] 또는 8%" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">대출기간 (개월)</label>
              <input name="tenor_months" type="number" placeholder="60" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">추가 메모 (에이전트 참고용)</label>
          <textarea name="notes" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6B7FA3] resize-none" />
        </div>
        <div className="pt-2">
          <button type="submit" className="w-full py-3 bg-[#6B7FA3] text-white font-medium rounded-lg hover:bg-[#5a6e91] transition">
            요청서 생성 →
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">생성 후 첨부파일을 업로드하고 [생성 시작]을 클릭하면 PPTX가 자동으로 만들어집니다.</p>
        </div>
      </form>
    </section>
  );
}
