import Link from "next/link";
import { createPost } from "@/lib/actions/board";

export default function NewPostPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error;
  return (
    <section className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Link href="/board" className="text-sm text-gray-500 hover:underline">← 목록</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-6">글쓰기</h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
          {error}
        </div>
      )}

      <form action={createPost} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">제목</label>
          <input name="title" required maxLength={200}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">내용</label>
          <textarea name="content" rows={12} maxLength={20000}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">등록</button>
          <Link href="/board" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">취소</Link>
        </div>
      </form>
    </section>
  );
}
