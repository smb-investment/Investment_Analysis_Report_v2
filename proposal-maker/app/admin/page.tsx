import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/login");
  const supabase = createSupabaseServerClient();
  const [proposalsRes, pendingRes] = await Promise.all([
    supabase.from("proposals").select("id,status").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id").eq("status", "pending"),
  ]);
  const proposals = proposalsRes.data ?? [];
  const counts = {
    total: proposals.length,
    input: proposals.filter((p) => p.status === "input").length,
    generating: proposals.filter((p) => p.status === "generating").length,
    ready: proposals.filter((p) => p.status === "ready").length,
    delivered: proposals.filter((p) => p.status === "delivered").length,
    pendingUsers: pendingRes.data?.length ?? 0,
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#6B7FA3]">어드민 콘솔</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "전체", value: counts.total, cls: "bg-blue-50 border-blue-200" },
          { label: "입력완료", value: counts.input, cls: "bg-gray-50 border-gray-200" },
          { label: "생성중", value: counts.generating, cls: "bg-amber-50 border-amber-200" },
          { label: "완료", value: counts.ready, cls: "bg-green-50 border-green-200" },
          { label: "전달완료", value: counts.delivered, cls: "bg-purple-50 border-purple-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      {counts.pendingUsers > 0 && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          ⚠️ 승인 대기 회원 <strong>{counts.pendingUsers}명</strong>이 있습니다.
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">투자요청서 관리</h2>
          <Link href="/admin/proposals/new" className="px-4 py-2 bg-[#6B7FA3] text-white text-sm rounded-lg hover:bg-[#5a6e91] transition">
            + 새 요청서
          </Link>
        </div>
        <Link href="/admin/proposals" className="text-[#6B7FA3] text-sm hover:underline">전체 목록 보기 →</Link>
      </div>
    </section>
  );
}
