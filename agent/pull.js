#!/usr/bin/env node
// 실행: node --env-file=agent/.env agent/pull.js [<reportId>]
// 1) status=analyzing 인 reports 1건 가져오기 (id 미지정 시 가장 오래된 1건)
//    - 사이트 /admin 에서 [분석 시작] 을 눌러 analyzing 으로 전환된 보고서만 픽업
// 2) source_material(JSON 배열)에 적힌 PDF 들을 reports-pdf 버킷에서 다운로드
// 3) agent/inbox/<reportId>/ 에 저장 + meta.json(selected_sections 포함) +
//    report_template.md 에서 미선택 §1~§9 섹션은 제거한 report.md 생성
"use strict";

const fs = require("fs");
const path = require("path");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("agent/.env 에 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  console.error("실행 예: node --env-file=agent/.env agent/pull.js");
  process.exit(2);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const H = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

async function get(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function downloadObject(bucket, objectPath, destFile) {
  const url = `${STORAGE}/object/${bucket}/${objectPath}`;
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`download ${url} → ${r.status} ${await r.text()}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, buf);
  return buf.length;
}

(async () => {
  const argId = process.argv[2];
  const filter = argId
    ? `id=eq.${encodeURIComponent(argId)}`
    : `status=eq.analyzing&order=created_at.asc&limit=1`;
  const cols = "id,title,company,ticker,period,status,source_material,pdf_path,selected_sections,created_at,created_by";
  const rows = await get(`${REST}/reports?select=${cols}&${filter}`);

  if (rows.length === 0) {
    console.log("analyzing 상태 보고서가 없습니다.");
    console.log("사이트의 /admin 에서 분석대기 보고서의 [분석 시작] 을 눌러주세요.");
    return;
  }
  const row = rows[0];
  const sections = Array.isArray(row.selected_sections) && row.selected_sections.length > 0
    ? row.selected_sections.map(String)
    : ["1","2","3","4","5","6","7","8","9"];
  console.log(`Target report: id=${row.id}  company=${row.company}  period=${row.period}  status=${row.status}`);
  console.log(`Selected sections: §${sections.join(", §")}`);

  let paths = [];
  if (row.source_material) {
    try { paths = JSON.parse(row.source_material); } catch { paths = []; }
    if (!Array.isArray(paths)) paths = [];
  }
  if (paths.length === 0 && row.pdf_path) paths = [row.pdf_path];
  if (paths.length === 0) {
    console.error("source_material 또는 pdf_path 가 비어 있습니다. 사이트에서 PDF 를 다시 업로드하세요.");
    process.exit(1);
  }

  const inboxDir = path.join(__dirname, "inbox", row.id);
  const pdfDir = path.join(inboxDir, "pdf");
  fs.mkdirSync(pdfDir, { recursive: true });

  let totalBytes = 0;
  for (const objectPath of paths) {
    const fileName = path.basename(objectPath);
    const destFile = path.join(pdfDir, fileName);
    process.stdout.write(`  ↓ ${objectPath} ... `);
    const size = await downloadObject("reports-pdf", objectPath, destFile);
    totalBytes += size;
    process.stdout.write(`${(size / 1024).toFixed(1)} KB\n`);
  }

  // meta.json 작성
  const meta = {
    id: row.id,
    title: row.title,
    company: row.company,
    ticker: row.ticker,
    period: row.period,
    status: row.status,
    selected_sections: sections,
    created_at: row.created_at,
    pdf_paths: paths,
  };
  fs.writeFileSync(path.join(inboxDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  // report_template.md 를 작업용으로 복사 (한 번만)
  // selected_sections 에 없는 §1~§9 섹션은 삭제하고, §0 / 면책 / 헤더는 유지
  const templateSrc = path.join(__dirname, "report_template.md");
  const reportDraft = path.join(inboxDir, "report.md");
  if (!fs.existsSync(reportDraft) && fs.existsSync(templateSrc)) {
    let tmpl = fs.readFileSync(templateSrc, "utf8");
    const today = new Date().toISOString().slice(0, 10);
    tmpl = tmpl
      .replace(/\{회사명\}/g, row.company || "회사명")
      .replace(/\{영문약호\}/g, row.ticker || "TICKER")
      .replace(/\{YYYY-MM-DD\}/g, today);
    tmpl = filterTemplateBySections(tmpl, sections);
    fs.writeFileSync(reportDraft, tmpl, "utf8");
  }

  console.log("");
  console.log(`✅ Pull 완료. ${paths.length} 파일 · ${(totalBytes/1024).toFixed(1)} KB`);
  console.log(`   Inbox: ${inboxDir}`);
  console.log(`   메타:  ${path.join(inboxDir, "meta.json")}`);
  console.log(`   초안:  ${reportDraft}  (← §0 + ${sections.length}개 섹션 작성)`);
  process.exit(0);
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});

// 템플릿에서 selected 에 포함되지 않은 §1~§9 섹션을 제거.
// 동작:
//   1) footer (면책문 "*본 보고서는...") 를 떼어내 마지막에 다시 붙임
//   2) 본문을 "## N. " 헤더 단위로 chunk 분리 — §0 항상 유지, §1~§9 는 selected 만
//   3) 첫 chunk (제목/메타) 는 항상 유지
function filterTemplateBySections(text, sections) {
  const keep = new Set(sections.map(String));
  // 1) footer 분리
  const footerMatch = text.match(/\n?(\*본 보고서는[\s\S]*)$/m);
  let footer = "";
  let body = text;
  if (footerMatch) {
    footer = footerMatch[1].trim();
    body = text.slice(0, footerMatch.index);
  }
  // 2) chunk split — "## N. " 헤더가 줄 시작에 있는 위치를 모두 찾기
  const headerRe = /(^|\n)##\s+(\d+)\.\s+[^\n]*/g;
  const chunks = [];
  let m;
  while ((m = headerRe.exec(body)) !== null) {
    const start = m.index + (m[1] ? 1 : 0);
    if (chunks.length > 0) chunks[chunks.length - 1].end = start;
    chunks.push({ start, n: m[2], end: body.length });
  }
  if (chunks.length === 0) return text;
  // 첫 chunk 이전 (제목/메타/요약 등) 은 prefix
  const prefix = body.slice(0, chunks[0].start).replace(/\s+$/, "");
  // 3) 유지: §0 또는 keep 에 포함된 §N
  const kept = chunks
    .filter((c) => c.n === "0" || keep.has(c.n))
    .map((c) => body.slice(c.start, c.end).replace(/\s+$/, ""));
  const joined = prefix + "\n\n" + kept.join("\n\n---\n\n");
  const tail = footer ? "\n\n---\n\n" + footer + "\n" : "\n";
  let out = (joined + tail).replace(/\n{3,}/g, "\n\n");
  // 연속된 --- 구분선 중복 제거
  out = out.replace(/(?:^|\n)---\s*\n+\s*---(?=\n)/g, "\n---");
  return out;
}
