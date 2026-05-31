import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionContext } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Investment Analysis Report",
  description: "회원제 투자 분석 보고서 열람",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionContext();
  const isApproved = profile?.status === "approved";
  const isAdmin = profile?.role === "admin" && isApproved;

  return (
    <html lang="ko">
      <body>
        <nav className="border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-black/30 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">Investment Analysis Report</Link>
            <div className="flex items-center gap-4 text-sm">
              {isApproved && <Link href="/reports" className="hover:underline">보고서</Link>}
              {isApproved && <Link href="/board" className="hover:underline">게시판</Link>}
              {isAdmin && <Link href="/admin" className="hover:underline">어드민</Link>}
              {user ? (
                <>
                  <span className="text-gray-500">{profile?.email ?? user.email}</span>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" className="hover:underline">로그인</Link>
              )}
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
          <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-gray-500 leading-relaxed">
            본 자료는 정보 제공 목적이며 투자자문·권유가 아닙니다. 투자 판단과 책임은 이용자 본인에게 있습니다.
          </div>
        </footer>
      </body>
    </html>
  );
}
