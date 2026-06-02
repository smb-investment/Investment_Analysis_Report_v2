import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { setReportStatus } from "@/lib/actions/admin";
import StartAnalysisDialog from "../../StartAnalysisDialog";

export const dynamic = "force-dynamic";

type ReportStatus = "intake" | "analyzing" | "draft" | "published";

type Report = {
  id: string;
  title: string | null;
  company: string | null;
  ticker: string | null;
  period: string | null;
  summary: string | null;
  status: ReportStatus;
  md_path: string | null;
  html_path: string | null;
  model_used: string | null;
  web_search_used: boolean | null;
  selected_sections: string[] | null;
  created_at: string;
};

const SIGNED_URL_TTL = 300;

const STATUS_LABEL: Record<ReportStatus, string> = {
  intake: "분석대기",
  analyzing: "분석중",
  draft: "초안",
  published: "게시",
};

const STATUS_TONE: Record<ReportStatus, string> = {
  intake: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  analyzing: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  draft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

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

async function fetchHtmlBody(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("reports-html").download(path);
  if (error || !data) return null;
  return await data.text();
}

export default async function AdminReportPreviewPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdmin();
  if (ctx.error) redirect("/login");

  const supabase = createSupabaseServerClient();
  const { data: report, error } = await supabase
    .from("reports")
    .select("id,title,company,ticker,period,summary,status,md_path,html_path,model_used,web_search_used,selected_sections,created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !report) notFound();
  const r = report as Report;

  const safeName = (r.company || r.title || "report").replace(/[^가-힣A-Za-z0-9_-]/g, "_");
  const [htmlBody, htmlDownloadUrl, mdDownloadUrl] = await Promise.all([
    fetchHtmlBody(supabase, r.html_path),
    getSigned(supabase, "reports-html", r.html_path, `${safeName}.html`),
    getSigned(supabase, "reports-md", r.md_path, `${safeName}.md`),
  ]);

  const sections = Array.isArray(r.selected_sections) ? r.selected_sections : null;
  const label = r.title || r.company || "(제목 없음)";

  return (
    <section>
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          어드민
        </Link>
      </div>

      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400 mb-1">ADMIN PREVIEW</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{label}</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${STATUS_TONE[r.status]}`}>
              {STATUS_LABEL[r.status]}
            </span>
            {r.company && <span>{r.company}</span>}
            {r.ticker && <span>· {r.ticker}</span>}
            {r.period && <span>· {r.period}</span>}
            <span>· {formatDateTime(r.created_at)}</span>
            {r.status === "analyzing" && sections && (
              <span className="text-violet-600 dark:text-violet-300">· §{sections.join(",")} 분석 중</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 no-print">
          {htmlDownloadUrl && (
            <a
              href={htmlDownloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition text-xs font-medium"
            >
              HTML
            </a>
          )}
          {mdDownloadUrl && (
            <a
              href={mdDownloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition text-xs font-medium"
            >
              MD
            </a>
          )}
        </div>
      </div>

      {r.summary && (
        <div className="mb-4 rounded-md bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 p-4 text-sm">
          {r.summary}
        </div>
      )}

      {htmlBody ? (
        <div className="border border-slate-200 dark:border-slate-600 rounded-md overflow-hidden bg-white">
          <iframe
            srcDoc={htmlBody}
            sandbox="allow-same-origin allow-popups"
            className="w-full"
            style={{ height: "80vh", border: 0 }}
            title="보고서 본문"
          />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {r.status === "intake" && "아직 분석 시작 전입니다. 아래 [분석 시작] 으로 진행하세요."}
          {r.status === "analyzing" && "분석 중입니다. PC 에서 npm run analyze 실행 후 완료되면 본문이 표시됩니다."}
          {(r.status === "draft" || r.status === "published") && "본문 HTML이 아직 업로드되지 않았습니다."}
        </div>
      )}

      {/* 액션 패널 */}
      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-5">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-3">
          액션
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          {r.status === "intake" && (
            <StartAnalysisDialog reportId={r.id} reportLabel={label} defaultSections={sections ?? undefined} />
          )}
          {r.status === "analyzing" && (
            <ActionButton id={r.id} status="intake" label="분석 취소 (분석대기로)" />
          )}
          {r.status === "draft" && (
            <>
              <ActionButton id={r.id} status="published" label="게시" tone="primary" />
              <ActionButton id={r.id} status="intake" label="분석대기로" />
            </>
          )}
          {r.status === "published" && (
            <>
              <ActionButton id={r.id} status="draft" label="초안으로" />
              <Link
                href={`/reports/${r.id}`}
                className="px-2.5 py-1 rounded-md border border-cyan-400/50 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-xs font-medium transition"
              >
                회원 페이지에서 보기 →
              </Link>
            </>
          )}
        </div>
        {r.status === "draft" && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            본문을 검수한 후 [→ 게시] 를 누르면 회원에게 노출됩니다.
          </p>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        {r.model_used && <span className="mr-3">모델: {r.model_used}</span>}
        {r.web_search_used && <span>웹 검색 사용</span>}
      </div>
    </section>
  );
}

function ActionButton({
  id,
  status,
  label,
  tone,
}: {
  id: string;
  status: ReportStatus;
  label: string;
  tone?: "primary";
}) {
  const cls = tone === "primary"
    ? "px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition"
    : "px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-500 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 text-sm font-medium transition";
  return (
    <form action={setReportStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={cls}>→ {label}</button>
    </form>
  );
}
