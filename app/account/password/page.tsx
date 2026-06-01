import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { changePassword } from "@/lib/actions/account";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const { user, profile } = await getSessionContext();
  if (!user) redirect("/login?next=/account/password");

  const error = searchParams.error;
  const ok = searchParams.ok === "1";
  const isApproved = profile?.status === "approved";

  return (
    <section className="max-w-md mx-auto py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
          ACCOUNT
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">비밀번호 변경</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {profile?.email ?? user.email}
        </p>
      </div>

      {ok ? (
        <div className="rounded-lg border border-emerald-300/60 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800/60 p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                비밀번호가 변경되었습니다.
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                다음 로그인부터 새 비밀번호를 사용하세요.
              </p>
              <div className="mt-4 flex gap-3 text-sm">
                <Link href="/" className="underline hover:text-emerald-600 dark:hover:text-emerald-400">
                  홈으로
                </Link>
                {isApproved && (
                  <>
                    <span className="text-slate-400">·</span>
                    <Link href="/reports" className="underline hover:text-emerald-600 dark:hover:text-emerald-400">
                      보고서로
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-md border border-red-300/60 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
          <form action={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">현재 비밀번호</label>
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                새 비밀번호 <span className="text-xs text-slate-500 dark:text-slate-400">(8자 이상)</span>
              </label>
              <input
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">새 비밀번호 확인</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-md bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
            >
              비밀번호 변경
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">안전한 비밀번호</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>최소 8자 이상</li>
              <li>다른 사이트와 같은 비밀번호 재사용 금지</li>
              <li>숫자만 / 키패드 순서(예: 1234, 9876) 회피 권장</li>
            </ul>
          </div>
        </>
      )}

      <div className="mt-8 text-sm text-slate-500 dark:text-slate-400 text-center">
        <Link href="/" className="underline hover:text-slate-700 dark:hover:text-slate-300">
          ← 홈으로
        </Link>
      </div>
    </section>
  );
}
