import Link from "next/link";
import { createPost } from "@/lib/actions/board";

export default function NewPostPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error;
  return (
    <section className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/board" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          목록
        </Link>
      </div>

      <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-2">
        NEW POST
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">글쓰기</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/40 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/60 p-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <form action={createPost} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">제목</label>
          <input
            name="title"
            required
            maxLength={200}
            placeholder="제목을 입력하세요"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">내용</label>
          <textarea
            name="content"
            rows={12}
            maxLength={20000}
            placeholder="내용을 입력하세요…"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 leading-relaxed"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
          >
            등록
          </button>
          <Link
            href="/board"
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-500 hover:border-slate-400 dark:hover:border-slate-400 text-sm font-medium transition"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
