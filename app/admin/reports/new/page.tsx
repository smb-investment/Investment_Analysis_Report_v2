import Link from "next/link";
import IntakeUploader from "./IntakeUploader";

export default function NewIntakePage() {
  return (
    <section className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          어드민
        </Link>
      </div>

      <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
        INTAKE UPLOAD
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">자료수집 업로드</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
        분석 대상 PDF(예: DART 분기보고서)를 업로드합니다. 각 파일 ≤ <span className="font-semibold">20MB</span>.
        업로드 후 보고서가 <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 text-xs font-mono">status=intake</code>로 생성됩니다.
        2단계 분석 도구가 자료를 읽어 본문(HTML/MD)을 만들고 <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 text-xs font-mono">draft</code>로 올립니다.
      </p>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-6">
        <IntakeUploader />
      </div>
    </section>
  );
}
