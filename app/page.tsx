import Link from "next/link";
import { getSessionContext } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getSessionContext();
  const isApproved = profile?.status === "approved";

  return (
    <section className="py-10">
      <h1 className="text-3xl font-bold mb-2">Investment Proposal</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        승인 회원 전용 투자 분석 보고서 열람 사이트입니다.
      </p>

      {!user ? (
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">로그인</Link>
          <Link href="/signup" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">회원가입</Link>
        </div>
      ) : !isApproved ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm">
          가입은 완료되었습니다. 어드민 승인 후 보고서/게시판에 접근할 수 있습니다.
          <br />상태: <span className="font-mono">{profile?.status ?? "unknown"}</span>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link href="/reports" className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">보고서 보기</Link>
          <Link href="/board" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">게시판</Link>
        </div>
      )}
    </section>
  );
}
