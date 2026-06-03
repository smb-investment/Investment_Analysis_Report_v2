import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; pending?: string; next?: string };
}) {
  const next = searchParams.next ?? "/admin";
  return (
    <section className="max-w-sm mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6 text-[#6B7FA3]">로그인</h1>
      {searchParams.pending === "1" && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          어드민 승인 대기 중입니다. 승인 후 로그인해 주세요.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {searchParams.error}
        </div>
      )}
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-sm font-medium mb-1">이메일</label>
          <input name="email" type="email" required autoComplete="email"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">비밀번호</label>
          <input name="password" type="password" required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7FA3]" />
        </div>
        <button type="submit"
          className="w-full py-2 rounded-lg bg-[#6B7FA3] text-white font-medium hover:bg-[#5a6e91] transition">
          로그인
        </button>
      </form>
      <p className="mt-5 text-sm text-gray-500 text-center">
        계정이 없으신가요? <Link href="/signup" className="text-[#6B7FA3] underline">회원가입</Link>
      </p>
    </section>
  );
}
