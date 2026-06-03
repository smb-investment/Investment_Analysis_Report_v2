import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionContext } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "투자요청서 자동생성 | SMB투자파트너스",
  description: "투자요청서 PPTX 자동생성 시스템",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionContext();
  const isApproved = profile?.status === "approved";
  const isAdmin = isApproved && profile?.role === "admin";

  return (
    <html lang="ko">
      <body>
        <nav className="border-b border-gray-200 bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-[#6B7FA3]">
              SMB 투자요청서 Generator
            </Link>
            <div className="flex items-center gap-5 text-sm">
              {isApproved && <Link href="/proposals" className="hover:text-[#6B7FA3]">보고서</Link>}
              {isAdmin && <Link href="/admin" className="hover:text-[#6B7FA3] font-medium">어드민</Link>}
              {user ? (
                <>
                  <span className="text-gray-500 text-xs">{profile?.email ?? user.email}</span>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" className="hover:text-[#6B7FA3]">로그인</Link>
              )}
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-5xl mx-auto px-4 py-5 text-xs text-gray-500">
            본 자료는 정보 제공 목적이며 투자자문·권유가 아닙니다. 투자 판단과 책임은 이용자 본인에게 있습니다.
          </div>
        </footer>
      </body>
    </html>
  );
}
