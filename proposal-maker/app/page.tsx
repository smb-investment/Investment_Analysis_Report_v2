import Link from "next/link";
import { getSessionContext } from "@/lib/auth";

export default async function HomePage() {
  const { profile } = await getSessionContext();
  const isAdmin = profile?.role === "admin" && profile?.status === "approved";

  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#6B7FA3] mb-3">투자요청서 자동생성</h1>
        <p className="text-gray-600">첨부 자료를 업로드하면 21-Slide PPTX 투자요청서를 자동으로 생성합니다.</p>
      </div>
      {isAdmin ? (
        <div className="flex justify-center">
          <Link href="/admin" className="px-6 py-3 bg-[#6B7FA3] text-white rounded-lg font-medium hover:bg-[#5a6e91] transition">
            어드민 콘솔 →
          </Link>
        </div>
      ) : (
        <div className="flex justify-center">
          <Link href="/login" className="px-6 py-3 border border-[#6B7FA3] text-[#6B7FA3] rounded-lg font-medium hover:bg-[#6B7FA3] hover:text-white transition">
            로그인
          </Link>
        </div>
      )}
    </section>
  );
}
