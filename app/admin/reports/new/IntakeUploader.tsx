"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createIntakeReport } from "@/lib/actions/admin";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
}

export default function IntakeUploader() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [ticker, setTicker] = useState("");
  const [period, setPeriod] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!company.trim()) { setError("회사명을 입력하세요."); return; }
    if (files.length === 0) { setError("최소 1개 파일을 선택하세요."); return; }
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) { setError(`${f.name} 은 20MB를 초과합니다.`); return; }
      if (!/\.pdf$/i.test(f.name)) { setError(`${f.name} 은 PDF가 아닙니다.`); return; }
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const reportId = crypto.randomUUID();
      const paths: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = `${reportId}/${Date.now()}-${i}-${sanitizeFileName(f.name)}`;
        setProgress(`업로드 중 (${i + 1}/${files.length}) ${f.name}`);
        const { error: upErr } = await supabase.storage.from("reports-pdf").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });
        if (upErr) { setError(`업로드 실패: ${upErr.message}`); setBusy(false); setProgress(null); return; }
        paths.push(path);
      }

      setProgress("보고서 메타 등록 중…");
      const result = await createIntakeReport({
        title: title.trim(),
        company: company.trim(),
        ticker: ticker.trim(),
        period: period.trim(),
        pdfPaths: paths,
      });

      if ("error" in result) {
        setError(result.error);
        setBusy(false);
        setProgress(null);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
          {error}
        </div>
      )}
      {progress && (
        <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-sm">
          {progress}
        </div>
      )}

      <div>
        <label className="block text-sm mb-1">제목 (선택)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">회사명 *</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={200}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">티커</label>
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} maxLength={32}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">기간 (예: 2024Q3)</label>
          <input value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={64}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">PDF 파일 (여러 개 선택 가능, 각 ≤20MB)</label>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full text-sm"
        />
        {files.length > 0 && (
          <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
            {files.map((f) => (
              <li key={f.name}>· {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
        >
          {busy ? "업로드 중…" : "업로드"}
        </button>
        <a href="/admin" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">취소</a>
      </div>
    </form>
  );
}
