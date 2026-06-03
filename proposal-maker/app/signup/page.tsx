import Link from "next/link";
import { signUp } from "@/lib/actions/auth";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  if (searchParams.ok === "1") {
    return (
      <section className="max-w-sm mx-auto py-12">
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          가입 요청 완료. 어드민 승인 후 로그인 가능합니다.
          <div className="mt-3"><Link href="/login" className="underline">로그인으로</Link></div>
        </div>
      </section>
    );
  }
  return (
    <section className="max-w-sm mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6 text-[#6B7FA3]">회원가입</h1>
      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {searchParams.error}
        </div>
      )}
      <form action={signUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">이메일</label>
          <input name="email" type="email" required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">비밀번호 (8자 이상)</label>
          <input name="password" type="password" required minLength={8}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
        </div>
        <button type="submit"
          className="w-full py-2 rounded-lg bg-[#6B7FA3] text-white font-medium hover:bg-[#5a6e91] transition">
          가입 요청
        </button>
      </form>
      <p className="mt-5 text-sm text-gray-500 text-center">
        이미 계정이 있으신가요? <Link href="/login" className="text-[#6B7FA3] underline">로그인</Link>
      </p>
    </section>
  );
}
