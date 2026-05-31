import Link from "next/link";
import { getSessionContext } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getSessionContext();
  const isApproved = profile?.status === "approved";

  return (
    <div className="-mx-4 sm:-mx-0">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 px-6 py-16 sm:py-24 mb-12">
        {/* 배경 그리드 패턴 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        {/* 글로우 */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-xs font-medium text-cyan-300 mb-6">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            AI-POWERED INVESTMENT INTELLIGENCE
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            <span className="block">AI가 분석하는</span>
            <span className="block bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              투자 검토 보고서
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
            공시 자료를 던지면 <span className="text-white font-semibold">Claude AI</span>가
            <span className="text-white font-semibold"> 산업·재무·리스크·밸류에이션·M&amp;A 시나리오</span>까지
            <br className="hidden sm:block" />
            <span className="text-cyan-300 font-semibold">9 섹션 IC 부의자료</span>를 30분 안에 작성합니다.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {!user ? (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20"
                >
                  무료 회원가입 →
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 hover:border-slate-400 transition px-5 py-3 text-sm font-semibold text-slate-200"
                >
                  로그인
                </Link>
              </>
            ) : !isApproved ? (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                ⏳ 가입 완료. 어드민 승인 후 보고서·게시판 이용 가능합니다.
                <span className="ml-2 font-mono text-xs">[{profile?.status ?? "unknown"}]</span>
              </div>
            ) : (
              <>
                <Link
                  href="/reports"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20"
                >
                  보고서 보기 →
                </Link>
                <Link
                  href="/board"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 hover:border-slate-400 transition px-5 py-3 text-sm font-semibold text-slate-200"
                >
                  게시판
                </Link>
              </>
            )}
          </div>

          {/* 신뢰 지표 */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl">
            <Metric value="9" label="Sections" />
            <Metric value="30" label="Minutes" />
            <Metric value="0" label="API Costs (구독제)" />
          </div>
        </div>
      </section>

      {/* 핵심 기능 3개 */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">CORE CAPABILITIES</p>
          <h2 className="text-2xl sm:text-3xl font-bold">전문가 수준의 분석을, 자동으로.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={<IconBrain />}
            title="AI 분석 엔진"
            desc="수십·수백 페이지의 공시 자료를 Claude AI가 읽어 자료/추정을 분리하고, 핵심 수치를 발췌·재구성합니다."
          />
          <FeatureCard
            icon={<IconReport />}
            title="9 섹션 표준 보고서"
            desc="Executive Summary · 산업 · 회사 · 강점 · 리스크 · 밸류에이션 · 실사 · IRL · PMI · 가중점수표 — IC 부의자료 그대로의 구조."
          />
          <FeatureCard
            icon={<IconShield />}
            title="보안 회원제"
            desc="Row Level Security · Signed URL(5분 만료) · 어드민 승인제 · 검수된 보고서만 회원에게 노출됩니다."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-6 sm:p-10">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">HOW IT WORKS</p>
          <h2 className="text-2xl sm:text-3xl font-bold">4 단계, 30 분.</h2>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Step n={1} title="자료 업로드" desc="DART 분기보고서, IR 자료, IM 등 PDF를 어드민이 업로드 (≤20MB)." />
          <Step n={2} title="AI 분석" desc="Claude AI가 산업·재무·리스크·밸류에이션을 9 섹션으로 자동 작성." />
          <Step n={3} title="사람 검수" desc="어드민이 사실/추정·출처·면책 확인 후 게시 (published)." />
          <Step n={4} title="회원 열람" desc="승인 회원이 보고서를 열람·MD/PDF 다운로드·인쇄." />
        </ol>
      </section>

      {/* 최종 CTA (미로그인일 때만) */}
      {!user && (
        <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-indigo-500/10 p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">지금 시작하세요</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-xl mx-auto">
            가입 후 어드민 승인을 받으면 모든 보고서를 열람할 수 있습니다.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20"
            >
              무료 회원가입 →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:border-slate-400 transition px-6 py-3 text-sm font-semibold"
            >
              로그인
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 p-6 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="relative">
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 p-5 h-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-slate-950 text-sm font-bold">
            {n}
          </span>
          <span className="font-semibold">{title}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </li>
  );
}

/* --- inline SVG icons --- */

function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M8 9h2" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
