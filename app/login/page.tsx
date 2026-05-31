import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; pending?: string; next?: string } }) {
  const error = searchParams.error;
  const pending = searchParams.pending === "1";
  const next = searchParams.next ?? "/reports";

  return (
    <section className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">로그인</h1>

      {pending && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
          가입은 되어 있으나 아직 어드민 승인 전입니다. 승인 후 다시 로그인해 주세요.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
          {error}
        </div>
      )}

      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-sm mb-1">이메일</label>
          <input name="email" type="email" required autoComplete="email"
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">비밀번호</label>
          <input name="password" type="password" required autoComplete="current-password"
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
        <button type="submit" className="w-full px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">
          로그인
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        계정이 없으신가요? <Link href="/signup" className="underline">회원가입</Link>
      </p>
    </section>
  );
}
