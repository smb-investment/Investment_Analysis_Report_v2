import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ready:     { label: "완료",    cls: "bg-green-100 text-green-700" },
  delivered: { label: "전달완료", cls: "bg-purple-100 text-purple-700" },
};

function fmt(n: number | null) {
  if (!n) return "-";
  return (n / 100_000_000).toFixed(0) + "억원";
}

export default async function ProposalsPage() {
  const { profile } = await getSessionContext();
  if (profile?.status !== "approved") redirect("/login?pending=1");

  const supabase = createSupabaseServerClient();
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id,company_name,project_name,funding_amount,status,created_at")
    .in("status", ["ready", "delivered"])
    .order("created_at", { ascending: false });

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-[#6B7FA3]">← 홈</Link>
          <h1 className="text-2xl font-bold text-[#6B7FA3] mt-1">투자요청서 보고서</h1>
          <p className="text-sm text-gray-500 mt-1">완료된 투자요청서를 조회하고 다운로드할 수 있습니다.</p>
        </div>
      </div>

      {!proposals || proposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📄</div>
          <p>아직 완료된 투자요청서가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">회사명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">프로젝트</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">조달금액</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">생성일</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const st = STATUS[p.status] ?? { label: p.status, cls: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/proposals/${p.id}`} className="font-medium text-[#6B7FA3] hover:underline">
                        {p.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.project_name || "-"}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(p.funding_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
