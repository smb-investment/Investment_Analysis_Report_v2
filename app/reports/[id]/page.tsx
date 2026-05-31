import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import PrintClient from "./PrintClient";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 300; // 5 minutes (PRD: 만료 ≤5분)

async function getSigned(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bucket: string,
  path: string | null,
  download = false,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL, { download });
  return data?.signedUrl ?? null;
}

export default async function ReportViewerPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: report, error } = await supabase
    .from("reports")
    .select("id,title,company,ticker,period,summary,status,md_path,html_path,pdf_path,model_used,web_search_used,created_at")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !report) notFound();

  const [htmlUrl, mdUrl, pdfUrl] = await Promise.all([
    getSigned(supabase, "reports-html", report.html_path),
    getSigned(supabase, "reports-md", report.md_path, true),
    getSigned(supabase, "reports-pdf", report.pdf_path, true),
  ]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/reports" className="text-sm text-gray-500 hover:underline">← 목록</Link>
          <h1 className="text-2xl font-semibold mt-1">{report.title || report.company || "(제목 없음)"}</h1>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {[report.company, report.ticker, report.period].filter(Boolean).join(" · ")}
            <span className="ml-2 text-gray-500">· {formatDateTime(report.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          {pdfUrl && (
            <a href={pdfUrl} download className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm">PDF</a>
          )}
          {mdUrl && (
            <a href={mdUrl} download className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm">MD</a>
          )}
          <PrintClient />
        </div>
      </div>

      {report.summary && (
        <div className="mb-4 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4 text-sm">
          {report.summary}
        </div>
      )}

      {htmlUrl ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white">
          <iframe
            src={htmlUrl}
            sandbox="allow-same-origin"
            className="w-full"
            style={{ height: "80vh", border: 0 }}
            title="보고서 본문"
          />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500">
          본문 HTML이 아직 업로드되지 않았습니다.
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        {report.model_used && <span className="mr-3">모델: {report.model_used}</span>}
        {report.web_search_used && <span>웹 검색 사용</span>}
      </div>
    </section>
  );
}
