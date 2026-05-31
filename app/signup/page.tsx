import Link from "next/link";
import { signUp } from "@/lib/actions/auth";

export default function SignupPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const error = searchParams.error;
  const ok = searchParams.ok === "1";

  return (
    <section className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">회원가입</h1>

      {ok ? (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-3 text-sm">
          가입 요청을 받았습니다. Supabase 이메일 확인 정책이 켜져 있다면 메일함을 확인해 주세요.
          <br />이메일 확인 후에도 <b>어드민 승인</b>이 끝나야 보고서/게시판에 접근할 수 있습니다.
          <div className="mt-3"><Link href="/login" className="underline">로그인 페이지로</Link></div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
              {error}
            </div>
          )}
          <form action={signUp} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">이메일</label>
              <input name="email" type="email" required autoComplete="email"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">비밀번호 (8자 이상)</label>
              <input name="password" type="password" required minLength={8} autoComplete="new-password"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <button type="submit" className="w-full px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">
              가입 요청
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            이미 계정이 있으신가요? <Link href="/login" className="underline">로그인</Link>
          </p>
        </>
      )}
    </section>
  );
}
