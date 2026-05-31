import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 300; // 5 minutes (PRD: 만료 ≤5분)

async function getSigned(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bucket: string,
  path: string | null,
  download: boolean | string = false,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL, { download });
  return data?.signedUrl ?? null;
}

// Storage 가 HTML 파일 Content-Type 을 text/plain 으로 sniffing 하는 이슈 우회.
// 본문을 직접 다운로드해 iframe srcdoc 으로 렌더.
async function fetchHtmlBody(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("reports-html").download(path);
  if (error || !data) return null;
  return await data.text();
}

export default async function ReportViewerPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: report, error } = await supabase
    .from("reports")
    .select("id,title,company,ticker,period,summary,status,md_path,html_path,model_used,web_search_used,created_at")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !report) notFound();

  const safeName = (report.company || report.title || "report").replace(/[^가-힣A-Za-z0-9_-]/g, "_");
  const [htmlBody, htmlDownloadUrl, mdDownloadUrl] = await Promise.all([
    fetchHtmlBody(supabase, report.html_path),
    getSigned(supabase, "reports-html", report.html_path, `${safeName}.html`),
    getSigned(supabase, "reports-md", report.md_path, `${safeName}.md`),
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
          {htmlDownloadUrl && (
            <a
              href={htmlDownloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 transition text-slate-950 text-sm font-semibold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              HTML
            </a>
          )}
          {mdDownloadUrl && (
            <a
              href={mdDownloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              MD
            </a>
          )}
        </div>
      </div>

      {report.summary && (
        <div className="mb-4 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4 text-sm">
          {report.summary}
        </div>
      )}

      {htmlBody ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white">
          <iframe
            srcDoc={htmlBody}
            sandbox="allow-same-origin allow-popups"
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
